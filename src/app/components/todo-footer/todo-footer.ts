import { Component, input, output } from '@angular/core';
import { TaskFilter } from '../../models/filter.type';

@Component({
  selector: 'app-todo-footer',
  standalone: true,
  template: `
    <footer class="todo-footer">
      <span class="active-count" data-testid="active-count" aria-live="polite">
        {{ activeCount() }} {{ activeCount() === 1 ? 'item' : 'items' }} left
      </span>
      <div class="filter-group" role="group" aria-label="Filter tasks">
        <button
          class="filter-btn"
          [class.active]="currentFilter() === 'all'"
          [attr.aria-pressed]="currentFilter() === 'all'"
          data-testid="filter-all"
          (click)="filterChange.emit('all')"
        >All</button>
        <button
          class="filter-btn"
          [class.active]="currentFilter() === 'active'"
          [attr.aria-pressed]="currentFilter() === 'active'"
          data-testid="filter-active"
          (click)="filterChange.emit('active')"
        >Active</button>
        <button
          class="filter-btn"
          [class.active]="currentFilter() === 'completed'"
          [attr.aria-pressed]="currentFilter() === 'completed'"
          data-testid="filter-completed"
          (click)="filterChange.emit('completed')"
        >Completed</button>
      </div>
      @if (hasCompleted()) {
        <button
          class="clear-btn"
          data-testid="clear-completed"
          (click)="clearCompleted.emit()"
        >Clear completed</button>
      }
    </footer>
  `,
  styles: [`
    .todo-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-top: 1px solid #e6e6e6;
      font-size: 0.875rem;
      color: #777;
      gap: 0.5rem;
    }

    .active-count {
      white-space: nowrap;
    }

    .filter-group {
      display: flex;
      gap: 2px;
      border: 1px solid #e6e6e6;
      border-radius: 6px;
      overflow: hidden;
    }

    .filter-btn {
      background: none;
      border: none;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #777;
      transition: all 0.2s ease;
      min-height: 44px;
      min-width: 44px;
    }

    .filter-btn:hover {
      background: #f5f5f5;
    }

    .filter-btn.active {
      background: #5dc2af;
      color: white;
    }

    .filter-btn:focus-visible {
      outline: 2px solid #4d90fe;
      outline-offset: -2px;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #777;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.375rem 0.5rem;
      min-height: 44px;
      white-space: nowrap;
      transition: color 0.2s ease;
    }

    .clear-btn:hover {
      color: #333;
    }

    .clear-btn:focus-visible {
      outline: 2px solid #4d90fe;
      outline-offset: 2px;
    }

    @media (max-width: 479px) {
      .todo-footer {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .filter-group {
        justify-content: stretch;
      }

      .filter-btn {
        flex: 1;
      }
    }
  `]
})
export class TodoFooter {
  activeCount = input.required<number>();
  currentFilter = input.required<TaskFilter>();
  hasCompleted = input.required<boolean>();
  filterChange = output<TaskFilter>();
  clearCompleted = output<void>();
}
