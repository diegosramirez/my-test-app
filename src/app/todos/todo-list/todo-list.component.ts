import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <h1>To-Do List</h1>

      <form class="todo-form" (ngSubmit)="addTodo()">
        <input
          #todoInput
          type="text"
          class="todo-input"
          placeholder="What needs to be done?"
          [(ngModel)]="newTodoText"
          name="newTodoText"
          aria-label="New to-do item"
          (keydown.enter)="addTodo()"
        />
        <button type="submit" class="btn btn-add">Add</button>
      </form>

      <p class="empty-message" *ngIf="todos().length === 0">
        No to-do items yet. Add one above!
      </p>

      <ul class="todo-list" *ngIf="todos().length > 0">
        <li
          *ngFor="let todo of todos()"
          class="todo-item"
          [class.completed]="todo.completed"
        >
          <input
            type="checkbox"
            class="todo-checkbox"
            [id]="'todo-' + todo.id"
            [checked]="todo.completed"
            (change)="toggleTodo(todo.id)"
            [attr.aria-label]="'Mark &quot;' + todo.text + '&quot; as ' + (todo.completed ? 'incomplete' : 'complete')"
          />
          <label
            class="todo-text"
            [for]="'todo-' + todo.id"
          >
            {{ todo.text }}
          </label>
          <button
            type="button"
            class="btn btn-delete"
            (click)="deleteTodo(todo.id)"
            [attr.aria-label]="'Delete &quot;' + todo.text + '&quot;'"
          >
            Delete
          </button>
        </li>
      </ul>

      <div class="todo-summary" *ngIf="todos().length > 0">
        <span>{{ remainingCount() }} of {{ todos().length }} remaining</span>
      </div>
    </div>
  `,
  styles: [`
    .todo-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 1.5rem;
      font-family: sans-serif;
    }

    h1 {
      margin-bottom: 1.25rem;
      font-size: 1.75rem;
      color: #333;
    }

    .todo-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .todo-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      outline: none;
      transition: border-color 0.2s;
    }

    .todo-input:focus {
      border-color: #4a90e2;
    }

    .btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-add {
      background-color: #4a90e2;
      color: #fff;
    }

    .btn-add:hover {
      background-color: #357abd;
    }

    .btn-delete {
      background-color: #e25555;
      color: #fff;
      margin-left: auto;
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
    }

    .btn-delete:hover {
      background-color: #c0392b;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.5rem;
      border-bottom: 1px solid #eee;
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-checkbox {
      width: 1.1rem;
      height: 1.1rem;
      cursor: pointer;
      flex-shrink: 0;
    }

    .todo-text {
      flex: 1;
      font-size: 1rem;
      color: #333;
      cursor: pointer;
      word-break: break-word;
    }

    .todo-item.completed .todo-text {
      text-decoration: line-through;
      color: #999;
    }

    .empty-message {
      color: #888;
      font-style: italic;
      text-align: center;
      margin-top: 1rem;
    }

    .todo-summary {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #666;
      text-align: right;
    }
  `]
})
export class TodoListComponent {
  newTodoText = '';
  private nextId = 1;

  todos = signal<TodoItem[]>([]);

  remainingCount = computed(() =>
    this.todos().filter(todo => !todo.completed).length
  );

  addTodo(): void {
    const trimmed = this.newTodoText.trim();

    if (!trimmed) {
      // Keep focus on the input; the template binding keeps the value intact
      const inputEl = document.querySelector<HTMLInputElement>('.todo-input');
      inputEl?.focus();
      return;
    }

    this.todos.update(current => [
      ...current,
      { id: this.nextId++, text: trimmed, completed: false }
    ]);

    this.newTodoText = '';

    // Return focus to input for rapid entry
    const inputEl = document.querySelector<HTMLInputElement>('.todo-input');
    inputEl?.focus();
  }

  toggleTodo(id: number): void {
    this.todos.update(current =>
      current.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  deleteTodo(id: number): void {
    this.todos.update(current => current.filter(todo => todo.id !== id));
  }
}
