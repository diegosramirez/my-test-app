export interface Todo {
  /** UUID v4 — requires secure context (HTTPS or localhost) */
  id: string;
  title: string;
  completed: boolean;
  /** ISO 8601 string — not Date, because JSON.parse does not rehydrate Date objects */
  createdAt: string;
}

export type TodoFilter = 'all' | 'active' | 'completed';

export interface TodoStorageSchema {
  version: number;
  todos: Todo[];
}

export interface TodoTrackingEvent {
  eventName: 'todo_added' | 'todo_completed' | 'todo_deleted' | 'todo_filter_changed';
  meta: Record<string, string | number>;
  timestamp: string;
}
