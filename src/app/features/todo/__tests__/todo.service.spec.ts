import { TestBed } from '@angular/core/testing';
import { TodoService, ID_GENERATOR } from '../todo.service';
import { StorageAdapter } from '../../../core/storage-adapter.service';
import { AnalyticsService } from '../../../core/analytics.service';
import { TodoStore } from '../todo.model';

class MockAnalyticsService extends AnalyticsService {
  events: { event: string; meta: Record<string, unknown> }[] = [];
  track(event: string, meta: Record<string, unknown>): void {
    this.events.push({ event, meta });
  }
}

describe('TodoService', () => {
  let service: TodoService;
  let analytics: MockAnalyticsService;
  let storage: Record<string, string>;
  let storageAvailable: boolean;
  let idCounter: number;

  function createService() {
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        {
          provide: StorageAdapter,
          useValue: {
            storageAvailable: () => storageAvailable,
            read: (key: string) => {
              if (!storageAvailable) return null;
              const raw = storage[key];
              return raw ? JSON.parse(raw) : null;
            },
            write: (key: string, data: unknown) => {
              if (!storageAvailable) return false;
              storage[key] = JSON.stringify(data);
              return true;
            },
          },
        },
        { provide: AnalyticsService, useValue: analytics },
        { provide: ID_GENERATOR, useValue: () => `id-${++idCounter}` },
      ],
    });
    service = TestBed.inject(TodoService);
  }

  beforeEach(() => {
    storage = {};
    storageAvailable = true;
    analytics = new MockAnalyticsService();
    idCounter = 0;
  });

  it('should add a todo and persist', () => {
    createService();
    service.add('Buy milk');
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Buy milk');
    expect(service.todos()[0].id).toBe('id-1');

    const stored: TodoStore = JSON.parse(storage['todos_app_data']);
    expect(stored.version).toBe(1);
    expect(stored.todos.length).toBe(1);
  });

  it('should reject whitespace-only input', () => {
    createService();
    service.add('   ');
    service.add('');
    service.add('\t');
    expect(service.todos().length).toBe(0);
  });

  it('should truncate titles to 250 chars', () => {
    createService();
    service.add('a'.repeat(300));
    expect(service.todos()[0].title.length).toBe(250);
  });

  it('should toggle a todo', () => {
    createService();
    service.add('Test');
    expect(service.todos()[0].completed).toBe(false);
    service.toggle('id-1');
    expect(service.todos()[0].completed).toBe(true);
    service.toggle('id-1');
    expect(service.todos()[0].completed).toBe(false);
  });

  it('should remove a todo and set lastDeleted', () => {
    createService();
    service.add('Test');
    service.remove('id-1');
    expect(service.todos().length).toBe(0);
    expect(service.lastDeleted()?.id).toBe('id-1');
  });

  it('should compute activeCount', () => {
    createService();
    service.add('One');
    service.add('Two');
    expect(service.activeCount()).toBe(2);
    service.toggle('id-1');
    expect(service.activeCount()).toBe(1);
  });

  it('should load from localStorage on construction', () => {
    const store: TodoStore = {
      version: 1,
      todos: [{ id: 'x', title: 'Persisted', completed: false, createdAt: '2024-01-01T00:00:00Z' }],
    };
    storage['todos_app_data'] = JSON.stringify(store);
    createService();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Persisted');
  });

  it('should handle corrupted data gracefully', () => {
    storage['todos_app_data'] = JSON.stringify({ bad: 'data' });
    createService();
    expect(service.todos().length).toBe(0);
    expect(analytics.events.some(e => e.event === 'storage_corrupted')).toBe(true);
  });

  it('should track analytics events', () => {
    createService();
    service.add('Test');
    service.toggle('id-1');
    service.remove('id-1');
    const eventNames = analytics.events.map(e => e.event);
    expect(eventNames).toContain('todo_created');
    expect(eventNames).toContain('todo_toggled');
    expect(eventNames).toContain('todo_deleted');
  });

  it('should work in-memory when storage unavailable', () => {
    storageAvailable = false;
    createService();
    service.add('In memory');
    expect(service.todos().length).toBe(1);
    expect(service.lastWriteSuccess()).toBe(false);
  });

  it('should set hasEverHadTodos after first add', () => {
    createService();
    expect(service.hasEverHadTodos()).toBe(false);
    service.add('First');
    expect(service.hasEverHadTodos()).toBe(true);
  });
});
