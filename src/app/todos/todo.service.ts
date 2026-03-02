import { Injectable, signal, computed } from '@angular/core';
import { TodoItem } from './todo.model';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly _todos = signal<TodoItem[]>([]);

  readonly todos = computed(() => this._todos());

  addTodo(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const newItem: TodoItem = {
      id: this._generateId(),
      title: trimmed,
      completed: false
    };

    this._todos.update(current => [...current, newItem]);
  }

  toggleTodo(id: number): void {
    this._todos.update(current =>
      current.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  deleteTodo(id: number): void {
    this._todos.update(current => current.filter(todo => todo.id !== id));
  }

  private _generateId(): number {
    const todos = this._todos();
    return todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
  }
}
