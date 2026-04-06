import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from '../services/todo.service';
import { Todo, TodoFilter } from '../models/todo.interface';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="todo-container" role="main" aria-label="Todo List Application">
      <div class="todo-header">
        <h1>Todo List</h1>
        <p class="todo-subtitle">Stay organized and productive</p>
      </div>

      <!-- Add Todo Form -->
      <form class="todo-form" (ngSubmit)="addTodo()" #todoForm="ngForm">
        <div class="input-group">
          <input
            #todoInput
            type="text"
            [(ngModel)]="newTodoText"
            name="todoText"
            placeholder="What needs to be done?"
            class="todo-input"
            maxlength="100"
            required
            aria-label="Enter new todo item"
            [attr.aria-describedby]="newTodoText.length > 0 ? 'char-count' : null"
            (keydown.enter)="addTodo()"
            [disabled]="isAdding()"
          />
          <span id="char-count" class="char-count" [class.warning]="newTodoText.length > 90">
            {{ newTodoText.length }}/100
          </span>
          <button
            type="submit"
            class="add-button"
            [disabled]="!todoForm.valid || newTodoText.trim().length === 0 || isAdding()"
            aria-label="Add todo item"
          >
            <span class="add-icon" aria-hidden="true">+</span>
            <span class="sr-only">Add Todo</span>
          </button>
        </div>
        <div class="form-error" *ngIf="errorMessage()" role="alert" aria-live="polite">
          {{ errorMessage() }}
        </div>
      </form>

      <!-- Filter Controls -->
      <div class="filter-controls" role="tablist" aria-label="Filter todos">
        <button
          *ngFor="let filterOption of filterOptions; trackBy: trackByFilterName"
          class="filter-button"
          [class.active]="todoService.filter === filterOption.value"
          (click)="setFilter(filterOption.value)"
          [attr.aria-selected]="todoService.filter === filterOption.value"
          role="tab"
          [attr.aria-controls]="'todo-list'"
          [attr.id]="'filter-' + filterOption.value"
        >
          {{ filterOption.label }}
          <span class="filter-count" aria-hidden="true">
            ({{ getFilterCount(filterOption.value) }})
          </span>
        </button>
      </div>

      <!-- Todo List -->
      <div
        id="todo-list"
        class="todo-list"
        role="tabpanel"
        [attr.aria-labelledby]="'filter-' + todoService.filter"
        [attr.aria-live]="'polite'"
        [attr.aria-busy]="isLoading()"
      >
        <div
          *ngIf="filteredTodos.length === 0"
          class="empty-state"
          role="status"
          aria-live="polite"
        >
          <div class="empty-icon" aria-hidden="true">📝</div>
          <p>
            {{ getEmptyStateMessage() }}
          </p>
        </div>

        <div
          *ngFor="let todo of filteredTodos; trackBy: todoService.trackByTodoId; let i = index"
          class="todo-item"
          [class.completed]="todo.completed"
          [attr.data-testid]="'todo-item-' + todo.id"
          role="listitem"
          [attr.aria-label]="'Task ' + (i + 1) + ' of ' + filteredTodos.length"
        >
          <div class="todo-content">
            <input
              type="checkbox"
              [id]="'todo-' + todo.id"
              [checked]="todo.completed"
              (change)="toggleTodo(todo.id)"
              class="todo-checkbox"
              [attr.aria-describedby]="'todo-text-' + todo.id"
              [attr.aria-label]="'Mark task as ' + (todo.completed ? 'incomplete' : 'complete')"
            />
            <label
              [for]="'todo-' + todo.id"
              [id]="'todo-text-' + todo.id"
              class="todo-text"
              [attr.aria-label]="todo.text + (todo.completed ? ' - completed' : ' - pending')"
            >
              <span class="todo-title">{{ todo.text }}</span>
              <span class="todo-meta">
                Created {{ formatDate(todo.createdAt) }}
              </span>
            </label>
          </div>
          <button
            type="button"
            class="delete-button"
            (click)="deleteTodo(todo.id)"
            [attr.aria-label]="'Delete task: ' + todo.text"
            [attr.data-testid]="'delete-' + todo.id"
          >
            <span class="delete-icon" aria-hidden="true">×</span>
            <span class="sr-only">Delete</span>
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="todo-actions" *ngIf="todoService.todos.length > 0">
        <div class="todo-stats">
          <span class="stats-text">
            {{ activeTodoCount }} of {{ totalTodoCount }} remaining
          </span>
        </div>
        <button
          *ngIf="completedTodoCount > 0"
          type="button"
          class="clear-completed"
          (click)="clearCompleted()"
          [attr.aria-label]="'Clear ' + completedTodoCount + ' completed tasks'"
        >
          Clear Completed ({{ completedTodoCount }})
        </button>
      </div>

      <!-- Performance Info (dev mode only) -->
      <div class="performance-info" *ngIf="showPerformanceInfo">
        <small>
          Rendered {{ filteredTodos.length }} todos in {{ renderTime }}ms
        </small>
      </div>
    </div>
  `,
  styleUrls: ['./todo-list.component.css']
})
export class TodoListComponent implements OnInit, OnDestroy {
  todoService = inject(TodoService);

  // Component state
  newTodoText = '';
  protected isAdding = signal(false);
  protected isLoading = signal(false);
  protected errorMessage = signal('');

  // Performance tracking
  showPerformanceInfo = false; // Set to true for development
  renderTime = 0;

  // Filter options
  filterOptions = [
    { value: 'all' as TodoFilter, label: 'All' },
    { value: 'active' as TodoFilter, label: 'Active' },
    { value: 'completed' as TodoFilter, label: 'Completed' }
  ];

  // Computed properties for performance
  get filteredTodos(): Todo[] {
    const startTime = performance.now();
    const todos = this.todoService.filteredTodos;
    this.renderTime = Math.round(performance.now() - startTime);
    return todos;
  }

  get totalTodoCount(): number {
    return this.todoService.todos.length;
  }

  get activeTodoCount(): number {
    return this.todoService.todos.filter(todo => !todo.completed).length;
  }

  get completedTodoCount(): number {
    return this.todoService.todos.filter(todo => todo.completed).length;
  }

  ngOnInit(): void {
    this.isLoading.set(false);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  addTodo(): void {
    const text = this.newTodoText.trim();

    if (!text) {
      return;
    }

    if (text.length > 100) {
      this.setErrorMessage('Task text cannot exceed 100 characters');
      return;
    }

    this.isAdding.set(true);
    this.clearErrorMessage();

    try {
      // Simulate async operation for UX
      setTimeout(() => {
        try {
          this.todoService.addTodo(text);
          this.newTodoText = '';
          this.isAdding.set(false);
          this.announceToScreenReader(`Added task: ${text}`);
        } catch (error) {
          this.setErrorMessage(error instanceof Error ? error.message : 'Failed to add task');
          this.isAdding.set(false);
        }
      }, 50); // Small delay for visual feedback
    } catch (error) {
      this.setErrorMessage(error instanceof Error ? error.message : 'Failed to add task');
      this.isAdding.set(false);
    }
  }

  toggleTodo(id: string): void {
    const todo = this.todoService.todos.find(t => t.id === id);
    if (!todo) return;

    this.todoService.toggleTodo(id);

    const newStatus = !todo.completed ? 'completed' : 'incomplete';
    this.announceToScreenReader(`Task "${todo.text}" marked as ${newStatus}`);
  }

  deleteTodo(id: string): void {
    const todo = this.todoService.todos.find(t => t.id === id);
    if (!todo) return;

    this.todoService.deleteTodo(id);
    this.announceToScreenReader(`Deleted task: ${todo.text}`);
  }

  setFilter(filter: TodoFilter): void {
    this.todoService.setFilter(filter);
    this.announceToScreenReader(`Showing ${filter} tasks`);
  }

  clearCompleted(): void {
    const count = this.completedTodoCount;
    this.todoService.clearCompleted();
    this.announceToScreenReader(`Cleared ${count} completed tasks`);
  }

  // Utility methods
  getFilterCount(filter: TodoFilter): number {
    switch (filter) {
      case 'active':
        return this.activeTodoCount;
      case 'completed':
        return this.completedTodoCount;
      default:
        return this.totalTodoCount;
    }
  }

  getEmptyStateMessage(): string {
    switch (this.todoService.filter) {
      case 'active':
        return this.totalTodoCount > 0 ? 'No active tasks! 🎉' : 'No tasks yet. Add one above!';
      case 'completed':
        return 'No completed tasks yet';
      default:
        return 'No tasks yet. Add one above to get started!';
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  // TrackBy functions for performance
  trackByFilterName(index: number, filter: { value: TodoFilter; label: string }): string {
    return filter.value;
  }

  // Private helper methods
  private setErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.clearErrorMessage(), 5000);
  }

  private clearErrorMessage(): void {
    this.errorMessage.set('');
  }

  private announceToScreenReader(message: string): void {
    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.textContent = message;
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

}