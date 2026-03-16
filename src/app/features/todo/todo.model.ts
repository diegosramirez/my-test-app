export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TodoStore {
  version: number;
  todos: Todo[];
}

export type TodoFilter = 'all' | 'active' | 'completed';

export function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['completed'] === 'boolean' &&
    typeof obj['createdAt'] === 'string'
  );
}

export function isTodoStore(value: unknown): value is TodoStore {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['version'] === 'number' &&
    Array.isArray(obj['todos']) &&
    obj['todos'].every(isTodo)
  );
}
