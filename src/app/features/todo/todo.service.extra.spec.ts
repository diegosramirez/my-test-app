import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TodoService } from './todo.service';

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('TodoService — additional edge cases', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    vi.stubGlobal('crypto', { randomUUID: () => `test-${Date.now()}-${Math.random()}` });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function createService(): TodoService {
    return new TodoService();
  }

  it('should reject titles longer than 250 characters', () => {
    const service = createService();
    service.addTodo('a'.repeat(251));
    expect(service.todos().length).toBe(0);
  });

  it('should accept titles exactly 250 characters', () => {
    const service = createService();
    service.addTodo('a'.repeat(250));
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title.length).toBe(250);
  });

  it('should generate unique ids for each todo', () => {
    const service = createService();
    service.addTodo('A');
    service.addTodo('B');
    service.addTodo('C');
    const ids = service.todos().map(t => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('should store createdAt as ISO 8601 string', () => {
    const service = createService();
    service.addTodo('Check date');
    const createdAt = service.todos()[0].createdAt;
    expect(typeof createdAt).toBe('string');
    expect(new Date(createdAt).toISOString()).toBe(createdAt);
  });

  it('should persist under versioned schema { version: 1, todos: [...] }', () => {
    const service = createService();
    service.addTodo('Schema check');
    const stored = JSON.parse(mockStorage.getItem('todos_app_data')!);
    expect(stored.version).toBe(1);
    expect(Array.isArray(stored.todos)).toBe(true);
    expect(stored.todos[0].title).toBe('Schema check');
  });

  it('should handle unrecognized schema version gracefully', () => {
    mockStorage.setItem('todos_app_data', JSON.stringify({ version: 99, todos: [] }));
    const service = createService();
    expect(service.todos()).toEqual([]);
  });

  it('should undo clearCompleted and restore todos', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('Active');
    service.addTodo('Done1');
    service.addTodo('Done2');
    service.toggleTodo(service.todos()[0].id); // Done2
    service.toggleTodo(service.todos()[1].id); // Done1

    service.clearCompleted();
    expect(service.todos().length).toBe(1);
    expect(service.showUndo()).toBe(true);
    expect(service.undoMessage()).toContain('2 tasks cleared');

    service.undoDelete();
    expect(service.todos().length).toBe(3);
    expect(service.showUndo()).toBe(false);
  });

  it('should do nothing when clearCompleted is called with no completed todos', () => {
    const service = createService();
    service.addTodo('Active only');
    service.clearCompleted();
    expect(service.todos().length).toBe(1);
    expect(service.showUndo()).toBe(false);
  });

  it('should not toggle a non-existent todo id', () => {
    const service = createService();
    service.addTodo('Exists');
    service.toggleTodo('nonexistent-id');
    expect(service.todos()[0].completed).toBe(false);
  });

  it('should not delete a non-existent todo id', () => {
    const service = createService();
    service.addTodo('Exists');
    service.deleteTodo('nonexistent-id');
    expect(service.todos().length).toBe(1);
    expect(service.showUndo()).toBe(false);
  });

  it('should do nothing when undoDelete is called with no pending delete', () => {
    const service = createService();
    service.addTodo('Task');
    service.undoDelete(); // no-op
    expect(service.todos().length).toBe(1);
  });

  it('should fire todo_deleted tracking after undo window expires', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log');
    const service = createService();
    service.addTodo('Track me');
    consoleSpy.mockClear();

    service.deleteTodo(service.todos()[0].id);
    // Before timeout, no todo_deleted event
    expect(consoleSpy.mock.calls.some(c => c[0].includes('todo_deleted'))).toBe(false);

    vi.advanceTimersByTime(4000);
    expect(consoleSpy.mock.calls.some(c => c[0].includes('todo_deleted'))).toBe(true);
  });

  it('should fire todo_filter_changed tracking on setFilter', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const service = createService();
    service.setFilter('active');
    expect(consoleSpy.mock.calls.some(c =>
      c[0].includes('todo_filter_changed') && c[1]?.filterValue === 'active'
    )).toBe(true);
  });

  it('should fire todo_completed tracking only when marking as completed', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const service = createService();
    service.addTodo('Track toggle');
    consoleSpy.mockClear();

    const id = service.todos()[0].id;
    service.toggleTodo(id); // complete
    expect(consoleSpy.mock.calls.some(c => c[0].includes('todo_completed'))).toBe(true);

    consoleSpy.mockClear();
    service.toggleTodo(id); // uncomplete
    expect(consoleSpy.mock.calls.some(c => c[0].includes('todo_completed'))).toBe(false);
  });

  it('should restore todo to original position on undo', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('First');
    service.addTodo('Second');
    service.addTodo('Third');
    // Order: Third, Second, First

    const secondId = service.todos()[1].id;
    service.deleteTodo(secondId);
    expect(service.todos().map(t => t.title)).toEqual(['Third', 'First']);

    service.undoDelete();
    expect(service.todos().map(t => t.title)).toEqual(['Third', 'Second', 'First']);
  });

  it('should handle rapid add operations', () => {
    const service = createService();
    for (let i = 0; i < 100; i++) {
      service.addTodo(`Task ${i}`);
    }
    expect(service.todos().length).toBe(100);
    expect(service.todos()[0].title).toBe('Task 99');
  });

  it('should not auto-switch filter when adding on active filter', () => {
    const service = createService();
    service.setFilter('active');
    service.addTodo('New');
    expect(service.filter()).toBe('active');
  });

  it('should compute storageSizeBytes in stats', () => {
    const service = createService();
    expect(service.stats().storageSizeBytes).toBeGreaterThan(0);
    service.addTodo('More data');
    const size = service.stats().storageSizeBytes;
    expect(size).toBeGreaterThan(2); // non-trivial size
  });

  it('should handle null in localStorage gracefully', () => {
    mockStorage.setItem('todos_app_data', 'null');
    const service = createService();
    expect(service.todos()).toEqual([]);
  });

  it('should handle empty object in localStorage gracefully', () => {
    mockStorage.setItem('todos_app_data', JSON.stringify({}));
    const service = createService();
    expect(service.todos()).toEqual([]);
  });

  it('should filter out partially valid todos from storage', () => {
    mockStorage.setItem('todos_app_data', JSON.stringify({
      version: 1,
      todos: [
        { id: '1', title: 'Good', completed: false, createdAt: '2024-01-01' },
        { id: '2', title: null, completed: false, createdAt: '2024-01-01' },
        { id: '3', title: 'No completed field', createdAt: '2024-01-01' },
        null,
        undefined,
      ],
    }));
    const service = createService();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].id).toBe('1');
  });
});
