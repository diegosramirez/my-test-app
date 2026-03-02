import { Injectable, signal, computed } from '@angular/core';

export interface TodoItem {
  id: number;
  description: string;
  completed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private nextId = 1;
  private _todos = signal<TodoItem[]>([]);

  readonly todos = this._todos.asReadonly();

  readonly completedCount = computed(
    () => this._todos().filter((t) => t.completed).length
  );

  readonly pendingCount = computed(
    () => this._todos().filter((t) => !t.completed).length
  );

  addTodo(description: string): void {
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }

    const newItem: TodoItem = {
      id: this.nextId++,
      description: trimmed,
      completed: false,
    };

    this._todos.update((current) => [...current, newItem]);
  }

  toggleTodo(id: number): void {
    this._todos.update((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  removeTodo(id: number): void {
    this._todos.update((current) => current.filter((todo) => todo.id !== id));
  }

  clearCompleted(): void {
    this._todos.update((current) => current.filter((todo) => !todo.completed));
  }
}
