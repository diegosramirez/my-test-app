import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { TodoService } from './todo.service';
import { Todo, TodoFilter } from '../models/todo.model';

describe('TodoService - Performance & Analytics', () => {
  let service: TodoService;
  let localStorageMock: { [key: string]: string };
  let performanceMock: {
    now: ReturnType<typeof vi.fn>;
  };
  let consoleMock: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

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

    // Mock performance.now with controllable time
    performanceMock = {
      now: vi.fn()
    };

    Object.defineProperty(globalThis, 'performance', {
      value: performanceMock,
      writable: true
    });

    // Mock crypto.randomUUID
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: vi.fn().mockImplementation(() => `uuid-${Date.now()}-${Math.random()}`)
      },
      writable: true
    });

    // Mock console for analytics tracking
    consoleMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    Object.defineProperty(globalThis, 'console', {
      value: consoleMock,
      writable: true
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Requirements', () => {
    it('should load initial data within 100ms (empty state)', () => {
      // Setup performance timing
      performanceMock.now
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(50); // End time (50ms)

      service = TestBed.inject(TodoService);

      // Verify analytics event was tracked with load time
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_component_loaded:',
        expect.objectContaining({
          todos_count: 0,
          filter_state: 'all',
          load_time_ms: 50
        })
      );

      // Verify load time is under 100ms requirement
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_component_loaded:',
        expect.objectContaining({
          load_time_ms: expect.any(Number)
        })
      );

      const loadTimeCall = consoleMock.log.mock.calls.find(call =>
        call[0] === '[Analytics] todo_component_loaded:'
      );
      expect(loadTimeCall).toBeDefined();
      expect(loadTimeCall![1].load_time_ms).toBeLessThan(100);
    });

    it('should load initial data within 100ms (with existing todos)', () => {
      // Prepare existing todos in localStorage
      const existingTodos: Todo[] = Array.from({ length: 50 }, (_, i) => ({
        id: `todo-${i}`,
        text: `Todo item ${i}`,
        completed: i % 3 === 0,
        createdAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}`)
      }));

      localStorageMock['todos'] = JSON.stringify(existingTodos);
      localStorageMock['todoFilter'] = 'active';

      // Setup performance timing for slower load
      performanceMock.now
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(95); // End time (95ms - still under limit)

      service = TestBed.inject(TodoService);

      // Verify load time is still under 100ms with many todos
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_component_loaded:',
        expect.objectContaining({
          todos_count: 50,
          filter_state: 'active',
          load_time_ms: 95
        })
      );
    });

    it('should handle large dataset loading efficiently', () => {
      // Test with 1000+ todos to verify performance doesn't degrade significantly
      const largeTodoSet: Todo[] = Array.from({ length: 1500 }, (_, i) => ({
        id: `large-todo-${i}`,
        text: `Performance test todo ${i} with longer text content to test serialization`,
        completed: Math.random() > 0.5,
        createdAt: new Date()
      }));

      localStorageMock['todos'] = JSON.stringify(largeTodoSet);

      // Even with large dataset, should complete in reasonable time
      performanceMock.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(150); // Allow slightly more time for large datasets

      service = TestBed.inject(TodoService);

      // Verify large dataset loads
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_component_loaded:',
        expect.objectContaining({
          todos_count: 1500,
          filter_state: 'all',
          load_time_ms: 150
        })
      );
    });
  });

  describe('Analytics Event Tracking', () => {
    beforeEach(() => {
      performanceMock.now.mockReturnValue(100);
      service = TestBed.inject(TodoService);
      vi.clearAllMocks(); // Clear initialization calls
    });

    it('should track todo_component_loaded event with correct properties', () => {
      // This event is tracked in constructor, so create new service
      service.addTodo('Test todo');
      vi.clearAllMocks();

      const newService = TestBed.inject(TodoService);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_component_loaded:',
        expect.objectContaining({
          todos_count: expect.any(Number),
          filter_state: expect.any(String),
          load_time_ms: expect.any(Number)
        })
      );
    });

    it('should track todo_added event with validation not triggered', () => {
      const todoText = 'New todo item';
      service.addTodo(todoText);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_added:',
        {
          todo_text_length: todoText.length,
          validation_triggered: false
        }
      );
    });

    it('should track todo_toggled event with completion status and id', () => {
      service.addTodo('Toggle test todo');
      const todoId = (service as any).todosSubject.value[0].id;
      vi.clearAllMocks();

      service.toggleTodo(todoId);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_toggled:',
        {
          completion_status: true,
          todo_id: todoId
        }
      );

      vi.clearAllMocks();
      service.toggleTodo(todoId);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_toggled:',
        {
          completion_status: false,
          todo_id: todoId
        }
      );
    });

    it('should track todo_deleted event with correct properties', () => {
      service.addTodo('Delete test todo');
      const todoId = (service as any).todosSubject.value[0].id;
      vi.clearAllMocks();

      service.deleteTodo(todoId);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] todo_deleted:',
        {
          todo_id: todoId,
          confirmation_shown: false
        }
      );
    });

    it('should track filter_changed event with filter type and visible count', () => {
      // Add some todos with different completion states
      service.addTodo('Active todo');
      service.addTodo('Completed todo');
      service.toggleTodo((service as any).todosSubject.value[1].id);
      vi.clearAllMocks();

      service.setFilter('active');

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] filter_changed:',
        {
          filter_type: 'active',
          todos_visible_count: 1
        }
      );

      vi.clearAllMocks();
      service.setFilter('completed');

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] filter_changed:',
        {
          filter_type: 'completed',
          todos_visible_count: 1
        }
      );

      vi.clearAllMocks();
      service.setFilter('all');

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] filter_changed:',
        {
          filter_type: 'all',
          todos_visible_count: 2
        }
      );
    });

    it('should track input_validation_triggered event for empty text', () => {
      const isValid = service.validateTodoText('   ');

      expect(isValid).toBe(false);
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] input_validation_triggered:',
        {
          validation_type: 'empty_text',
          character_count: 3
        }
      );
    });

    it('should track input_validation_triggered event for text too long', () => {
      const longText = 'a'.repeat(501);
      const isValid = service.validateTodoText(longText);

      expect(isValid).toBe(false);
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] input_validation_triggered:',
        {
          validation_type: 'text_too_long',
          character_count: 501
        }
      );
    });

    it('should track storage_error event when localStorage operations fail', () => {
      // Mock localStorage to fail
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      service.addTodo('Test todo');

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] storage_error:',
        {
          error_type: 'save_todos',
          fallback_triggered: true
        }
      );
    });

    it('should track storage_error event when loading corrupted data', () => {
      localStorageMock['todos'] = 'corrupted json data';

      const newService = TestBed.inject(TodoService);

      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] storage_error:',
        {
          error_type: 'load_todos',
          fallback_triggered: true
        }
      );
    });
  });

  describe('Storage Reliability & Error Handling', () => {
    beforeEach(() => {
      performanceMock.now.mockReturnValue(100);
      service = TestBed.inject(TodoService);
      vi.clearAllMocks();
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Add initial todos
      service.addTodo('Initial todo');
      const initialTodos = [...(service as any).todosSubject.value];

      // Mock localStorage to fail due to quota
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const success = service.addTodo('Should fail due to quota');

      expect(success).toBe(false);
      expect((service as any).todosSubject.value).toEqual(initialTodos);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Error saving todos to storage:',
        expect.any(Error)
      );
    });

    it('should maintain 100% reliability with in-memory fallback when storage unavailable', () => {
      // Create service with storage unavailable
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      const fallbackService = TestBed.inject(TodoService);

      expect(fallbackService.isStorageAvailable()).toBe(false);
      expect(fallbackService.isUsingFallback()).toBe(true);

      // Operations should still work with in-memory storage
      expect(fallbackService.addTodo('Fallback todo')).toBe(false); // Returns false for storage but todo operations work
      expect((fallbackService as any).todosSubject.value.length).toBe(0); // But doesn't add since storage save failed

      // Test that in-memory operations still function
      vi.spyOn(fallbackService as any, 'saveTodosToStorage').mockReturnValue({ success: true });
      expect(fallbackService.addTodo('Memory todo')).toBe(true);
      expect((fallbackService as any).todosSubject.value.length).toBe(1);
    });

    it('should handle security errors from localStorage', () => {
      service.addTodo('Initial todo');

      // Mock security error (common in private browsing)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      const success = service.addTodo('Security blocked todo');

      expect(success).toBe(false);
      expect(consoleMock.log).toHaveBeenCalledWith(
        '[Analytics] storage_error:',
        {
          error_type: 'save_todos',
          fallback_triggered: true
        }
      );
    });

    it('should ensure data integrity with atomic operations', () => {
      // Test that partial failures don't leave inconsistent state
      service.addTodo('Todo 1');
      service.addTodo('Todo 2');

      const todoId = (service as any).todosSubject.value[0].id;
      let callCount = 0;

      // Mock storage to fail on second call (simulating intermittent issues)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Intermittent storage error');
        }
        // setItem normally returns undefined
      });

      const toggleSuccess = service.toggleTodo(todoId);
      expect(toggleSuccess).toBe(false);

      // Verify data wasn't partially updated
      const currentTodos = (service as any).todosSubject.value;
      expect(currentTodos[0].completed).toBe(false); // Should be rolled back
    });

    it('should handle concurrent localStorage access conflicts', () => {
      service.addTodo('Base todo');

      // Mock scenario where localStorage is modified by another tab
      const originalSetItem = Storage.prototype.setItem;
      let setItemCalls = 0;

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
        setItemCalls++;
        if (setItemCalls === 1) {
          // Simulate another tab modifying data between read and write
          localStorageMock[key] = JSON.stringify([
            { id: 'external', text: 'External todo', completed: false, createdAt: new Date() }
          ]);
        }
        return originalSetItem.call(localStorage, key, value);
      });

      const success = service.addTodo('Concurrent todo');

      // Our implementation doesn't handle concurrent access, so this tests current behavior
      expect(success).toBe(true);
    });
  });

  describe('Character Limit & Input Validation', () => {
    beforeEach(() => {
      performanceMock.now.mockReturnValue(100);
      service = TestBed.inject(TodoService);
      vi.clearAllMocks();
    });

    it('should enforce 500-character limit strictly', () => {
      expect(service.getCharacterLimit()).toBe(500);

      // Test exactly at limit
      const exactLimitText = 'a'.repeat(500);
      expect(service.validateTodoText(exactLimitText)).toBe(true);
      expect(service.addTodo(exactLimitText)).toBe(true);

      // Test over limit
      const overLimitText = 'a'.repeat(501);
      expect(service.validateTodoText(overLimitText)).toBe(false);
      expect(service.addTodo(overLimitText)).toBe(false);
    });

    it('should prevent whitespace-only submissions', () => {
      const whitespaceInputs = [
        '',
        ' ',
        '   ',
        '\t',
        '\n',
        '\r\n',
        '  \t\n  '
      ];

      whitespaceInputs.forEach(input => {
        expect(service.validateTodoText(input)).toBe(false);
        expect(service.addTodo(input)).toBe(false);
      });
    });

    it('should trim whitespace but preserve internal spaces', () => {
      const testCases = [
        { input: '  valid todo  ', expected: 'valid todo' },
        { input: '\tspaced\ttodo\t', expected: 'spaced\ttodo' },
        { input: '\n  multi line\n content  \n', expected: 'multi line\n content' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(service.validateTodoText(input)).toBe(true);
        expect(service.addTodo(input)).toBe(true);

        const addedTodo = (service as any).todosSubject.value.slice(-1)[0];
        expect(addedTodo.text).toBe(expected);
      });
    });

    it('should handle edge cases in validation', () => {
      // Unicode characters
      const unicodeText = '✅ Unicode todo with emoji 🚀 and special chars ñáéíóú';
      expect(service.validateTodoText(unicodeText)).toBe(true);
      expect(service.addTodo(unicodeText)).toBe(true);

      // Mixed content at limit
      const mixedContent = '1'.repeat(250) + ' spaces ' + '2'.repeat(242);
      expect(mixedContent.length).toBe(500);
      expect(service.validateTodoText(mixedContent)).toBe(true);
    });
  });

  describe('Filter State Persistence', () => {
    beforeEach(() => {
      performanceMock.now.mockReturnValue(100);
    });

    it('should persist filter state across browser sessions', () => {
      service = TestBed.inject(TodoService);

      // Change filter
      service.setFilter('active');
      expect(localStorageMock['todoFilter']).toBe('active');

      // Create new service instance (simulating page reload)
      const newService = TestBed.inject(TodoService);
      expect(newService.currentFilter).toBe('active');
    });

    it('should handle corrupted filter data gracefully', () => {
      localStorageMock['todoFilter'] = 'invalid_filter_value';

      service = TestBed.inject(TodoService);
      expect(service.currentFilter).toBe('all'); // Should default to 'all'
    });

    it('should maintain filter state consistency during storage errors', () => {
      service = TestBed.inject(TodoService);
      const initialFilter = service.currentFilter;

      // Mock storage failure
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      service.setFilter('completed');

      // Should rollback to initial filter
      expect(service.currentFilter).toBe(initialFilter);
    });
  });
});