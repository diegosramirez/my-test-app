import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService();
  });

  describe('addTask', () => {
    it('should add a task with trimmed title', () => {
      service.addTask('  Buy groceries  ');
      expect(service.tasks().length).toBe(1);
      expect(service.tasks()[0].title).toBe('Buy groceries');
      expect(service.tasks()[0].completed).toBe(false);
    });

    it('should not add task with empty string', () => {
      service.addTask('');
      expect(service.tasks().length).toBe(0);
    });

    it('should not add task with whitespace only', () => {
      service.addTask('   ');
      expect(service.tasks().length).toBe(0);
    });

    it('should assign unique incrementing IDs', () => {
      service.addTask('Task 1');
      service.addTask('Task 2');
      service.addTask('Task 3');
      const ids = service.tasks().map(t => t.id);
      expect(ids[0]).toBeLessThan(ids[1]);
      expect(ids[1]).toBeLessThan(ids[2]);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('toggleTask', () => {
    it('should toggle completed status', () => {
      service.addTask('Test');
      const id = service.tasks()[0].id;
      expect(service.tasks()[0].completed).toBe(false);

      service.toggleTask(id);
      expect(service.tasks()[0].completed).toBe(true);

      service.toggleTask(id);
      expect(service.tasks()[0].completed).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should remove the task by id', () => {
      service.addTask('Task 1');
      service.addTask('Task 2');
      const id = service.tasks()[0].id;
      service.deleteTask(id);
      expect(service.tasks().length).toBe(1);
      expect(service.tasks()[0].title).toBe('Task 2');
    });
  });

  describe('activeCount', () => {
    it('should count only active tasks', () => {
      service.addTask('Task 1');
      service.addTask('Task 2');
      service.addTask('Task 3');
      expect(service.activeCount()).toBe(3);

      service.toggleTask(service.tasks()[0].id);
      expect(service.activeCount()).toBe(2);
    });
  });

  describe('hasCompleted', () => {
    it('should return false when no completed tasks', () => {
      service.addTask('Task');
      expect(service.hasCompleted()).toBe(false);
    });

    it('should return true when completed tasks exist', () => {
      service.addTask('Task');
      service.toggleTask(service.tasks()[0].id);
      expect(service.hasCompleted()).toBe(true);
    });
  });

  describe('filteredTasks', () => {
    beforeEach(() => {
      service.addTask('Active task');
      service.addTask('Completed task');
      service.toggleTask(service.tasks()[1].id);
    });

    it('should return all tasks for "all" filter', () => {
      service.setFilter('all');
      expect(service.filteredTasks().length).toBe(2);
    });

    it('should return only active tasks for "active" filter', () => {
      service.setFilter('active');
      expect(service.filteredTasks().length).toBe(1);
      expect(service.filteredTasks()[0].title).toBe('Active task');
    });

    it('should return only completed tasks for "completed" filter', () => {
      service.setFilter('completed');
      expect(service.filteredTasks().length).toBe(1);
      expect(service.filteredTasks()[0].title).toBe('Completed task');
    });
  });

  describe('clearCompleted', () => {
    it('should remove all completed tasks', () => {
      service.addTask('Active');
      service.addTask('Done');
      service.toggleTask(service.tasks()[1].id);
      service.clearCompleted();
      expect(service.tasks().length).toBe(1);
      expect(service.tasks()[0].title).toBe('Active');
    });

    it('should not affect active count', () => {
      service.addTask('Active');
      service.addTask('Done');
      service.toggleTask(service.tasks()[1].id);
      expect(service.activeCount()).toBe(1);
      service.clearCompleted();
      expect(service.activeCount()).toBe(1);
    });
  });

  describe('setFilter', () => {
    it('should update the active filter', () => {
      expect(service.activeFilter()).toBe('all');
      service.setFilter('active');
      expect(service.activeFilter()).toBe('active');
      service.setFilter('completed');
      expect(service.activeFilter()).toBe('completed');
    });
  });
});
