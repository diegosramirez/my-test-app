import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskStatus, TaskOperationResult, TaskPersistenceConfig } from '../models/task.interface';

/**
 * Service for managing task data with localStorage persistence and error handling
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly config: TaskPersistenceConfig = {
    storageKey: 'todo-app-tasks',
    fallbackToMemory: true,
    validateData: true
  };

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private fallbackStorage: Task[] = [];
  private usingFallback = false;

  public readonly tasks$ = this.tasksSubject.asObservable();

  constructor() {
    this.loadTasks();
  }

  /**
   * Load tasks from localStorage with comprehensive error handling
   */
  private loadTasks(): TaskOperationResult {
    try {
      if (!this.isLocalStorageAvailable()) {
        return this.handleStorageUnavailable();
      }

      const storedData = localStorage.getItem(this.config.storageKey);
      if (!storedData) {
        this.tasksSubject.next([]);
        return { success: true };
      }

      const parsedTasks = JSON.parse(storedData);
      const validatedTasks = this.validateAndSanitizeTasks(parsedTasks);

      this.tasksSubject.next(validatedTasks);
      return { success: true };

    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return this.handleLoadError(error);
    }
  }

  /**
   * Save tasks to localStorage with error handling
   */
  private saveTasks(tasks: Task[]): TaskOperationResult {
    try {
      if (this.usingFallback) {
        this.fallbackStorage = [...tasks];
        return { success: true, fallbackUsed: true };
      }

      if (!this.isLocalStorageAvailable()) {
        return this.handleStorageUnavailable(tasks);
      }

      const serializedTasks = JSON.stringify(tasks);
      localStorage.setItem(this.config.storageKey, serializedTasks);
      return { success: true };

    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
      return this.handleSaveError(error, tasks);
    }
  }

  /**
   * Add a new task
   */
  public addTask(text: string): TaskOperationResult {
    if (!text.trim()) {
      return { success: false, error: 'Task text cannot be empty' };
    }

    const newTask: Task = {
      id: this.generateId(),
      text: text.trim(),
      status: 'active',
      createdAt: new Date()
    };

    const currentTasks = this.tasksSubject.value;
    const updatedTasks = [...currentTasks, newTask];

    this.tasksSubject.next(updatedTasks);
    const saveResult = this.saveTasks(updatedTasks);

    // If save fails due to quota error, rollback the change
    if (!saveResult.success && saveResult.error?.includes('quota')) {
      this.tasksSubject.next(currentTasks);
    }

    return saveResult;
  }

  /**
   * Toggle task completion status
   */
  public toggleTask(taskId: string): TaskOperationResult {
    const currentTasks = this.tasksSubject.value;
    const taskIndex = currentTasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      return { success: false, error: 'Task not found' };
    }

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      status: updatedTasks[taskIndex].status === 'active' ? 'completed' : 'active'
    };

    this.tasksSubject.next(updatedTasks);
    const saveResult = this.saveTasks(updatedTasks);

    // If save fails due to quota error, rollback the change
    if (!saveResult.success && saveResult.error?.includes('quota')) {
      this.tasksSubject.next(currentTasks);
    }

    return saveResult;
  }

  /**
   * Delete a task
   */
  public deleteTask(taskId: string): TaskOperationResult {
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = currentTasks.filter(task => task.id !== taskId);

    if (updatedTasks.length === currentTasks.length) {
      return { success: false, error: 'Task not found' };
    }

    this.tasksSubject.next(updatedTasks);
    const saveResult = this.saveTasks(updatedTasks);

    // If save fails due to quota error, rollback the change
    if (!saveResult.success && saveResult.error?.includes('quota')) {
      this.tasksSubject.next(currentTasks);
    }

    return saveResult;
  }

  /**
   * Clear all completed tasks
   */
  public clearCompleted(): TaskOperationResult {
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = currentTasks.filter(task => task.status === 'active');

    this.tasksSubject.next(updatedTasks);
    const saveResult = this.saveTasks(updatedTasks);

    // If save fails due to quota error, rollback the change
    if (!saveResult.success && saveResult.error?.includes('quota')) {
      this.tasksSubject.next(currentTasks);
    }

    return saveResult;
  }

  /**
   * Get current tasks synchronously
   */
  public getTasks(): Task[] {
    return this.tasksSubject.value;
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle localStorage unavailable scenario
   */
  private handleStorageUnavailable(tasks?: Task[]): TaskOperationResult {
    this.usingFallback = true;

    if (tasks) {
      this.fallbackStorage = [...tasks];
    } else if (this.fallbackStorage.length > 0) {
      this.tasksSubject.next([...this.fallbackStorage]);
    }

    return {
      success: true,
      fallbackUsed: true,
      error: 'localStorage unavailable, using in-memory storage'
    };
  }

  /**
   * Handle load errors with graceful fallback
   */
  private handleLoadError(error: any): TaskOperationResult {
    if (error instanceof SyntaxError) {
      // Corrupted JSON data - reset to empty state
      localStorage.removeItem(this.config.storageKey);
      this.tasksSubject.next([]);
      return {
        success: true,
        error: 'Corrupted data detected, reset to empty state'
      };
    }

    return this.handleStorageUnavailable();
  }

  /**
   * Handle save errors with appropriate fallback
   */
  private handleSaveError(error: any, tasks: Task[]): TaskOperationResult {
    if (error.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Storage quota exceeded. Consider clearing completed tasks.'
      };
    }

    if (error.name === 'SecurityError') {
      return this.handleStorageUnavailable(tasks);
    }

    return {
      success: false,
      error: 'Failed to save tasks'
    };
  }

  /**
   * Validate and sanitize loaded task data
   */
  private validateAndSanitizeTasks(data: any): Task[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(item => this.isValidTaskData(item))
      .map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
  }

  /**
   * Validate individual task data structure
   */
  private isValidTaskData(item: any): boolean {
    return (
      item != null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.text === 'string' &&
      (item.status === 'active' || item.status === 'completed') &&
      item.createdAt != null
    );
  }

  /**
   * Generate a UUID for new tasks
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if using fallback storage
   */
  public isUsingFallback(): boolean {
    return this.usingFallback;
  }
}