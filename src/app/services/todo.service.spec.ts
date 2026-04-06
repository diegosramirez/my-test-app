import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { TodoService } from './todo.service';
import { Todo } from '../models/todo.model';

describe('TodoService', () => {
  let service: TodoService;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        })
      },
      writable: true
    });

    // Mock crypto.randomUUID
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: vi.fn(() => 'test-uuid-' + Math.random())
      },
      writable: true
    });

    // Mock performance.now
    Object.defineProperty(globalThis, 'performance', {
      value: {
        now: vi.fn(() => 100)
      },
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty todos when localStorage is empty', () => {
    expect((service as any).todosSubject.value).toEqual([]);
  });

  it('should load existing todos from localStorage', () => {
    const testTodos: Todo[] = [
      {
        id: '1',
        text: 'Test todo',
        completed: false,
        createdAt: new Date('2023-01-01')
      }
    ];

    localStorageMock['todos'] = JSON.stringify(testTodos);

    const newService = new TodoService();
    expect(newService.currentTodos.length).toBe(1);
    expect(newService.currentTodos[0].text).toBe('Test todo');
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorageMock['todos'] = 'invalid json';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const newService = new TodoService();
    expect(newService.currentTodos).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should add todo successfully', () => {
    const success = service.addTodo('New todo');

    expect(success).toBe(true);
    expect((service as any).todosSubject.value.length).toBe(1);
    expect((service as any).todosSubject.value[0].text).toBe('New todo');
    expect((service as any).todosSubject.value[0].completed).toBe(false);
    expect(localStorageMock['todos']).toBeDefined();
  });

  it('should not add todo with invalid text', () => {
    const success = service.addTodo('   ');

    expect(success).toBe(false);
    expect((service as any).todosSubject.value.length).toBe(0);
  });

  it('should not add todo with text exceeding limit', () => {
    const longText = 'a'.repeat(501);
    const success = service.addTodo(longText);

    expect(success).toBe(false);
    expect((service as any).todosSubject.value.length).toBe(0);
  });

  it('should toggle todo completion', () => {
    service.addTodo('Test todo');
    const todoId = (service as any).todosSubject.value[0].id;

    const success = service.toggleTodo(todoId);

    expect(success).toBe(true);
    expect((service as any).todosSubject.value[0].completed).toBe(true);
  });

  it('should not toggle non-existent todo', () => {
    const success = service.toggleTodo('non-existent-id');

    expect(success).toBe(false);
  });

  it('should delete todo successfully', () => {
    service.addTodo('Test todo');
    const todoId = (service as any).todosSubject.value[0].id;

    const success = service.deleteTodo(todoId);

    expect(success).toBe(true);
    expect((service as any).todosSubject.value.length).toBe(0);
  });

  it('should not delete non-existent todo', () => {
    const success = service.deleteTodo('non-existent-id');

    expect(success).toBe(false);
  });

  it('should set filter and persist to localStorage', () => {
    service.setFilter('active');

    expect(service.currentFilter).toBe('active');
    expect(localStorageMock['todoFilter']).toBe('active');
  });

  it('should filter todos correctly', () => {
    const todos: Todo[] = [
      {
        id: '1',
        text: 'Active todo',
        completed: false,
        createdAt: new Date()
      },
      {
        id: '2',
        text: 'Completed todo',
        completed: true,
        createdAt: new Date()
      }
    ];

    const activeTodos = service.getFilteredTodos(todos, 'active');
    const completedTodos = service.getFilteredTodos(todos, 'completed');
    const allTodos = service.getFilteredTodos(todos, 'all');

    expect(activeTodos.length).toBe(1);
    expect(activeTodos[0].completed).toBe(false);

    expect(completedTodos.length).toBe(1);
    expect(completedTodos[0].completed).toBe(true);

    expect(allTodos.length).toBe(2);
  });

  it('should validate todo text correctly', () => {
    expect(service.validateTodoText('Valid todo')).toBe(true);
    expect(service.validateTodoText('   ')).toBe(false);
    expect(service.validateTodoText('')).toBe(false);
    expect(service.validateTodoText('a'.repeat(501))).toBe(false);
  });

  it('should return character limit', () => {
    expect(service.getCharacterLimit()).toBe(500);
  });

  it('should handle localStorage unavailability', () => {
    // Mock localStorage to throw error
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => { throw new Error('localStorage unavailable'); }),
        setItem: vi.fn(() => { throw new Error('localStorage unavailable'); }),
        removeItem: vi.fn(() => { throw new Error('localStorage unavailable'); })
      },
      writable: true
    });

    const newService = new TodoService();
    expect(newService.isStorageAvailable()).toBe(false);
    expect(newService.isUsingFallback()).toBe(true);
  });

  it('should rollback changes on storage failure', () => {
    service.addTodo('First todo');
    const initialTodos = [...(service as any).todosSubject.value];

    // Mock localStorage to fail on next write
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const success = service.addTodo('Second todo');

    expect(success).toBe(false);
    expect((service as any).todosSubject.value).toEqual(initialTodos);
  });

  it('should load filter from localStorage', () => {
    localStorageMock['todoFilter'] = 'completed';

    const newService = new TodoService();
    expect(newService.currentFilter).toBe('completed');
  });

  it('should handle invalid filter in localStorage', () => {
    localStorageMock['todoFilter'] = 'invalid-filter';

    const newService = new TodoService();
    expect(newService.currentFilter).toBe('all');
  });

  it('should handle storage errors gracefully during filter save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage error');
    });

    const initialFilter = service.currentFilter;
    service.setFilter('active');

    // Should rollback to original filter
    expect(service.currentFilter).toBe(initialFilter);
  });

  it('should parse dates correctly when loading from storage', () => {
    const testDate = new Date('2023-01-01');
    const testTodos: Todo[] = [
      {
        id: '1',
        text: 'Test todo',
        completed: false,
        createdAt: testDate
      }
    ];

    localStorageMock['todos'] = JSON.stringify(testTodos);

    const newService = new TodoService();
    const loadedTodo = newService.currentTodos[0];
    expect(loadedTodo.createdAt).toBeInstanceOf(Date);
    expect(loadedTodo.createdAt.getTime()).toBe(testDate.getTime());
  });

  it('should handle non-array data in localStorage', () => {
    localStorageMock['todos'] = JSON.stringify({ invalid: 'data' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const newService = new TodoService();
    expect(newService.currentTodos).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});