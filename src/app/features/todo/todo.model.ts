export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO-8601
}

export interface TodoStorage {
  version: number;
  items: TodoItem[];
}

export const CURRENT_STORAGE_VERSION = 1;

export type TodoTrackingEvent =
  | { name: 'todo_item_added'; meta: { title: string; timestamp: string } }
  | { name: 'todo_item_toggled'; meta: { itemId: string; completed: boolean } }
  | { name: 'todo_item_deleted'; meta: { itemId: string } }
  | { name: 'todo_page_viewed'; meta: { itemCount: number } };

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
