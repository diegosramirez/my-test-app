import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TodoService } from './todo.service';

// Mock localStorage
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

describe('TodoService', () => {
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

  it('should start with empty todos', () => {
    const service = createService();
    expect(service.todos()).toEqual([]);
    expect(service.stats().total).toBe(0);
  });

  it('should add a todo', () => {
    const service = createService();
    service.addTodo('Test task');
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Test task');
    expect(service.todos()[0].completed).toBe(false);
  });

  it('should not add empty or whitespace-only todos', () => {
    const service = createService();
    service.addTodo('');
    service.addTodo('   ');
    expect(service.todos().length).toBe(0);
  });

  it('should trim todo titles', () => {
    const service = createService();
    service.addTodo('  Hello World  ');
    expect(service.todos()[0].title).toBe('Hello World');
  });

  it('should prepend new todos (newest first)', () => {
    const service = createService();
    service.addTodo('First');
    service.addTodo('Second');
    expect(service.todos()[0].title).toBe('Second');
    expect(service.todos()[1].title).toBe('First');
  });

  it('should toggle todo completion', () => {
    const service = createService();
    service.addTodo('Toggle me');
    const id = service.todos()[0].id;

    service.toggleTodo(id);
    expect(service.todos()[0].completed).toBe(true);

    service.toggleTodo(id);
    expect(service.todos()[0].completed).toBe(false);
  });

  it('should delete a todo with undo support', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('Delete me');
    const id = service.todos()[0].id;

    service.deleteTodo(id);
    expect(service.todos().length).toBe(0);
    expect(service.showUndo()).toBe(true);

    service.undoDelete();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Delete me');
    expect(service.showUndo()).toBe(false);
  });

  it('should finalize delete after 4 seconds', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('Delete me');
    const id = service.todos()[0].id;

    service.deleteTodo(id);
    expect(service.showUndo()).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(service.showUndo()).toBe(false);
    expect(service.todos().length).toBe(0);
  });

  it('should filter todos', () => {
    const service = createService();
    service.addTodo('Active task');
    service.addTodo('Completed task');
    service.toggleTodo(service.todos()[0].id); // Mark 'Completed task' as completed

    service.setFilter('active');
    expect(service.filteredTodos().length).toBe(1);
    expect(service.filteredTodos()[0].title).toBe('Active task');

    service.setFilter('completed');
    expect(service.filteredTodos().length).toBe(1);
    expect(service.filteredTodos()[0].title).toBe('Completed task');

    service.setFilter('all');
    expect(service.filteredTodos().length).toBe(2);
  });

  it('should auto-switch filter to all when adding while on completed filter', () => {
    const service = createService();
    service.setFilter('completed');
    service.addTodo('New task');
    expect(service.filter()).toBe('all');
  });

  it('should clear completed todos', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('Active');
    service.addTodo('Done');
    service.toggleTodo(service.todos()[0].id);

    service.clearCompleted();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Active');
    expect(service.showUndo()).toBe(true);
  });

  it('should persist and restore from localStorage', () => {
    const service1 = createService();
    service1.addTodo('Persisted task');
    service1.toggleTodo(service1.todos()[0].id);

    const service2 = createService();
    expect(service2.todos().length).toBe(1);
    expect(service2.todos()[0].title).toBe('Persisted task');
    expect(service2.todos()[0].completed).toBe(true);
  });

  it('should handle corrupted localStorage gracefully', () => {
    mockStorage.setItem('todos_app_data', 'not valid json!!!');
    const service = createService();
    expect(service.todos()).toEqual([]);
  });

  it('should handle invalid todo shapes in localStorage', () => {
    mockStorage.setItem('todos_app_data', JSON.stringify({
      version: 1,
      todos: [
        { id: 'valid', title: 'Valid', completed: false, createdAt: '2024-01-01' },
        { id: 123, title: 'Bad ID' }, // invalid
        'not an object', // invalid
      ],
    }));
    const service = createService();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Valid');
  });

  it('should handle legacy raw array format', () => {
    mockStorage.setItem('todos_app_data', JSON.stringify([
      { id: 'legacy1', title: 'Legacy', completed: false, createdAt: '2024-01-01' },
    ]));
    const service = createService();
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('Legacy');
  });

  it('should handle localStorage write failure gracefully', () => {
    const service = createService();
    // Simulate quota exceeded
    mockStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };

    service.addTodo('Fail to save');
    expect(service.todos().length).toBe(1); // In-memory still works
    expect(service.storageAvailable()).toBe(false);
  });

  it('should compute stats correctly', () => {
    const service = createService();
    service.addTodo('One');
    service.addTodo('Two');
    service.addTodo('Three');
    service.toggleTodo(service.todos()[0].id);

    const stats = service.stats();
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.active).toBe(2);
    expect(stats.storageSizeBytes).toBeGreaterThan(0);
  });

  it('should finalize previous pending delete when new delete occurs', () => {
    vi.useFakeTimers();
    const service = createService();
    service.addTodo('First');
    service.addTodo('Second');

    service.deleteTodo(service.todos()[0].id); // Delete 'Second'
    service.deleteTodo(service.todos()[0].id); // Delete 'First', finalizes 'Second'

    service.undoDelete();
    // Only 'First' should be restored (Second was finalized)
    expect(service.todos().length).toBe(1);
    expect(service.todos()[0].title).toBe('First');
  });

  it('should allow duplicate titles', () => {
    const service = createService();
    service.addTodo('Same title');
    service.addTodo('Same title');
    expect(service.todos().length).toBe(2);
    expect(service.todos()[0].id).not.toBe(service.todos()[1].id);
  });
});
