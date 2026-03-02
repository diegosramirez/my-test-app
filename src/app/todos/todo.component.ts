import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TodoItem {
  id: number;
  description: string;
  completed: boolean;
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <h1>To-Do List</h1>

      <form class="todo-form" (ngSubmit)="addTodo()">
        <input
          type="text"
          class="todo-input"
          [(ngModel)]="newTaskDescription"
          name="newTaskDescription"
          placeholder="Enter a new task..."
          aria-label="New task description"
        />
        <button
          type="submit"
          class="todo-add-btn"
          [disabled]="!newTaskDescription.trim()"
        >
          Add
        </button>
      </form>

      <ul class="todo-list" *ngIf="todos.length > 0; else emptyState">
        <li
          *ngFor="let todo of todos"
          class="todo-item"
          [class.todo-item--completed]="todo.completed"
        >
          <label class="todo-label">
            <input
              type="checkbox"
              class="todo-checkbox"
              [checked]="todo.completed"
              (change)="toggleTodo(todo)"
              [attr.aria-label]="'Mark &quot;' + todo.description + '&quot; as ' + (todo.completed ? 'incomplete' : 'complete')"
            />
            <span class="todo-description">{{ todo.description }}</span>
          </label>
        </li>
      </ul>

      <ng-template #emptyState>
        <p class="todo-empty">No tasks yet. Add one above!</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .todo-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: sans-serif;
    }

    h1 {
      margin-bottom: 1.5rem;
      font-size: 1.75rem;
    }

    .todo-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .todo-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .todo-input:focus {
      outline: none;
      border-color: #4a90e2;
      box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.25);
    }

    .todo-add-btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      background-color: #4a90e2;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .todo-add-btn:hover:not(:disabled) {
      background-color: #357abd;
    }

    .todo-add-btn:disabled {
      background-color: #a0c4f1;
      cursor: not-allowed;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .todo-item {
      padding: 0.6rem 0.25rem;
      border-bottom: 1px solid #eee;
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .todo-checkbox {
      width: 1.1rem;
      height: 1.1rem;
      cursor: pointer;
      flex-shrink: 0;
    }

    .todo-description {
      font-size: 1rem;
      transition: color 0.2s ease;
    }

    .todo-item--completed .todo-description {
      text-decoration: line-through;
      color: #999;
    }

    .todo-empty {
      color: #888;
      font-style: italic;
    }
  `]
})
export class TodoComponent {
  newTaskDescription = '';
  private nextId = 1;
  todos: TodoItem[] = [];

  addTodo(): void {
    const trimmed = this.newTaskDescription.trim();
    if (!trimmed) {
      return;
    }

    this.todos.push({
      id: this.nextId++,
      description: trimmed,
      completed: false
    });

    this.newTaskDescription = '';
  }

  toggleTodo(todo: TodoItem): void {
    todo.completed = !todo.completed;
  }
}
