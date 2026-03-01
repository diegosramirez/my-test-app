import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>To-Do</h1>
      <p>Manage your tasks here.</p>
      <ul class="todo-list">
        <li *ngFor="let item of todos" class="todo-item">
          <span [class.completed]="item.done">{{ item.label }}</span>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 2rem;
      }

      h1 {
        font-size: 1.75rem;
        margin-bottom: 0.5rem;
        color: #1a202c;
      }

      p {
        color: #4a5568;
        margin-bottom: 1.5rem;
      }

      .todo-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .todo-item {
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.95rem;
        color: #2d3748;
      }

      .completed {
        text-decoration: line-through;
        color: #a0aec0;
      }
    `,
  ],
})
export class TodoComponent {
  todos: { label: string; done: boolean }[] = [
    { label: 'Set up Angular project structure', done: true },
    { label: 'Implement side navigation', done: false },
    { label: 'Add routing configuration', done: false },
    { label: 'Write unit tests', done: false },
  ];
}
