import { Injectable, signal } from '@angular/core';
import { Todo, TodoFilter, TodoState } from '../models/todo.interface';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly STORAGE_KEY = 'my-test-app-todos';
  private readonly STORAGE_VERSION = '1.0';

  private state = signal<TodoState>({
    todos: [],
    filter: 'all'
  });

  private isLocalStorageAvailable = true;
  private errorNotified = false;

  constructor() {
    this.initializeState();
    this.setupStorageEventListener();
  }

  // Public getters
  get todos() {
    return this.state().todos;
  }

  get filter() {
    return this.state().filter;
  }

  get filteredTodos() {
    const todos = this.todos;
    const filter = this.filter;

    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }

  // CRUD operations
  addTodo(text: string): Todo {
    if (!text || text.length === 0 || text.length > 100) {
      throw new Error('Task text must be between 1-100 characters');
    }

    const newTodo: Todo = {
      id: this.generateId(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    };

    const currentState = this.state();
    const updatedTodos = [...currentState.todos, newTodo];

    this.updateState({
      ...currentState,
      todos: updatedTodos
    });

    this.trackEvent('todo_task_added', {
      task_id: newTodo.id,
      input_method: 'manual'
    });

    return newTodo;
  }

  toggleTodo(id: string): void {
    const currentState = this.state();
    const todoIndex = currentState.todos.findIndex(todo => todo.id === id);

    if (todoIndex === -1) {
      return;
    }

    const updatedTodos = [...currentState.todos];
    updatedTodos[todoIndex] = {
      ...updatedTodos[todoIndex],
      completed: !updatedTodos[todoIndex].completed
    };

    this.updateState({
      ...currentState,
      todos: updatedTodos
    });

    this.trackEvent('todo_task_toggled', {
      task_id: id,
      new_state: updatedTodos[todoIndex].completed ? 'completed' : 'active'
    });
  }

  deleteTodo(id: string): void {
    const currentState = this.state();
    const todoToDelete = currentState.todos.find(todo => todo.id === id);

    if (!todoToDelete) {
      return;
    }

    const updatedTodos = currentState.todos.filter(todo => todo.id !== id);

    this.updateState({
      ...currentState,
      todos: updatedTodos
    });

    this.trackEvent('todo_task_deleted', {
      task_id: id,
      completion_status: todoToDelete.completed ? 'completed' : 'active'
    });
  }

  setFilter(filter: TodoFilter): void {
    const currentState = this.state();
    const previousFilter = currentState.filter;

    this.updateState({
      ...currentState,
      filter
    });

    this.trackEvent('todo_filter_changed', {
      previous_filter: previousFilter,
      new_filter: filter
    });
  }

  clearCompleted(): void {
    const currentState = this.state();
    const updatedTodos = currentState.todos.filter(todo => !todo.completed);

    this.updateState({
      ...currentState,
      todos: updatedTodos
    });
  }

  // Utility methods for performance tracking
  trackByTodoId(index: number, todo: Todo): string {
    return todo.id;
  }

  // Private methods
  private initializeState(): void {
    try {
      const storedData = this.loadFromStorage();
      if (storedData) {
        this.state.set(storedData);
        this.trackEvent('todo_component_loaded', {
          task_count: storedData.todos.length,
          filter_state: storedData.filter
        });
      } else {
        this.trackEvent('todo_component_loaded', {
          task_count: 0,
          filter_state: 'all'
        });
      }
    } catch (error) {
      this.handleStorageError('load', error);
      this.trackEvent('todo_component_loaded', {
        task_count: 0,
        filter_state: 'all'
      });
    }
  }

  private updateState(newState: TodoState): void {
    this.state.set(newState);
    this.saveToStorage(newState);
  }

  private saveToStorage(state: TodoState): void {
    if (!this.isLocalStorageAvailable) {
      return;
    }

    try {
      const dataToStore = {
        version: this.STORAGE_VERSION,
        timestamp: Date.now(),
        state: {
          ...state,
          todos: state.todos.map(todo => ({
            ...todo,
            createdAt: todo.createdAt.toISOString()
          }))
        }
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      this.handleStorageError('save', error);
    }
  }

  private loadFromStorage(): TodoState | null {
    if (!this.isLocalStorageAvailable) {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // Validate structure
      if (!this.isValidStorageData(parsed)) {
        this.clearCorruptedData();
        return null;
      }

      // Convert date strings back to Date objects
      const state = parsed.state;
      state.todos = state.todos.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));

      return state;
    } catch (error) {
      this.handleStorageError('load', error);
      this.clearCorruptedData();
      return null;
    }
  }

  private isValidStorageData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.state || !Array.isArray(data.state.todos)) {
      return false;
    }

    // Validate each todo item
    return data.state.todos.every((todo: any) =>
      todo.id &&
      typeof todo.text === 'string' &&
      typeof todo.completed === 'boolean' &&
      todo.createdAt
    );
  }

  private clearCorruptedData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      // Silent fail for corrupted data cleanup
    }
  }

  private handleStorageError(operation: 'save' | 'load', error: any): void {
    this.isLocalStorageAvailable = false;

    if (!this.errorNotified) {
      this.errorNotified = true;
      console.warn(`Todo app: localStorage ${operation} failed, using in-memory storage`);

      this.trackEvent('todo_storage_error', {
        error_type: operation + '_failed',
        fallback_used: true
      });

      // Show user-friendly notification
      this.showStorageErrorNotification();
    }
  }

  private showStorageErrorNotification(): void {
    // In a real app, you might use a toast service or notification component
    // For now, using console.info for user notification
    console.info('Note: Your todos will not be saved between browser sessions due to storage limitations.');
  }

  private setupStorageEventListener(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (this.isValidStorageData(parsed)) {
            const state = parsed.state;
            state.todos = state.todos.map((todo: any) => ({
              ...todo,
              createdAt: new Date(todo.createdAt)
            }));
            this.state.set(state);
          }
        } catch (error) {
          // Silent fail for cross-tab sync
        }
      }
    });
  }

  private generateId(): string {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackEvent(eventName: string, properties: Record<string, any>): void {
    // In a real application, you would integrate with analytics service
    console.debug(`Analytics: ${eventName}`, properties);
  }
}