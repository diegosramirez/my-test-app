import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TaskService } from '../../services/task.service';
import { Task, TaskFilter, TaskStatus } from '../../models/task.interface';

/**
 * Standalone Todo List component with CRUD operations and filtering
 */
@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public newTaskText = '';
  public currentFilter: TaskFilter = 'all';
  public allTasks: Task[] = [];
  public filteredTasks: Task[] = [];
  public showStorageWarning = false;
  public storageWarningMessage = '';
  public showErrorNotification = false;
  public errorNotificationMessage = '';

  // Filter options for the template
  public readonly filterOptions: { key: TaskFilter; label: string; }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' }
  ];

  // TrackBy function for performance optimization
  public readonly trackByTaskId: TrackByFunction<Task> = (index: number, task: Task) => task.id;

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to tasks changes
    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.allTasks = tasks;
        this.updateFilteredTasks();

        // Check if using fallback storage
        if (this.taskService.isUsingFallback()) {
          this.showStorageWarning = true;
          this.storageWarningMessage = 'localStorage unavailable. Tasks will not persist after browser restart.';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Add a new task
   */
  public addTask(): void {
    if (!this.newTaskText.trim()) {
      return;
    }

    const result = this.taskService.addTask(this.newTaskText);

    if (result.success) {
      this.newTaskText = '';
      this.handleOperationResult(result);
    } else {
      this.showError(result.error || 'Failed to add task');
    }
  }

  /**
   * Handle Enter key in input field
   */
  public onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addTask();
    }
  }

  /**
   * Toggle task completion status
   */
  public toggleTask(task: Task): void {
    const result = this.taskService.toggleTask(task.id);
    this.handleOperationResult(result);
  }

  /**
   * Delete a task
   */
  public deleteTask(task: Task): void {
    const result = this.taskService.deleteTask(task.id);
    this.handleOperationResult(result);
  }

  /**
   * Change the current filter
   */
  public setFilter(filter: TaskFilter): void {
    this.currentFilter = filter;
    this.updateFilteredTasks();
  }

  /**
   * Clear all completed tasks
   */
  public clearCompleted(): void {
    const result = this.taskService.clearCompleted();
    this.handleOperationResult(result);
  }

  /**
   * Dismiss storage warning
   */
  public dismissWarning(): void {
    this.showStorageWarning = false;
    this.cdr.markForCheck();
  }

  /**
   * Dismiss error notification
   */
  public dismissErrorNotification(): void {
    this.showErrorNotification = false;
    this.errorNotificationMessage = '';
    this.cdr.markForCheck();
  }

  /**
   * Update filtered tasks based on current filter
   */
  private updateFilteredTasks(): void {
    switch (this.currentFilter) {
      case 'active':
        this.filteredTasks = this.allTasks.filter(task => task.status === 'active');
        break;
      case 'completed':
        this.filteredTasks = this.allTasks.filter(task => task.status === 'completed');
        break;
      default:
        this.filteredTasks = [...this.allTasks];
    }
  }

  /**
   * Handle operation results and show appropriate feedback
   */
  private handleOperationResult(result: any): void {
    if (result.fallbackUsed && !this.showStorageWarning) {
      this.showStorageWarning = true;
      this.storageWarningMessage = result.error || 'Using in-memory storage';
      this.cdr.markForCheck();
    }

    if (!result.success && result.error) {
      this.showError(result.error);
    }
  }

  /**
   * Show error message with user-friendly notifications
   */
  private showError(message: string): void {
    console.error('Todo List Error:', message);
    this.showErrorNotification = true;
    this.errorNotificationMessage = message;
    this.cdr.markForCheck();

    // Auto-dismiss error notification after 5 seconds
    setTimeout(() => {
      this.dismissErrorNotification();
    }, 5000);
  }

  /**
   * Get count of tasks by status
   */
  public getTaskCount(status?: TaskStatus): number {
    if (!status) {
      return this.allTasks.length;
    }
    return this.allTasks.filter(task => task.status === status).length;
  }

  /**
   * Check if there are any completed tasks
   */
  public hasCompletedTasks(): boolean {
    return this.allTasks.some(task => task.status === 'completed');
  }

  /**
   * Check if a filter is currently active
   */
  public isFilterActive(filter: TaskFilter): boolean {
    return this.currentFilter === filter;
  }
}