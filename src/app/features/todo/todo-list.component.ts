import { Component, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';
import { TodoFilter } from './todo.model';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!todoService.storageAvailable()) {
      <div class="storage-warning" role="alert">
        Your browser storage is full or unavailable. Changes won't be saved.
      </div>
    }

    <div class="todo-container">
      <h1>Todos</h1>

      <form (ngSubmit)="addTodo()" class="todo-input-row">
        <input
          #todoInput
          type="text"
          [(ngModel)]="newTodoTitle"
          name="newTodo"
          placeholder="What needs to be done?"
          autocomplete="off"
          maxlength="250"
          aria-label="New todo title"
        />
        <button type="submit" class="add-btn">Add</button>
      </form>

      <ul class="todo-list" role="list">
        @for (todo of todoService.filteredTodos(); track todo.id) {
          <li
            class="todo-item"
            [class.completed]="todo.completed"
            [class.new-item]="todo.id === todoService.newTodoId()"
            [attr.data-todo-id]="todo.id"
          >
            <input
              type="checkbox"
              [id]="'todo-' + todo.id"
              [checked]="todo.completed"
              (change)="todoService.toggleTodo(todo.id)"
              class="todo-checkbox"
            />
            <label [for]="'todo-' + todo.id" class="todo-title">{{ todo.title }}</label>
            <button
              class="delete-btn"
              [attr.aria-label]="'Delete task: ' + todo.title"
              (click)="onDelete(todo.id)"
            >&times;</button>
          </li>
        } @empty {
          <li class="empty-state">
            @if (todoService.filter() === 'all') {
              No tasks yet. Add one above to get started.
            } @else if (todoService.filter() === 'active') {
              No active tasks.
            } @else {
              No completed tasks.
            }
          </li>
        }
      </ul>

      @if (todoService.showUndo()) {
        <div class="snackbar" role="status" aria-live="polite">
          {{ todoService.undoMessage() }}
          <button class="undo-btn" (click)="todoService.undoDelete()">Undo</button>
        </div>
      }

      <div class="footer">
        <div class="filters" role="radiogroup" aria-label="Filter todos">
          @for (f of filters; track f.value) {
            <button
              role="radio"
              [attr.aria-checked]="todoService.filter() === f.value"
              [class.selected]="todoService.filter() === f.value"
              (click)="todoService.setFilter(f.value)"
              class="filter-btn"
            >{{ f.label }}</button>
          }
        </div>

        <span class="items-left" aria-live="polite">
          {{ todoService.stats().active }} item{{ todoService.stats().active === 1 ? '' : 's' }} left
        </span>

        @if (todoService.stats().completed > 0) {
          <button class="clear-completed-btn" (click)="todoService.clearCompleted()">
            Clear completed
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1rem;
    }

    .storage-warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin: 0 auto 1rem;
      max-width: 600px;
      text-align: center;
      font-size: 0.9rem;
    }

    .todo-container {
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      font-size: 2rem;
      color: #333;
      margin-bottom: 1rem;
    }

    .todo-input-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .todo-input-row input {
      flex: 1;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 2px solid #ddd;
      border-radius: 6px;
      outline: none;
      transition: border-color 150ms ease;
    }

    .todo-input-row input:focus {
      border-color: #4a90d9;
    }

    .add-btn {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: #4a90d9;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      transition: background 150ms ease;
    }

    .add-btn:hover, .add-btn:focus {
      background: #357abd;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0 0 0.5rem;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-bottom: 1px solid #eee;
      transition: opacity 200ms ease, background-color 500ms ease;
      animation: fadeIn 150ms ease;
    }

    .todo-item.completed {
      opacity: 0.5;
    }

    .todo-item.completed .todo-title {
      text-decoration: line-through;
    }

    .todo-item.new-item {
      background-color: #fefcbf;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .todo-checkbox {
      width: 20px;
      height: 20px;
      min-width: 44px;
      min-height: 44px;
      cursor: pointer;
      accent-color: #4a90d9;
    }

    .todo-title {
      flex: 1;
      font-size: 1rem;
      color: #333;
      word-break: break-word;
      cursor: pointer;
      padding: 0.25rem 0;
    }

    .delete-btn {
      background: none;
      border: none;
      color: #ccc;
      font-size: 1.5rem;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 150ms ease, background 150ms ease;
    }

    @media (pointer: fine) {
      .delete-btn {
        opacity: 0;
      }
      .todo-item:hover .delete-btn,
      .todo-item:focus-within .delete-btn,
      .delete-btn:focus {
        opacity: 1;
      }
    }

    @media (pointer: coarse) {
      .delete-btn {
        opacity: 0.5;
      }
    }

    .delete-btn:hover, .delete-btn:focus {
      color: #e53e3e;
      background: #fee;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: #999;
      font-size: 0.95rem;
    }

    .snackbar {
      background: #333;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      animation: fadeIn 150ms ease;
    }

    .undo-btn {
      background: none;
      border: none;
      color: #68d391;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
      min-width: 44px;
      min-height: 44px;
      padding: 0 0.5rem;
    }

    .undo-btn:hover, .undo-btn:focus {
      text-decoration: underline;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-top: 1px solid #eee;
    }

    .filters {
      display: flex;
      gap: 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #ddd;
    }

    .filter-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      border: none;
      background: white;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
      transition: background 150ms ease, color 150ms ease;
    }

    .filter-btn + .filter-btn {
      border-left: 1px solid #ddd;
    }

    .filter-btn.selected {
      background: #4a90d9;
      color: white;
    }

    .filter-btn:hover:not(.selected) {
      background: #f0f0f0;
    }

    .items-left {
      font-size: 0.85rem;
      color: #888;
      margin-left: auto;
    }

    .clear-completed-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      min-height: 44px;
      transition: background 150ms ease;
    }

    .clear-completed-btn:hover, .clear-completed-btn:focus {
      background: #f0f0f0;
    }
  `],
})
export class TodoListComponent {
  protected readonly todoService = inject(TodoService);
  protected newTodoTitle = '';

  @ViewChild('todoInput', { static: true }) todoInputRef!: ElementRef<HTMLInputElement>;

  readonly filters: { label: string; value: TodoFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  addTodo(): void {
    const before = this.todoService.todos().length;
    this.todoService.addTodo(this.newTodoTitle);
    if (this.todoService.todos().length > before) {
      this.newTodoTitle = '';
    }
    this.todoInputRef.nativeElement.focus();
  }

  onDelete(id: string): void {
    // Determine the next item to focus before deleting
    const items = this.todoService.filteredTodos();
    const deletedIndex = items.findIndex(t => t.id === id);

    this.todoService.deleteTodo(id);

    // Focus management: move focus to next todo or input
    setTimeout(() => {
      const remainingItems = this.todoService.filteredTodos();
      if (remainingItems.length === 0) {
        this.todoInputRef.nativeElement.focus();
      } else {
        // Focus the item that now occupies the deleted position, or the last item
        const focusIndex = Math.min(deletedIndex, remainingItems.length - 1);
        const targetId = remainingItems[focusIndex].id;
        const targetEl = document.querySelector<HTMLElement>(
          `.todo-item[data-todo-id="${targetId}"] .todo-checkbox`
        );
        targetEl?.focus() || this.todoInputRef.nativeElement.focus();
      }
    });
  }
}
