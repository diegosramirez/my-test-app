import { TestBed } from '@angular/core/testing';
import { TodoService } from './todo.service';
import { Todo, TodoFilter } from '../models/todo.interface';
import { vi } from 'vitest';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoService);
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addTodo', () => {
    it('should add a new todo', () => {
      const todoText = 'Test todo';
      const todo = service.addTodo(todoText);

      expect(todo).toBeTruthy();
      expect(todo.text).toBe(todoText);
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeTruthy();
      expect(todo.createdAt).toBeInstanceOf(Date);
      expect(service.todos).toContain(todo);
    });

    it('should reject empty text', () => {
      expect(() => service.addTodo('')).toThrow('Task text must be between 1-100 characters');
      expect(() => service.addTodo('   ')).toThrow('Task text must be between 1-100 characters');
    });

    it('should reject text longer than 100 characters', () => {
      const longText = 'a'.repeat(101);
      expect(() => service.addTodo(longText)).toThrow('Task text must be between 1-100 characters');
    });

    it('should trim whitespace from todo text', () => {
      const todoText = '  Test todo  ';
      const todo = service.addTodo(todoText);
      expect(todo.text).toBe('Test todo');
    });

    it('should generate unique IDs for different todos', () => {
      const todo1 = service.addTodo('Todo 1');
      const todo2 = service.addTodo('Todo 2');
      expect(todo1.id).not.toBe(todo2.id);
    });
  });

  describe('toggleTodo', () => {
    it('should toggle todo completion status', () => {
      const todo = service.addTodo('Test todo');
      expect(todo.completed).toBe(false);

      service.toggleTodo(todo.id);
      expect(service.todos.find(t => t.id === todo.id)?.completed).toBe(true);

      service.toggleTodo(todo.id);
      expect(service.todos.find(t => t.id === todo.id)?.completed).toBe(false);
    });

    it('should handle non-existent todo ID gracefully', () => {
      const initialTodos = service.todos.length;
      service.toggleTodo('non-existent-id');
      expect(service.todos.length).toBe(initialTodos);
    });
  });

  describe('deleteTodo', () => {
    it('should delete a todo', () => {
      const todo = service.addTodo('Test todo');
      expect(service.todos).toContain(todo);

      service.deleteTodo(todo.id);
      expect(service.todos).not.toContain(todo);
    });

    it('should handle non-existent todo ID gracefully', () => {
      const todo = service.addTodo('Test todo');
      const initialLength = service.todos.length;

      service.deleteTodo('non-existent-id');
      expect(service.todos.length).toBe(initialLength);
    });
  });

  describe('setFilter', () => {
    it('should set filter correctly', () => {
      expect(service.filter).toBe('all');

      service.setFilter('active');
      expect(service.filter).toBe('active');

      service.setFilter('completed');
      expect(service.filter).toBe('completed');
    });
  });

  describe('filteredTodos', () => {
    let activeTodo: Todo;
    let completedTodo: Todo;

    beforeEach(() => {
      activeTodo = service.addTodo('Active todo');
      completedTodo = service.addTodo('Completed todo');
      service.toggleTodo(completedTodo.id);
    });

    it('should return all todos when filter is "all"', () => {
      service.setFilter('all');
      const filtered = service.filteredTodos;
      expect(filtered).toContain(activeTodo);
      expect(filtered).toContain(completedTodo);
      expect(filtered.length).toBe(2);
    });

    it('should return only active todos when filter is "active"', () => {
      service.setFilter('active');
      const filtered = service.filteredTodos;
      expect(filtered).toContain(activeTodo);
      expect(filtered).not.toContain(completedTodo);
      expect(filtered.length).toBe(1);
    });

    it('should return only completed todos when filter is "completed"', () => {
      service.setFilter('completed');
      const filtered = service.filteredTodos;
      expect(filtered).not.toContain(activeTodo);
      expect(filtered).toContain(completedTodo);
      expect(filtered.length).toBe(1);
    });
  });

  describe('clearCompleted', () => {
    it('should remove all completed todos', () => {
      const todo1 = service.addTodo('Todo 1');
      const todo2 = service.addTodo('Todo 2');
      const todo3 = service.addTodo('Todo 3');

      service.toggleTodo(todo2.id);
      service.toggleTodo(todo3.id);

      service.clearCompleted();

      expect(service.todos.length).toBe(1);
      expect(service.todos).toContain(todo1);
      expect(service.todos).not.toContain(todo2);
      expect(service.todos).not.toContain(todo3);
    });

    it('should handle case with no completed todos', () => {
      const todo = service.addTodo('Active todo');
      const initialLength = service.todos.length;

      service.clearCompleted();

      expect(service.todos.length).toBe(initialLength);
      expect(service.todos).toContain(todo);
    });
  });

  describe('localStorage integration', () => {
    it('should persist todos to localStorage', () => {
      const todo = service.addTodo('Persistent todo');

      // Create a new service instance to test persistence
      const newService = new TodoService();
      expect(newService.todos.length).toBe(1);
      expect(newService.todos[0].text).toBe('Persistent todo');
    });

    it('should persist filter state to localStorage', () => {
      service.setFilter('active');

      // Create a new service instance to test filter persistence
      const newService = new TodoService();
      expect(newService.filter).toBe('active');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Simulate corrupted data
      localStorage.setItem('my-test-app-todos', 'invalid json');

      const newService = new TodoService();
      expect(newService.todos).toEqual([]);
      expect(newService.filter).toBe('all');
    });

    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('localStorage disabled'); });

      const todo = service.addTodo('Test todo');
      expect(todo).toBeTruthy();
      expect(service.todos).toContain(todo);

      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });

  describe('performance', () => {
    it('should handle large number of todos efficiently', () => {
      const startTime = performance.now();

      // Add 1000 todos
      for (let i = 0; i < 1000; i++) {
        service.addTodo(`Todo ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 500ms)
      expect(duration).toBeLessThan(500);
      expect(service.todos.length).toBe(1000);
    });

    it('should provide efficient trackBy function', () => {
      const todo = service.addTodo('Test todo');
      const trackId = service.trackByTodoId(0, todo);

      expect(trackId).toBe(todo.id);
      expect(typeof trackId).toBe('string');
    });
  });

  describe('data validation', () => {
    it('should validate todo structure', () => {
      const todo = service.addTodo('Valid todo');

      expect(todo.id).toBeTruthy();
      expect(typeof todo.id).toBe('string');
      expect(typeof todo.text).toBe('string');
      expect(typeof todo.completed).toBe('boolean');
      expect(todo.createdAt).toBeInstanceOf(Date);
    });

    it('should handle edge case text lengths', () => {
      // Test minimum length (1 character)
      const minTodo = service.addTodo('a');
      expect(minTodo.text).toBe('a');

      // Test maximum length (100 characters)
      const maxText = 'a'.repeat(100);
      const maxTodo = service.addTodo(maxText);
      expect(maxTodo.text).toBe(maxText);
    });
  });
});