import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { StorageAdapter } from '../../core/storage-adapter.service';
import { AnalyticsService } from '../../core/analytics.service';
import { Todo, TodoStore, isTodoStore } from './todo.model';

export const ID_GENERATOR = new InjectionToken<() => string>('IdGenerator', {
  providedIn: 'root',
  factory: () => () => crypto.randomUUID(),
});

const STORAGE_KEY = 'todos_app_data';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly storage = inject(StorageAdapter);
  private readonly analytics = inject(AnalyticsService);
  private readonly idGenerator = inject(ID_GENERATOR);

  private readonly _todos = signal<Todo[]>(this.loadTodos());
  private readonly _hasEverHadTodos = signal(false);
  private readonly _lastWriteSuccess = signal(true);

  readonly todos = this._todos.asReadonly();
  readonly activeCount = computed(() => this._todos().filter(t => !t.completed).length);
  readonly hasEverHadTodos = this._hasEverHadTodos.asReadonly();
  readonly lastWriteSuccess = this._lastWriteSuccess.asReadonly();
  private readonly _lastDeleted = signal<Todo | null>(null);
  readonly lastDeleted = this._lastDeleted.asReadonly();

  constructor() {
    if (this._todos().length > 0) {
      this._hasEverHadTodos.set(true);
    }
  }

  add(title: string): void {
    const trimmed = title.trim().substring(0, 250);
    if (!trimmed) return;

    const todo: Todo = {
      id: this.idGenerator(),
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this._todos.update(prev => [todo, ...prev]);
    this._hasEverHadTodos.set(true);
    this.persist();
    this.analytics.track('todo_created', { title: trimmed, timestamp: todo.createdAt });
  }

  toggle(id: string): void {
    this._todos.update(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    this.persist();
    const toggled = this._todos().find(t => t.id === id);
    if (toggled) {
      this.analytics.track('todo_toggled', { id, completed: toggled.completed });
    }
  }

  remove(id: string): void {
    const removed = this._todos().find(t => t.id === id);
    if (removed) {
      this._lastDeleted.set(removed);
    }
    this._todos.update(prev => prev.filter(t => t.id !== id));
    this.persist();
    this.analytics.track('todo_deleted', { id });
  }

  private persist(): void {
    const store: TodoStore = { version: 1, todos: this._todos() };
    const success = this.storage.write(STORAGE_KEY, store);
    this._lastWriteSuccess.set(success);
  }

  private loadTodos(): Todo[] {
    const data = this.storage.read<unknown>(STORAGE_KEY);
    if (data === null) return [];

    if (isTodoStore(data) && data.version === 1) {
      return data.todos;
    }

    // Corrupted or unknown version
    this.analytics.track('storage_corrupted', {
      key: STORAGE_KEY,
      error: 'Invalid or unknown storage schema',
    });
    return [];
  }
}
