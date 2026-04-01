import { Component, input, output } from '@angular/core';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  template: `
    <li class="task-item" [class.completed]="task().completed" [attr.data-testid]="'task-item-' + task().id">
      <label class="task-label">
        <input
          type="checkbox"
          [checked]="task().completed"
          (change)="toggle.emit(task().id)"
          [attr.data-testid]="'task-checkbox-' + task().id"
          class="task-checkbox"
        />
        <span class="checkmark"></span>
        <span class="task-title">{{ task().title }}</span>
      </label>
      <button
        class="delete-btn"
        (click)="delete.emit(task().id)"
        [attr.aria-label]="'Delete task: ' + task().title"
        [attr.data-testid]="'delete-button-' + task().id"
      >&times;</button>
    </li>
  `,
  styles: [`
    :host {
      display: block;
    }

    .task-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e6e6e6;
      list-style: none;
    }

    .task-label {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      cursor: pointer;
      min-height: 44px;
    }

    .task-checkbox {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .checkmark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      min-width: 28px;
      border: 2px solid #d9d9d9;
      border-radius: 50%;
      margin-right: 0.75rem;
      transition: all 0.2s ease;
    }

    .task-checkbox:checked + .checkmark {
      border-color: #5dc2af;
      background: #5dc2af;
    }

    .task-checkbox:checked + .checkmark::after {
      content: '\\2713';
      color: white;
      font-size: 14px;
    }

    .task-checkbox:focus-visible + .checkmark {
      outline: 2px solid #4d90fe;
      outline-offset: 2px;
    }

    .task-title {
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .completed .task-title {
      text-decoration: line-through;
      opacity: 0.5;
    }

    .delete-btn {
      display: none;
      background: none;
      border: none;
      color: #cc9a9a;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      margin-left: auto;
      min-width: 44px;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.2s ease;
    }

    .delete-btn:hover {
      color: #af5b5e;
    }

    .delete-btn:focus-visible {
      outline: 2px solid #4d90fe;
      outline-offset: 2px;
    }

    .task-item:hover .delete-btn {
      display: inline-flex;
    }

    @media (hover: none) {
      .delete-btn {
        display: inline-flex;
        color: #d9d9d9;
      }
    }
  `]
})
export class TaskItem {
  task = input.required<Task>();
  toggle = output<number>();
  delete = output<number>();
}
