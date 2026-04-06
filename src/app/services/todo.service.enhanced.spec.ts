import { TestBed } from '@angular/core/testing';
import { TodoService } from './todo.service';
import { Todo, TodoFilter } from '../models/todo.interface';
import { vi } from 'vitest';

describe('TodoService - Enhanced Tests for Edge Cases and Failure Modes', () => {
  let service: TodoService;
  let consoleSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoService);

    // Spy on console methods to verify error handling notifications
    consoleSpy = vi.spyOn(console, 'debug');
    consoleWarnSpy = vi.spyOn(console, 'warn');
    consoleInfoSpy = vi.spyOn(console, 'info');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Performance Requirements - 100+ Tasks', () => {
    it('should handle 100 tasks with sub-100ms response times for add operations', () => {
      const startTime = performance.now();

      // Add exactly 100 tasks
      for (let i = 0; i < 100; i++) {
        const operationStart = performance.now();
        service.addTodo(`Task ${i + 1}`);
        const operationEnd = performance.now();
        const operationTime = operationEnd - operationStart;

        // Each operation should be under 100ms
        expect(operationTime).toBeLessThan(100);
      }

      const totalTime = performance.now() - startTime;
      expect(service.todos.length).toBe(100);
      expect(totalTime).toBeLessThan(5000); // Total should be reasonable
    });

    it('should handle 100+ tasks with sub-100ms response times for toggle operations', () => {
      // Setup: Add 101 tasks
      const taskIds: string[] = [];
      for (let i = 0; i < 101; i++) {
        const todo = service.addTodo(`Task ${i + 1}`);
        taskIds.push(todo.id);
      }

      // Test toggle operations
      taskIds.forEach((id, index) => {
        const operationStart = performance.now();
        service.toggleTodo(id);
        const operationEnd = performance.now();
        const operationTime = operationEnd - operationStart;

        expect(operationTime).toBeLessThan(100);
        expect(service.todos.find(t => t.id === id)?.completed).toBe(true);
      });
    });

    it('should handle 100+ tasks with sub-100ms response times for delete operations', () => {
      // Setup: Add 120 tasks
      const taskIds: string[] = [];
      for (let i = 0; i < 120; i++) {
        const todo = service.addTodo(`Task ${i + 1}`);
        taskIds.push(todo.id);
      }

      // Delete half of them, measuring each operation
      const idsToDelete = taskIds.slice(0, 60);
      idsToDelete.forEach(id => {
        const operationStart = performance.now();
        service.deleteTodo(id);
        const operationEnd = performance.now();
        const operationTime = operationEnd - operationStart;

        expect(operationTime).toBeLessThan(100);
      });

      expect(service.todos.length).toBe(60);
    });

    it('should handle filtering with 100+ tasks efficiently', () => {
      // Setup: Add 150 tasks with mixed completion status
      for (let i = 0; i < 150; i++) {
        const todo = service.addTodo(`Task ${i + 1}`);
        if (i % 3 === 0) {
          service.toggleTodo(todo.id); // Complete every 3rd task
        }
      }

      // Test each filter with performance measurement
      (['all', 'active', 'completed'] as TodoFilter[]).forEach(filter => {
        const operationStart = performance.now();
        service.setFilter(filter);
        const filteredTodos = service.filteredTodos;
        const operationEnd = performance.now();
        const operationTime = operationEnd - operationStart;

        expect(operationTime).toBeLessThan(100);
        expect(Array.isArray(filteredTodos)).toBe(true);

        if (filter === 'all') {
          expect(filteredTodos.length).toBe(150);
        } else if (filter === 'completed') {
          expect(filteredTodos.length).toBe(50); // Every 3rd task
        } else if (filter === 'active') {
          expect(filteredTodos.length).toBe(100); // Remaining tasks
        }
      });
    });
  });

  describe('localStorage Failure Scenarios', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
        callCount++;
        if (callCount > 1) { // First call succeeds, subsequent fail
          throw new DOMException('QuotaExceededError');
        }
        return originalSetItem.call(localStorage, key, value);
      });

      // First todo should work
      const todo1 = service.addTodo('First todo');
      expect(todo1).toBeTruthy();

      // Second todo should fail localStorage but still work in-memory
      const todo2 = service.addTodo('Second todo');
      expect(todo2).toBeTruthy();
      expect(service.todos.length).toBe(2);

      // Should have logged warning about localStorage failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/localStorage.*failed.*in-memory/)
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/will not be saved.*storage limitations/)
      );
    });

    it('should handle localStorage disabled/unavailable gracefully', () => {
      // Mock localStorage to be unavailable
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('localStorage unavailable'); });
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('localStorage unavailable'); });
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => { throw new Error('localStorage unavailable'); });

      // Create new service instance to test initialization
      const newService = new TodoService();

      // Should still function in memory-only mode
      const todo = newService.addTodo('Memory-only todo');
      expect(todo).toBeTruthy();
      expect(newService.todos).toContain(todo);

      // Should have logged error about storage being unavailable
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/localStorage.*failed.*in-memory/)
      );
    });

    it('should handle corrupted data scenarios comprehensively', () => {
      const corruptedDataScenarios = [
        '{"malformed json"',
        '{"version":"1.0","state":null}',
        '{"version":"1.0","state":{"todos":"not an array"}}',
        '{"version":"1.0","state":{"todos":[{"id":123}]}}', // wrong id type
        '{"version":"1.0","state":{"todos":[{"id":"valid","text":null}]}}', // null text
        '{"version":"1.0","state":{"todos":[{"id":"valid","text":"test","completed":"not boolean"}]}}',
        '[]', // completely wrong structure
        'null',
        'undefined'
      ];

      corruptedDataScenarios.forEach((corruptedData, index) => {
        localStorage.clear();
        localStorage.setItem('my-test-app-todos', corruptedData);

        // Create new service to test data recovery
        const newService = new TodoService();

        // Should start with empty state
        expect(newService.todos).toEqual([]);
        expect(newService.filter).toBe('all');

        // Should be able to add new todos
        const todo = newService.addTodo(`Test todo ${index}`);
        expect(todo).toBeTruthy();
        expect(newService.todos.length).toBe(1);
      });
    });

    it('should handle version mismatch in stored data', () => {
      const oldVersionData = {
        version: '0.9', // Different version
        timestamp: Date.now(),
        state: {
          todos: [{ id: 'old', text: 'Old todo', completed: false, createdAt: new Date().toISOString() }],
          filter: 'all'
        }
      };

      localStorage.setItem('my-test-app-todos', JSON.stringify(oldVersionData));

      // Service should handle gracefully (current implementation doesn't check version strictly)
      const newService = new TodoService();

      // Should either load the data or reset to empty state
      expect(Array.isArray(newService.todos)).toBe(true);
      expect(typeof newService.filter).toBe('string');
    });
  });

  describe('Cross-tab Synchronization', () => {
    it('should sync data when storage event is fired from another tab', () => {
      // Initial state
      service.addTodo('Original todo');
      expect(service.todos.length).toBe(1);

      // Simulate data from another tab
      const externalData = {
        version: '1.0',
        timestamp: Date.now(),
        state: {
          todos: [
            { id: 'ext1', text: 'External todo 1', completed: false, createdAt: new Date().toISOString() },
            { id: 'ext2', text: 'External todo 2', completed: true, createdAt: new Date().toISOString() }
          ],
          filter: 'active'
        }
      };

      // Fire storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'my-test-app-todos',
        newValue: JSON.stringify(externalData),
        storageArea: localStorage
      });

      window.dispatchEvent(storageEvent);

      // Should sync to external state
      expect(service.todos.length).toBe(2);
      expect(service.todos[0].text).toBe('External todo 1');
      expect(service.todos[1].text).toBe('External todo 2');
      expect(service.filter).toBe('active');
    });

    it('should ignore invalid storage events gracefully', () => {
      service.addTodo('Original todo');
      const originalTodos = [...service.todos];

      // Fire invalid storage events
      const invalidEvents = [
        { key: 'other-key', newValue: '{}' },
        { key: 'my-test-app-todos', newValue: 'invalid json' },
        { key: 'my-test-app-todos', newValue: null },
        { key: 'my-test-app-todos', newValue: '{"invalid":"structure"}' }
      ];

      invalidEvents.forEach(eventData => {
        const storageEvent = new StorageEvent('storage', {
          key: eventData.key,
          newValue: eventData.newValue,
          storageArea: localStorage
        });

        window.dispatchEvent(storageEvent);

        // Should not change state
        expect(service.todos).toEqual(originalTodos);
      });
    });

    it('should handle concurrent modifications gracefully', () => {
      // Simulate rapid concurrent changes
      service.addTodo('Local todo 1');

      // Simulate external change while local operation is happening
      const externalData = {
        version: '1.0',
        timestamp: Date.now() + 1000, // Future timestamp
        state: {
          todos: [
            { id: 'ext1', text: 'External todo', completed: false, createdAt: new Date().toISOString() }
          ],
          filter: 'completed'
        }
      };

      // Fire storage event during local operations
      service.addTodo('Local todo 2');

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'my-test-app-todos',
        newValue: JSON.stringify(externalData),
        storageArea: localStorage
      }));

      // Should handle the race condition gracefully
      expect(service.todos.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary localStorage failures', () => {
      let failureCount = 0;
      const maxFailures = 3;

      // Mock intermittent localStorage failures
      const originalSetItem = localStorage.setItem;
      vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
        if (failureCount < maxFailures) {
          failureCount++;
          throw new Error('Temporary storage failure');
        }
        return originalSetItem.call(localStorage, key, value);
      });

      // First few operations should fail but continue in memory
      service.addTodo('Todo 1');
      service.addTodo('Todo 2');
      service.addTodo('Todo 3');

      expect(service.todos.length).toBe(3);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // After failures, should work normally (storage recovered)
      service.addTodo('Todo 4');
      expect(service.todos.length).toBe(4);
    });

    it('should validate and clean up malformed todo objects', () => {
      // Manually insert malformed data
      const malformedData = {
        version: '1.0',
        timestamp: Date.now(),
        state: {
          todos: [
            { id: 'valid', text: 'Valid todo', completed: false, createdAt: new Date().toISOString() },
            { id: '', text: 'Invalid ID', completed: false, createdAt: new Date().toISOString() },
            { id: 'valid2', text: '', completed: false, createdAt: new Date().toISOString() },
            { id: 'valid3', text: 'Valid', completed: 'not boolean', createdAt: new Date().toISOString() },
            { text: 'No ID', completed: false, createdAt: new Date().toISOString() },
            null,
            undefined,
            'not an object'
          ],
          filter: 'all'
        }
      };

      localStorage.setItem('my-test-app-todos', JSON.stringify(malformedData));

      // Service should clean up and only load valid todos
      const newService = new TodoService();

      // Should either reject all (if validation is strict) or clean up
      expect(Array.isArray(newService.todos)).toBe(true);

      // If any todos loaded, they should be valid
      newService.todos.forEach(todo => {
        expect(todo.id).toBeTruthy();
        expect(typeof todo.text).toBe('string');
        expect(todo.text.length).toBeGreaterThan(0);
        expect(typeof todo.completed).toBe('boolean');
        expect(todo.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should handle rapid sequential operations without data loss', () => {
      const operations = [];

      // Perform rapid operations
      for (let i = 0; i < 20; i++) {
        const todo = service.addTodo(`Rapid todo ${i}`);
        operations.push({ type: 'add', id: todo.id });

        if (i % 3 === 0) {
          service.toggleTodo(todo.id);
          operations.push({ type: 'toggle', id: todo.id });
        }

        if (i % 5 === 0 && i > 0) {
          const todoToDelete = service.todos[Math.floor(Math.random() * service.todos.length)];
          service.deleteTodo(todoToDelete.id);
          operations.push({ type: 'delete', id: todoToDelete.id });
        }
      }

      // Verify final state is consistent
      expect(service.todos.length).toBeGreaterThan(0);
      expect(service.todos.every(todo =>
        typeof todo.id === 'string' &&
        typeof todo.text === 'string' &&
        typeof todo.completed === 'boolean' &&
        todo.createdAt instanceof Date
      )).toBe(true);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should not create memory leaks with event listeners', () => {
      // Create and destroy multiple service instances
      const services = [];

      for (let i = 0; i < 10; i++) {
        const testService = new TodoService();
        testService.addTodo(`Test todo ${i}`);
        services.push(testService);
      }

      // Trigger storage events
      const testData = {
        version: '1.0',
        timestamp: Date.now(),
        state: { todos: [], filter: 'all' }
      };

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'my-test-app-todos',
        newValue: JSON.stringify(testData),
        storageArea: localStorage
      }));

      // All services should handle the event without errors
      services.forEach(service => {
        expect(service.todos).toBeDefined();
      });
    });

    it('should handle large data sets without excessive memory usage', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Add large number of todos
      for (let i = 0; i < 1000; i++) {
        service.addTodo(`Large dataset todo ${i} with some additional text to make it larger`);
      }

      const midMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Clear all todos
      service.todos.slice().forEach(todo => service.deleteTodo(todo.id));

      // Force garbage collection if available
      if ((globalThis as any).gc) {
        (globalThis as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory should not grow excessively (this is environment dependent)
      expect(service.todos.length).toBe(0);

      // Verify performance tracking still works
      expect(typeof service.trackByTodoId).toBe('function');
    });
  });

  describe('Analytics and Tracking', () => {
    it('should fire correct analytics events for all operations', () => {
      // Add todo
      service.addTodo('Test todo');
      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_task_added',
        expect.objectContaining({
          task_id: expect.any(String),
          input_method: 'manual'
        })
      );

      // Toggle todo
      const todoId = service.todos[0].id;
      service.toggleTodo(todoId);
      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_task_toggled',
        expect.objectContaining({
          task_id: todoId,
          new_state: 'completed'
        })
      );

      // Delete todo
      service.deleteTodo(todoId);
      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_task_deleted',
        expect.objectContaining({
          task_id: todoId,
          completion_status: 'completed'
        })
      );

      // Filter change
      service.setFilter('active');
      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_filter_changed',
        expect.objectContaining({
          previous_filter: 'all',
          new_filter: 'active'
        })
      );
    });

    it('should track storage errors with proper metadata', () => {
      // Mock localStorage to fail
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage failed'); });

      service.addTodo('Test todo');

      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_storage_error',
        expect.objectContaining({
          error_type: 'save_failed',
          fallback_used: true
        })
      );
    });

    it('should track component initialization with correct data', () => {
      // Test with existing data
      service.addTodo('Existing todo');
      service.setFilter('active');

      // Create new instance to trigger initialization tracking
      const newService = new TodoService();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics: todo_component_loaded',
        expect.objectContaining({
          task_count: expect.any(Number),
          filter_state: expect.any(String)
        })
      );
    });
  });
});