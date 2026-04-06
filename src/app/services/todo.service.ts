import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Todo, TodoFilter, TodoState, StorageOperationResult } from '../models/todo.model';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly STORAGE_KEY = 'todos';
  private readonly FILTER_KEY = 'todoFilter';
  private readonly MAX_TEXT_LENGTH = 500;

  private todosSubject = new BehaviorSubject<Todo[]>([]);
  private filterSubject = new BehaviorSubject<TodoFilter>('all');
  private storageAvailable = true;
  private inMemoryFallback = false;

  public todos$ = this.todosSubject.asObservable();
  public filter$ = this.filterSubject.asObservable();

  // Expose current values for testing
  get currentTodos(): Todo[] {
    return this.todosSubject.value;
  }

  get currentFilter(): TodoFilter {
    return this.filterSubject.value;
  }

  constructor() {
    this.checkStorageAvailability();
    this.loadInitialData();
  }

  private checkStorageAvailability(): void {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storageAvailable = true;
    } catch (error) {
      this.storageAvailable = false;
      this.inMemoryFallback = true;
      console.warn('localStorage not available, using in-memory storage');
    }
  }

  private loadInitialData(): void {
    const loadStart = performance.now();

    try {
      // Load todos
      const todos = this.loadTodosFromStorage();
      this.todosSubject.next(todos);

      // Load filter
      const filter = this.loadFilterFromStorage();
      this.filterSubject.next(filter);

      const loadTime = performance.now() - loadStart;
      this.trackEvent('todo_component_loaded', {
        todos_count: todos.length,
        filter_state: filter,
        load_time_ms: Math.round(loadTime)
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.trackEvent('storage_error', {
        error_type: 'load_initial_data',
        fallback_triggered: true
      });
    }
  }

  private loadTodosFromStorage(): Todo[] {
    if (!this.storageAvailable) {
      return [];
    }

    try {
      const storedTodos = localStorage.getItem(this.STORAGE_KEY);
      if (!storedTodos) {
        return [];
      }

      const parsed = JSON.parse(storedTodos);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid todos format');
      }

      return parsed.map(todo => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));
    } catch (error) {
      console.error('Error loading todos from storage:', error);
      this.trackEvent('storage_error', {
        error_type: 'load_todos',
        fallback_triggered: true
      });
      return [];
    }
  }

  private loadFilterFromStorage(): TodoFilter {
    if (!this.storageAvailable) {
      return 'all';
    }

    try {
      const storedFilter = localStorage.getItem(this.FILTER_KEY);
      if (storedFilter && ['all', 'active', 'completed'].includes(storedFilter)) {
        return storedFilter as TodoFilter;
      }
      return 'all';
    } catch (error) {
      console.error('Error loading filter from storage:', error);
      return 'all';
    }
  }

  private saveTodosToStorage(todos: Todo[]): StorageOperationResult {
    if (!this.storageAvailable) {
      return { success: false, error: 'Storage not available' };
    }

    try {
      const serialized = JSON.stringify(todos);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      return { success: true };
    } catch (error) {
      console.error('Error saving todos to storage:', error);
      this.trackEvent('storage_error', {
        error_type: 'save_todos',
        fallback_triggered: true
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private saveFilterToStorage(filter: TodoFilter): StorageOperationResult {
    if (!this.storageAvailable) {
      return { success: false, error: 'Storage not available' };
    }

    try {
      localStorage.setItem(this.FILTER_KEY, filter);
      return { success: true };
    } catch (error) {
      console.error('Error saving filter to storage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  addTodo(text: string): boolean {
    const trimmedText = text.trim();

    // Validation
    if (!this.validateTodoText(trimmedText)) {
      return false;
    }

    const newTodo: Todo = {
      id: this.generateId(),
      text: trimmedText,
      completed: false,
      createdAt: new Date()
    };

    const currentTodos = this.todosSubject.value;
    const updatedTodos = [...currentTodos, newTodo];

    // Optimistic update
    this.todosSubject.next(updatedTodos);

    // Try to save to storage
    const saveResult = this.saveTodosToStorage(updatedTodos);
    if (!saveResult.success) {
      // Rollback on failure
      this.todosSubject.next(currentTodos);
      return false;
    }

    this.trackEvent('todo_added', {
      todo_text_length: trimmedText.length,
      validation_triggered: false
    });

    return true;
  }

  toggleTodo(id: string): boolean {
    const currentTodos = this.todosSubject.value;
    const todoIndex = currentTodos.findIndex(todo => todo.id === id);

    if (todoIndex === -1) {
      return false;
    }

    const updatedTodos = [...currentTodos];
    updatedTodos[todoIndex] = {
      ...updatedTodos[todoIndex],
      completed: !updatedTodos[todoIndex].completed
    };

    // Optimistic update
    this.todosSubject.next(updatedTodos);

    // Try to save to storage
    const saveResult = this.saveTodosToStorage(updatedTodos);
    if (!saveResult.success) {
      // Rollback on failure
      this.todosSubject.next(currentTodos);
      return false;
    }

    this.trackEvent('todo_toggled', {
      completion_status: updatedTodos[todoIndex].completed,
      todo_id: id
    });

    return true;
  }

  deleteTodo(id: string): boolean {
    const currentTodos = this.todosSubject.value;
    const todoIndex = currentTodos.findIndex(todo => todo.id === id);

    if (todoIndex === -1) {
      return false;
    }

    const updatedTodos = currentTodos.filter(todo => todo.id !== id);

    // Optimistic update
    this.todosSubject.next(updatedTodos);

    // Try to save to storage
    const saveResult = this.saveTodosToStorage(updatedTodos);
    if (!saveResult.success) {
      // Rollback on failure
      this.todosSubject.next(currentTodos);
      return false;
    }

    this.trackEvent('todo_deleted', {
      todo_id: id,
      confirmation_shown: false
    });

    return true;
  }

  setFilter(filter: TodoFilter): void {
    const currentFilter = this.filterSubject.value;
    this.filterSubject.next(filter);

    const saveResult = this.saveFilterToStorage(filter);
    if (!saveResult.success) {
      // Rollback on failure
      this.filterSubject.next(currentFilter);
      return;
    }

    const visibleCount = this.getFilteredTodos(this.todosSubject.value, filter).length;
    this.trackEvent('filter_changed', {
      filter_type: filter,
      todos_visible_count: visibleCount
    });
  }

  getFilteredTodos(todos: Todo[], filter: TodoFilter): Todo[] {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  validateTodoText(text: string): boolean {
    const trimmedText = text.trim();

    if (!trimmedText) {
      this.trackEvent('input_validation_triggered', {
        validation_type: 'empty_text',
        character_count: text.length
      });
      return false;
    }

    if (trimmedText.length > this.MAX_TEXT_LENGTH) {
      this.trackEvent('input_validation_triggered', {
        validation_type: 'text_too_long',
        character_count: text.length
      });
      return false;
    }

    return true;
  }

  getCharacterLimit(): number {
    return this.MAX_TEXT_LENGTH;
  }

  isStorageAvailable(): boolean {
    return this.storageAvailable;
  }

  isUsingFallback(): boolean {
    return this.inMemoryFallback;
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private trackEvent(eventName: string, properties: Record<string, any>): void {
    // In a real application, this would send to analytics service
    console.log(`[Analytics] ${eventName}:`, properties);
  }
}