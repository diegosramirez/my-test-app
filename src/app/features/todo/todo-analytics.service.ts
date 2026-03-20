import { Injectable } from '@angular/core';

/**
 * Analytics abstraction for the todo feature.
 * v1 implementation logs structured objects to console.
 * Replace the console calls with a real analytics provider when available.
 */
@Injectable({ providedIn: 'root' })
export class TodoAnalyticsService {
  trackPageViewed(): void {
    console.log('todo_page_viewed', { timestamp: Date.now() });
  }

  trackTaskAdded(taskText: string, totalTasks: number): void {
    console.log('todo_task_added', { taskText, totalTasks, timestamp: Date.now() });
  }

  trackTaskCompleted(taskId: string, totalCompleted: number): void {
    console.log('todo_task_completed', { taskId, totalCompleted, timestamp: Date.now() });
  }

  trackTaskDeleted(taskId: string, remainingTasks: number): void {
    console.log('todo_task_deleted', { taskId, remainingTasks, timestamp: Date.now() });
  }

  trackAddBlocked(reason: string): void {
    console.log('todo_add_blocked', { reason, timestamp: Date.now() });
  }
}
