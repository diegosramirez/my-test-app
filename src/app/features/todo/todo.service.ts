import { Injectable, signal, computed } from '@angular/core';
import { Todo, TodoFilter, TodoStorageSchema, TodoTrackingEvent } from './todo.model';

const STORAGE_KEY = 'todos_app_data';
const CURRENT_VERSION = 1;
const UNDO_TIMEOUT_MS = 4000;

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly todosSignal = signal<Todo[]>(this.loadFromStorage());
  private readonly filterSignal = signal<TodoFilter>('all');
  private readonly storageAvailableSignal = signal<boolean>(this.checkStorageAvailable());

  /** Undo state — only one pending delete at a time */
  private pendingDelete: { todos: Todo[]; indices: number[]; timeoutId: ReturnType<typeof setTimeout> } | null = null;
  private readonly showUndoSignal = signal<boolean>(false);
  private readonly undoMessageSignal = signal<string>('');

  /** Track newly added todo id for highlight animation */
  private readonly newTodoIdSignal = signal<string | null>(null);

  readonly todos = this.todosSignal.asReadonly();
  readonly filter = this.filterSignal.asReadonly();
  readonly storageAvailable = this.storageAvailableSignal.asReadonly();
  readonly showUndo = this.showUndoSignal.asReadonly();
  readonly undoMessage = this.undoMessageSignal.asReadonly();
  readonly newTodoId = this.newTodoIdSignal.asReadonly();

  readonly filteredTodos = computed(() => {
    const todos = this.todosSignal();
    const filter = this.filterSignal();
    switch (filter) {
      case 'active': return todos.filter(t => !t.completed);
      case 'completed': return todos.filter(t => t.completed);
      default: return todos;
    }
  });

  readonly stats = computed(() => {
    const todos = this.todosSignal();
    const completed = todos.filter(t => t.completed).length;
    return {
      total: todos.length,
      completed,
      active: todos.length - completed,
      storageSizeBytes: new Blob([JSON.stringify(todos)]).size,
    };
  });

  addTodo(title: string): void {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 250) return;

    const todo: Todo = {
      // crypto.randomUUID() requires secure context (HTTPS or localhost)
      id: crypto.randomUUID(),
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.todosSignal.update(todos => [todo, ...todos]);

    // Auto-switch filter to 'all' if on 'completed' so new item is visible
    if (this.filterSignal() === 'completed') {
      this.filterSignal.set('all');
    }

    this.newTodoIdSignal.set(todo.id);
    setTimeout(() => {
      if (this.newTodoIdSignal() === todo.id) {
        this.newTodoIdSignal.set(null);
      }
    }, 700);

    this.persist();
    this.track('todo_added', { title: trimmed, timestamp: todo.createdAt });
  }

  toggleTodo(id: string): void {
    this.todosSignal.update(todos =>
      todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
    this.persist();
    const todo = this.todosSignal().find(t => t.id === id);
    if (todo?.completed) {
      this.track('todo_completed', { todoId: id, title: todo.title });
    }
  }

  deleteTodo(id: string): void {
    // Finalize any pending delete immediately
    this.finalizePendingDelete();

    const todos = this.todosSignal();
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return;

    const deletedTodo = todos[index];
    this.todosSignal.update(t => t.filter(todo => todo.id !== id));

    this.showUndoSignal.set(true);
    this.undoMessageSignal.set('Task deleted.');

    const timeoutId = setTimeout(() => {
      this.finalizeDelete([deletedTodo], [id]);
    }, UNDO_TIMEOUT_MS);

    this.pendingDelete = { todos: [deletedTodo], indices: [index], timeoutId };
  }

  clearCompleted(): void {
    // Finalize any pending delete immediately
    this.finalizePendingDelete();

    const todos = this.todosSignal();
    const completedTodos: Todo[] = [];
    const indices: number[] = [];
    todos.forEach((t, i) => {
      if (t.completed) {
        completedTodos.push(t);
        indices.push(i);
      }
    });

    if (completedTodos.length === 0) return;

    this.todosSignal.update(t => t.filter(todo => !todo.completed));

    this.showUndoSignal.set(true);
    this.undoMessageSignal.set(`${completedTodos.length} task${completedTodos.length > 1 ? 's' : ''} cleared.`);

    const todoIds = completedTodos.map(t => t.id);
    const timeoutId = setTimeout(() => {
      this.finalizeDelete(completedTodos, todoIds);
    }, UNDO_TIMEOUT_MS);

    this.pendingDelete = { todos: completedTodos, indices, timeoutId };
  }

  undoDelete(): void {
    if (!this.pendingDelete) return;

    const { todos: deletedTodos, indices, timeoutId } = this.pendingDelete;
    clearTimeout(timeoutId);

    this.todosSignal.update(currentTodos => {
      const result = [...currentTodos];
      // Re-insert each deleted todo at its original index
      for (let i = 0; i < deletedTodos.length; i++) {
        const insertAt = Math.min(indices[i], result.length);
        result.splice(insertAt, 0, deletedTodos[i]);
      }
      return result;
    });

    this.pendingDelete = null;
    this.showUndoSignal.set(false);
    this.persist();
  }

  setFilter(filter: TodoFilter): void {
    this.filterSignal.set(filter);
    this.track('todo_filter_changed', { filterValue: filter });
  }

  private finalizePendingDelete(): void {
    if (!this.pendingDelete) return;
    const { todos: deletedTodos, timeoutId } = this.pendingDelete;
    clearTimeout(timeoutId);
    this.finalizeDelete(deletedTodos, deletedTodos.map(t => t.id));
  }

  private finalizeDelete(deletedTodos: Todo[], _ids: string[]): void {
    this.persist();
    for (const todo of deletedTodos) {
      this.track('todo_deleted', { todoId: todo.id, title: todo.title });
    }
    this.pendingDelete = null;
    this.showUndoSignal.set(false);
  }

  private persist(): void {
    try {
      const schema: TodoStorageSchema = {
        version: CURRENT_VERSION,
        todos: this.todosSignal(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
      this.storageAvailableSignal.set(true);
    } catch (e) {
      console.error('Failed to persist todos to localStorage:', e);
      this.storageAvailableSignal.set(false);
    }
  }

  private loadFromStorage(): Todo[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);

      // Handle both raw array (legacy) and versioned schema
      if (Array.isArray(parsed)) return this.validateTodos(parsed);
      if (parsed?.version === CURRENT_VERSION && Array.isArray(parsed.todos)) {
        return this.validateTodos(parsed.todos);
      }
      console.warn('Unrecognized todo storage schema, falling back to empty list.');
      return [];
    } catch (e) {
      console.warn('Failed to load todos from localStorage, falling back to empty list:', e);
      return [];
    }
  }

  private validateTodos(data: unknown[]): Todo[] {
    return data.filter((item): item is Todo => {
      if (typeof item !== 'object' || item === null) return false;
      const t = item as Record<string, unknown>;
      return (
        typeof t['id'] === 'string' &&
        typeof t['title'] === 'string' &&
        typeof t['completed'] === 'boolean' &&
        typeof t['createdAt'] === 'string'
      );
    });
  }

  private checkStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private track(eventName: TodoTrackingEvent['eventName'], meta: Record<string, string | number>): void {
    const event: TodoTrackingEvent = {
      eventName,
      meta,
      timestamp: new Date().toISOString(),
    };
    // Stub — replace with real analytics service injection when available
    console.log(`[Track] ${event.eventName}`, event.meta);
  }
}
