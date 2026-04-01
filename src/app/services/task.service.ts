import { Injectable, signal, computed } from '@angular/core';
import { Task } from '../models/task.model';
import { TaskFilter } from '../models/filter.type';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private nextId = 1;
  private tasksSignal = signal<Task[]>([]);
  private filterSignal = signal<TaskFilter>('all');

  readonly tasks = this.tasksSignal.asReadonly();
  readonly activeFilter = this.filterSignal.asReadonly();

  readonly activeCount = computed(() =>
    this.tasksSignal().filter(t => !t.completed).length
  );

  readonly hasCompleted = computed(() =>
    this.tasksSignal().some(t => t.completed)
  );

  readonly filteredTasks = computed(() => {
    const filter = this.filterSignal();
    const tasks = this.tasksSignal();
    switch (filter) {
      case 'active': return tasks.filter(t => !t.completed);
      case 'completed': return tasks.filter(t => t.completed);
      default: return tasks;
    }
  });

  addTask(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.tasksSignal.update(tasks => [
      ...tasks,
      { id: this.nextId++, title: trimmed, completed: false }
    ]);
  }

  toggleTask(id: number): void {
    this.tasksSignal.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  deleteTask(id: number): void {
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== id));
  }

  setFilter(filter: TaskFilter): void {
    this.filterSignal.set(filter);
  }

  clearCompleted(): void {
    this.tasksSignal.update(tasks => tasks.filter(t => !t.completed));
  }
}
