import { Component, input, output } from '@angular/core';
import { Task } from '../../models/task.model';
import { TaskItem } from '../task-item/task-item';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [TaskItem],
  template: `
    <ul class="task-list">
      @for (task of tasks(); track task.id) {
        <app-task-item
          [task]="task"
          (toggle)="toggle.emit($event)"
          (delete)="delete.emit($event)"
        />
      }
    </ul>
    @if (tasks().length === 0 && emptyMessage()) {
      <p class="empty-message" data-testid="empty-message">{{ emptyMessage() }}</p>
    }
  `,
  styles: [`
    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .empty-message {
      text-align: center;
      color: #999;
      padding: 2rem 1rem;
      font-style: italic;
      margin: 0;
    }
  `]
})
export class TaskList {
  tasks = input.required<Task[]>();
  emptyMessage = input<string>('');
  toggle = output<number>();
  delete = output<number>();
}
