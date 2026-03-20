import { Injectable } from '@angular/core';
import { TodoTask, TodoStorageEnvelope } from './todo.model';

// NOTE: localStorage key is not namespaced; update if an app-wide prefix convention is established.
const STORAGE_KEY = 'todo_tasks';
const CURRENT_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class TodoStorageService {
  load(): TodoTask[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return [];
      }
      const parsed = JSON.parse(raw);

      // Support versioned envelope
      if (parsed && typeof parsed === 'object' && typeof parsed.version === 'number' && Array.isArray(parsed.tasks)) {
        return parsed.tasks;
      }

      // Fallback: if somehow stored as plain array (shouldn't happen but defensive)
      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [];
    } catch {
      console.warn('TodoStorageService: failed to load tasks from localStorage, returning empty list.');
      return [];
    }
  }

  save(tasks: TodoTask[]): void {
    try {
      const envelope: TodoStorageEnvelope = { version: CURRENT_VERSION, tasks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.warn('TodoStorageService: failed to save tasks to localStorage.', e);
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently ignore — localStorage may be unavailable
    }
  }
}
