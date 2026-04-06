import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TaskService } from './task.service';
import { Task } from '../models/task.interface';

describe('TaskService', () => {
  let service: TaskService;
  let mockLocalStorage: { [key: string]: string };
  let getItemSpy: any;
  let setItemSpy: any;
  let removeItemSpy: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};

    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] || null;
    });

    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
  });

  afterEach(() => {
    // Clean up mock localStorage
    mockLocalStorage = {};
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Task CRUD Operations', () => {
    it('should add a new task', () => {
      const taskText = 'Test task';
      const result = service.addTask(taskText);

      expect(result.success).toBe(true);

      const tasks = service.getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].text).toBe(taskText);
      expect(tasks[0].status).toBe('active');
      expect(tasks[0].id).toBeDefined();
      expect(tasks[0].createdAt).toBeDefined();
    });

    it('should not add empty or whitespace-only tasks', () => {
      const result1 = service.addTask('');
      const result2 = service.addTask('   ');

      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Task text cannot be empty');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Task text cannot be empty');

      const tasks = service.getTasks();
      expect(tasks.length).toBe(0);
    });

    it('should toggle task completion status', () => {
      // Add a task first
      service.addTask('Test task');
      const tasks = service.getTasks();
      const taskId = tasks[0].id;

      // Toggle to completed
      const result1 = service.toggleTask(taskId);
      expect(result1.success).toBe(true);

      const updatedTasks1 = service.getTasks();
      expect(updatedTasks1[0].status).toBe('completed');

      // Toggle back to active
      const result2 = service.toggleTask(taskId);
      expect(result2.success).toBe(true);

      const updatedTasks2 = service.getTasks();
      expect(updatedTasks2[0].status).toBe('active');
    });

    it('should handle toggle task for non-existent task', () => {
      const result = service.toggleTask('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });

    it('should delete a task', () => {
      // Add a task first
      service.addTask('Test task');
      const tasks = service.getTasks();
      const taskId = tasks[0].id;

      // Delete the task
      const result = service.deleteTask(taskId);
      expect(result.success).toBe(true);

      const updatedTasks = service.getTasks();
      expect(updatedTasks.length).toBe(0);
    });

    it('should handle delete for non-existent task', () => {
      const result = service.deleteTask('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });

    it('should clear completed tasks', () => {
      // Add multiple tasks
      service.addTask('Task 1');
      service.addTask('Task 2');
      service.addTask('Task 3');

      // Mark some as completed
      const tasks = service.getTasks();
      service.toggleTask(tasks[0].id);
      service.toggleTask(tasks[2].id);

      // Clear completed tasks
      const result = service.clearCompleted();
      expect(result.success).toBe(true);

      const remainingTasks = service.getTasks();
      expect(remainingTasks.length).toBe(1);
      expect(remainingTasks[0].text).toBe('Task 2');
      expect(remainingTasks[0].status).toBe('active');
    });
  });

  describe('localStorage Integration', () => {
    it('should load tasks from localStorage on initialization', () => {
      const storedTasks: Task[] = [
        {
          id: 'test-id',
          text: 'Stored task',
          status: 'active',
          createdAt: new Date('2024-01-01')
        }
      ];

      mockLocalStorage['todo-app-tasks'] = JSON.stringify(storedTasks);

      // Create new service instance to trigger loading
      const newService = new TaskService();

      const loadedTasks = newService.getTasks();
      expect(loadedTasks.length).toBe(1);
      expect(loadedTasks[0].text).toBe('Stored task');
      expect(loadedTasks[0].status).toBe('active');
    });

    it('should handle corrupted JSON data gracefully', () => {
      mockLocalStorage['todo-app-tasks'] = 'invalid-json';

      // Create new service instance to trigger loading
      const newService = new TaskService();

      const tasks = newService.getTasks();
      expect(tasks.length).toBe(0);
    });

    it('should validate and sanitize loaded task data', () => {
      const invalidTasks = [
        { id: 'valid-id', text: 'Valid task', status: 'active', createdAt: new Date() },
        { id: 'invalid-1' }, // Missing required fields
        { id: 'invalid-2', text: 'Invalid status', status: 'invalid', createdAt: new Date() },
        null, // Null entry
        'invalid-string' // String entry
      ];

      mockLocalStorage['todo-app-tasks'] = JSON.stringify(invalidTasks);

      // Create new service instance to trigger loading
      const newService = new TaskService();

      const validTasks = newService.getTasks();
      expect(validTasks.length).toBe(1);
      expect(validTasks[0].text).toBe('Valid task');
    });

    it('should save tasks to localStorage', () => {
      service.addTask('Test task');

      expect(setItemSpy).toHaveBeenCalledWith('todo-app-tasks', expect.any(String));

      const savedData = mockLocalStorage['todo-app-tasks'];
      const parsedTasks = JSON.parse(savedData);
      expect(parsedTasks.length).toBe(1);
      expect(parsedTasks[0].text).toBe('Test task');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage unavailable', () => {
      // Mock localStorage to throw error
      setItemSpy.mockImplementation(() => { throw new Error('SecurityError'); });
      getItemSpy.mockImplementation(() => { throw new Error('SecurityError'); });

      // Create new service instance
      const newService = new TaskService();

      expect(newService.isUsingFallback()).toBe(true);

      // Operations should still work in memory
      const result = newService.addTask('Test task');
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);

      const tasks = newService.getTasks();
      expect(tasks.length).toBe(1);
    });

    it('should handle quota exceeded error', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      setItemSpy.mockImplementation(() => { throw quotaError; });

      const result = service.addTask('Test task');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('should handle security error gracefully', () => {
      // Mock localStorage.setItem to throw SecurityError
      const securityError = new Error('SecurityError');
      securityError.name = 'SecurityError';
      setItemSpy.mockImplementation(() => { throw securityError; });

      const result = service.addTask('Test task');

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Task Observable', () => {
    it('should emit updated tasks when tasks change', () => {
      return new Promise<void>((resolve) => {
        let emissionCount = 0;

        service.tasks$.subscribe(tasks => {
          emissionCount++;

          if (emissionCount === 1) {
            // Initial emission (empty)
            expect(tasks.length).toBe(0);
          } else if (emissionCount === 2) {
            // After adding task
            expect(tasks.length).toBe(1);
            expect(tasks[0].text).toBe('Test task');
            resolve();
          }
        });

        service.addTask('Test task');
      });
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs for tasks', () => {
      service.addTask('Task 1');
      service.addTask('Task 2');

      const tasks = service.getTasks();
      expect(tasks[0].id).not.toBe(tasks[1].id);
      expect(tasks[0].id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(tasks[1].id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });
  });
});