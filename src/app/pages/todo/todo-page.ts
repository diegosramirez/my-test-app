import { Component, inject, computed } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { TaskInput } from '../../components/task-input/task-input';
import { TaskList } from '../../components/task-list/task-list';
import { TodoFooter } from '../../components/todo-footer/todo-footer';

@Component({
  selector: 'app-todo-page',
  standalone: true,
  imports: [TaskInput, TaskList, TodoFooter],
  template: `
    <div class="todo-container">
      <h1 class="todo-title">todos</h1>
      <div class="todo-card">
        <app-task-input (addTask)="taskService.addTask($event)" />
        @if (taskService.tasks().length > 0) {
          <app-task-list
            [tasks]="taskService.filteredTasks()"
            [emptyMessage]="emptyMessage()"
            (toggle)="taskService.toggleTask($event)"
            (delete)="taskService.deleteTask($event)"
          />
          <app-todo-footer
            [activeCount]="taskService.activeCount()"
            [currentFilter]="taskService.activeFilter()"
            [hasCompleted]="taskService.hasCompleted()"
            (filterChange)="taskService.setFilter($event)"
            (clearCompleted)="taskService.clearCompleted()"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .todo-container {
      max-width: 560px;
      margin: 0 auto;
    }

    .todo-title {
      text-align: center;
      font-size: 4rem;
      font-weight: 200;
      color: rgba(175, 47, 47, 0.15);
      margin: 0 0 1.5rem;
    }

    .todo-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
  `]
})
export class TodoPage {
  protected taskService = inject(TaskService);

  protected emptyMessage = computed(() => {
    const filter = this.taskService.activeFilter();
    switch (filter) {
      case 'active': return 'No active tasks';
      case 'completed': return 'No completed tasks';
      default: return '';
    }
  });
}
