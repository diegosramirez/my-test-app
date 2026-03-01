import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const STORAGE_KEY = 'todo-items';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <h1>To-Do List</h1>

      <div class="todo-input-row">
        <input
          type="text"
          [(ngModel)]="newTask"
          placeholder="Enter a new task..."
          (keyup.enter)="addTask()"
          aria-label="New task input"
        />
        <button (click)="addTask()" type="button">Add</button>
      </div>

      <ul class="todo-list" *ngIf="tasks.length > 0; else emptyState">
        <li *ngFor="let task of tasks; let i = index" class="todo-item">
          <span class="todo-text">{{ task }}</span>
          <button
            (click)="deleteTask(i)"
            type="button"
            class="delete-btn"
            [attr.aria-label]="'Delete task: ' + task"
          >
            Delete
          </button>
        </li>
      </ul>

      <ng-template #emptyState>
        <p class="empty-state">No tasks yet. Add one above!</p>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .todo-container {
        max-width: 480px;
        margin: 2rem auto;
        font-family: sans-serif;
      }

      .todo-input-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .todo-input-row input {
        flex: 1;
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .todo-input-row button {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        background-color: #1976d2;
        color: #fff;
      }

      .todo-input-row button:hover {
        background-color: #1565c0;
      }

      .todo-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .todo-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #eee;
      }

      .todo-item:last-child {
        border-bottom: none;
      }

      .todo-text {
        flex: 1;
        word-break: break-word;
      }

      .delete-btn {
        margin-left: 1rem;
        padding: 0.25rem 0.75rem;
        font-size: 0.875rem;
        cursor: pointer;
        border: 1px solid #e53935;
        border-radius: 4px;
        background-color: transparent;
        color: #e53935;
        flex-shrink: 0;
      }

      .delete-btn:hover {
        background-color: #e53935;
        color: #fff;
      }

      .empty-state {
        color: #888;
        font-style: italic;
      }
    `,
  ],
})
export class TodoComponent implements OnInit {
  tasks: string[] = [];
  newTask = '';

  ngOnInit(): void {
    this.tasks = this.loadFromStorage();
  }

  addTask(): void {
    const trimmed = this.newTask.trim();
    if (!trimmed) {
      return;
    }
    this.tasks = [...this.tasks, trimmed];
    this.newTask = '';
    this.saveToStorage(this.tasks);
  }

  deleteTask(index: number): void {
    if (index < 0 || index >= this.tasks.length) {
      return;
    }
    this.tasks = this.tasks.filter((_, i) => i !== index);
    this.saveToStorage(this.tasks);
  }

  private loadFromStorage(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Ensure every element is a non-empty string; silently drop corrupt entries.
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      // Corrupted JSON or storage unavailable — start fresh.
      return [];
    }
  }

  private saveToStorage(tasks: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage quota exceeded or unavailable — fail silently.
      console.warn('TodoComponent: unable to persist tasks to localStorage.');
    }
  }
}
