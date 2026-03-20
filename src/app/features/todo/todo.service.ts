import { Injectable, inject, signal, computed } from '@angular/core';
import { TodoItem, TodoStorage, CURRENT_STORAGE_VERSION, generateId } from './todo.model';
import { STORAGE } from './storage.token';

const STORAGE_KEY = 'todo_items';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly storage = inject(STORAGE);
  private readonly _items = signal<TodoItem[]>([]);
  private readonly _storageAvailable = signal(true);

  readonly items = this._items.asReadonly();
  readonly storageAvailable = this._storageAvailable.asReadonly();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw === null) {
        this._items.set([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items) && typeof parsed.version === 'number') {
        this._items.set(parsed.items);
      } else {
        // Legacy or corrupted format
        console.warn('TodoService: corrupted or unrecognized storage format. Clearing.');
        this.storage.removeItem(STORAGE_KEY);
        this._items.set([]);
      }
    } catch (e) {
      console.warn('TodoService: failed to parse localStorage data. Falling back to empty.', e);
      try {
        this.storage.removeItem(STORAGE_KEY);
      } catch {
        // storage completely unavailable
      }
      this._storageAvailable.set(false);
      this._items.set([]);
    }
  }

  private persist(): void {
    try {
      const envelope: TodoStorage = {
        version: CURRENT_STORAGE_VERSION,
        items: this._items(),
      };
      this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.warn('TodoService: failed to persist to localStorage.', e);
      this._storageAvailable.set(false);
    }
  }

  add(title: string): TodoItem {
    const item: TodoItem = {
      id: generateId(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this._items.update(items => [item, ...items]);
    this.persist();
    return item;
  }

  toggle(id: string): void {
    this._items.update(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    this.persist();
  }

  delete(id: string): TodoItem | undefined {
    let deleted: TodoItem | undefined;
    this._items.update(items => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return items;
      deleted = items[idx];
      const copy = [...items];
      copy.splice(idx, 1);
      return copy;
    });
    // Persist immediately so closing the browser won't lose the deletion
    this.persist();
    return deleted;
  }

  restoreDeleted(item: TodoItem, index?: number): void {
    this._items.update(items => {
      const copy = [...items];
      const clampedIndex = index !== undefined && index >= 0 ? Math.min(index, copy.length) : 0;
      copy.splice(clampedIndex, 0, item);
      return copy;
    });
    this.persist();
  }

  /** Called after undo window expires to finalize deletion in storage */
  finalizeDelete(): void {
    this.persist();
  }
}
