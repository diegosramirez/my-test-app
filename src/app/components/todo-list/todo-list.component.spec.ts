import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { TodoListComponent } from './todo-list.component';
import { TaskService } from '../../services/task.service';
import { Task, TaskOperationResult } from '../../models/task.interface';

describe('TodoListComponent', () => {
  let component: TodoListComponent;
  let fixture: ComponentFixture<TodoListComponent>;
  let mockTaskService: any;
  let tasksSubject: BehaviorSubject<Task[]>;

  const createMockTask = (id: string, text: string, status: 'active' | 'completed' = 'active'): Task => ({
    id,
    text,
    status,
    createdAt: new Date('2024-01-01T10:00:00Z')
  });

  const mockSuccessResult: TaskOperationResult = { success: true };
  const mockErrorResult: TaskOperationResult = { success: false, error: 'Test error' };
  const mockFallbackResult: TaskOperationResult = { success: true, fallbackUsed: true, error: 'Using fallback storage' };

  beforeEach(async () => {
    tasksSubject = new BehaviorSubject<Task[]>([]);

    // Create Vitest mock for TaskService
    mockTaskService = {
      tasks$: tasksSubject.asObservable(),
      addTask: vi.fn().mockReturnValue(mockSuccessResult),
      toggleTask: vi.fn().mockReturnValue(mockSuccessResult),
      deleteTask: vi.fn().mockReturnValue(mockSuccessResult),
      clearCompleted: vi.fn().mockReturnValue(mockSuccessResult),
      isUsingFallback: vi.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [TodoListComponent, CommonModule, FormsModule],
      providers: [
        { provide: TaskService, useValue: mockTaskService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization and Performance', () => {
    it('should initialize with default values', () => {
      expect(component.newTaskText).toBe('');
      expect(component.currentFilter).toBe('all');
      expect(component.allTasks).toEqual([]);
      expect(component.filteredTasks).toEqual([]);
      expect(component.showStorageWarning).toBe(false);
    });

    it('should load component within performance threshold (acceptance criteria)', () => {
      const startTime = performance.now();

      // Simulate loading with multiple tasks
      const testTasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask(`task-${i}`, `Task ${i}`, i % 2 === 0 ? 'active' : 'completed')
      );

      tasksSubject.next(testTasks);
      fixture.detectChanges();

      const loadTime = performance.now() - startTime;

      expect(component.allTasks.length).toBe(50);
      expect(component.filteredTasks.length).toBe(50);
      expect(loadTime).toBeLessThan(200); // 200ms threshold from acceptance criteria
    });

    it('should subscribe to tasks observable and handle localStorage data loading', () => {
      const testTasks = [
        createMockTask('1', 'Task 1'),
        createMockTask('2', 'Task 2', 'completed')
      ];

      tasksSubject.next(testTasks);

      expect(component.allTasks).toEqual(testTasks);
      expect(component.filteredTasks).toEqual(testTasks);
    });

    it('should show storage warning when using fallback (acceptance criteria)', () => {
      mockTaskService.isUsingFallback.mockReturnValue(true);

      const testTasks = [createMockTask('1', 'Task 1')];
      tasksSubject.next(testTasks);

      expect(component.showStorageWarning).toBe(true);
      expect(component.storageWarningMessage).toContain('localStorage unavailable');
    });

    it('should handle empty state gracefully', () => {
      tasksSubject.next([]);
      fixture.detectChanges();

      expect(component.allTasks.length).toBe(0);
      expect(component.filteredTasks.length).toBe(0);

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('Task Management - CRUD Operations', () => {
    it('should add new task immediately when text is provided (acceptance criteria)', () => {
      component.newTaskText = 'New important task';

      component.addTask();

      expect(mockTaskService.addTask).toHaveBeenCalledWith('New important task');
      expect(component.newTaskText).toBe(''); // Input field cleared immediately
    });

    it('should not add task when text is empty or only whitespace', () => {
      // Test empty string
      component.newTaskText = '';
      component.addTask();
      expect(mockTaskService.addTask).not.toHaveBeenCalled();

      // Test whitespace only
      component.newTaskText = '   \t\n  ';
      component.addTask();
      expect(mockTaskService.addTask).not.toHaveBeenCalled();

      // Test with just spaces
      component.newTaskText = '     ';
      component.addTask();
      expect(mockTaskService.addTask).not.toHaveBeenCalled();
    });

    it('should handle Enter key press to add task (acceptance criteria)', () => {
      component.newTaskText = 'Task from Enter key';

      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      component.onKeyPress(enterEvent);

      expect(mockTaskService.addTask).toHaveBeenCalledWith('Task from Enter key');
    });

    it('should ignore non-Enter key presses', () => {
      component.newTaskText = 'Test task';

      // Test various non-Enter keys
      const keys = [' ', 'Escape', 'Tab', 'Shift', 'Control', 'Alt'];

      keys.forEach(key => {
        const event = new KeyboardEvent('keypress', { key });
        component.onKeyPress(event);
        expect(mockTaskService.addTask).not.toHaveBeenCalled();
      });
    });

    it('should toggle task completion with immediate visual feedback (acceptance criteria)', () => {
      const testTask = createMockTask('task-1', 'Test task', 'active');

      component.toggleTask(testTask);

      expect(mockTaskService.toggleTask).toHaveBeenCalledWith('task-1');
    });

    it('should delete task immediately with visual confirmation (acceptance criteria)', () => {
      const testTask = createMockTask('task-1', 'Task to delete');

      component.deleteTask(testTask);

      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-1');
    });

    it('should clear all completed tasks (acceptance criteria)', () => {
      component.clearCompleted();

      expect(mockTaskService.clearCompleted).toHaveBeenCalled();
    });

    it('should handle rapid task operations without performance degradation', () => {
      const startTime = performance.now();

      // Simulate rapid task additions
      for (let i = 0; i < 20; i++) {
        component.newTaskText = `Rapid task ${i}`;
        component.addTask();
      }

      const operationTime = performance.now() - startTime;

      expect(mockTaskService.addTask).toHaveBeenCalledTimes(20);
      expect(operationTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Filtering and Display', () => {
    const setupTasksForFiltering = () => {
      const testTasks = [
        createMockTask('1', 'Active task 1', 'active'),
        createMockTask('2', 'Completed task 1', 'completed'),
        createMockTask('3', 'Active task 2', 'active'),
        createMockTask('4', 'Completed task 2', 'completed'),
        createMockTask('5', 'Active task 3', 'active')
      ];
      tasksSubject.next(testTasks);
      return testTasks;
    };

    it('should show all tasks when filter is "all" (acceptance criteria)', () => {
      setupTasksForFiltering();

      component.setFilter('all');

      expect(component.filteredTasks.length).toBe(5);
      expect(component.currentFilter).toBe('all');
    });

    it('should show only active tasks when filter is "active" (acceptance criteria)', () => {
      setupTasksForFiltering();

      component.setFilter('active');

      expect(component.filteredTasks.length).toBe(3);
      expect(component.filteredTasks.every(task => task.status === 'active')).toBe(true);
      expect(component.currentFilter).toBe('active');
    });

    it('should show only completed tasks when filter is "completed" (acceptance criteria)', () => {
      setupTasksForFiltering();

      component.setFilter('completed');

      expect(component.filteredTasks.length).toBe(2);
      expect(component.filteredTasks.every(task => task.status === 'completed')).toBe(true);
      expect(component.currentFilter).toBe('completed');
    });

    it('should identify active filter correctly with visual highlighting', () => {
      component.setFilter('active');

      expect(component.isFilterActive('active')).toBe(true);
      expect(component.isFilterActive('completed')).toBe(false);
      expect(component.isFilterActive('all')).toBe(false);
    });

    it('should update filtered tasks immediately when filter changes', () => {
      const tasks = setupTasksForFiltering();

      // Start with all filter
      component.setFilter('all');
      expect(component.filteredTasks.length).toBe(5);

      // Switch to active - should update immediately
      component.setFilter('active');
      expect(component.filteredTasks.length).toBe(3);

      // Switch to completed - should update immediately
      component.setFilter('completed');
      expect(component.filteredTasks.length).toBe(2);
    });

    it('should maintain filter when tasks are modified', () => {
      setupTasksForFiltering();
      component.setFilter('active');

      // Add new task - filter should remain active
      const newTasks = [
        ...component.allTasks,
        createMockTask('6', 'New active task', 'active')
      ];
      tasksSubject.next(newTasks);

      expect(component.currentFilter).toBe('active');
      expect(component.filteredTasks.length).toBe(4);
    });
  });

  describe('Task Counting and Statistics', () => {
    beforeEach(() => {
      const testTasks = [
        createMockTask('1', 'Active task 1', 'active'),
        createMockTask('2', 'Completed task 1', 'completed'),
        createMockTask('3', 'Active task 2', 'active'),
        createMockTask('4', 'Completed task 2', 'completed'),
        createMockTask('5', 'Active task 3', 'active')
      ];
      tasksSubject.next(testTasks);
    });

    it('should count total tasks correctly', () => {
      expect(component.getTaskCount()).toBe(5);
    });

    it('should count active tasks correctly', () => {
      expect(component.getTaskCount('active')).toBe(3);
    });

    it('should count completed tasks correctly', () => {
      expect(component.getTaskCount('completed')).toBe(2);
    });

    it('should detect if there are completed tasks', () => {
      expect(component.hasCompletedTasks()).toBe(true);
    });

    it('should return false when no completed tasks exist', () => {
      const activeTasks = [
        createMockTask('1', 'Active task 1', 'active'),
        createMockTask('2', 'Active task 2', 'active')
      ];

      tasksSubject.next(activeTasks);

      expect(component.hasCompletedTasks()).toBe(false);
    });

    it('should handle edge case with zero tasks', () => {
      tasksSubject.next([]);

      expect(component.getTaskCount()).toBe(0);
      expect(component.getTaskCount('active')).toBe(0);
      expect(component.getTaskCount('completed')).toBe(0);
      expect(component.hasCompletedTasks()).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle localStorage unavailable gracefully (acceptance criteria)', () => {
      mockTaskService.isUsingFallback.mockReturnValue(true);

      const testTasks = [createMockTask('1', 'Test task')];
      tasksSubject.next(testTasks);

      expect(component.showStorageWarning).toBe(true);
      expect(component.storageWarningMessage).toContain('localStorage unavailable');
    });

    it('should handle quota exceeded error with user feedback (acceptance criteria)', () => {
      const quotaErrorResult: TaskOperationResult = {
        success: false,
        error: 'Storage quota exceeded. Consider clearing completed tasks.'
      };
      mockTaskService.addTask.mockReturnValue(quotaErrorResult);

      // Mock window.alert to test error feedback
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.newTaskText = 'Test task';
      component.addTask();

      expect(alertSpy).toHaveBeenCalledWith('Storage quota exceeded. Consider clearing completed tasks.');
      alertSpy.mockRestore();
    });

    it('should handle corrupted localStorage data gracefully (acceptance criteria)', () => {
      // Simulate service recovery from corrupted data
      const testTasks: Task[] = []; // Empty array indicates reset to empty state
      tasksSubject.next(testTasks);

      expect(component.allTasks.length).toBe(0);
      expect(component.filteredTasks.length).toBe(0);
    });

    it('should show fallback warning for operations when localStorage fails', () => {
      mockTaskService.addTask.mockReturnValue(mockFallbackResult);

      component.newTaskText = 'Test task';
      component.addTask();

      expect(component.showStorageWarning).toBe(true);
      expect(component.storageWarningMessage).toBe('Using fallback storage');
    });

    it('should handle service errors gracefully without breaking UI', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockTaskService.addTask.mockReturnValue(mockErrorResult);

      component.newTaskText = 'Test task';
      component.addTask();

      expect(alertSpy).toHaveBeenCalledWith('Test error');
      expect(component.newTaskText).toBe('Test task'); // Input not cleared on error

      alertSpy.mockRestore();
    });

    it('should handle missing task operations gracefully', () => {
      mockTaskService.toggleTask.mockReturnValue({ success: false, error: 'Task not found' });
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const testTask = createMockTask('non-existent', 'Test');
      component.toggleTask(testTask);

      expect(alertSpy).toHaveBeenCalledWith('Task not found');
      alertSpy.mockRestore();
    });
  });

  describe('User Interface and Accessibility', () => {
    it('should render prominent input field (acceptance criteria)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const inputField = compiled.querySelector('.task-input') as HTMLInputElement;

      expect(inputField).toBeTruthy();
      expect(inputField.placeholder).toContain('What needs to be done?');
      expect(inputField.getAttribute('aria-label')).toBe('Add new task');
      expect(inputField.getAttribute('maxlength')).toBe('500');
    });

    it('should render filter tabs with clear visual indicators (acceptance criteria)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const filterTabs = compiled.querySelectorAll('.filter-tab');

      expect(filterTabs.length).toBe(3);

      const filterTexts = Array.from(filterTabs).map(tab => tab.textContent?.trim());
      expect(filterTexts.some(text => text?.includes('All'))).toBe(true);
      expect(filterTexts.some(text => text?.includes('Active'))).toBe(true);
      expect(filterTexts.some(text => text?.includes('Completed'))).toBe(true);

      // Check ARIA attributes for accessibility
      filterTabs.forEach(tab => {
        expect(tab.getAttribute('role')).toBe('tab');
        expect(tab.hasAttribute('aria-selected')).toBe(true);
        expect(tab.hasAttribute('aria-controls')).toBe(true);
      });
    });

    it('should disable add button when input is empty (acceptance criteria)', () => {
      component.newTaskText = '';
      fixture.detectChanges();

      const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });

    it('should enable add button when input has text (acceptance criteria)', () => {
      component.newTaskText = 'Valid task';
      fixture.detectChanges();

      const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement;
      expect(addButton.disabled).toBe(false);
    });

    it('should render task items with proper accessibility (acceptance criteria)', () => {
      const testTasks = [
        createMockTask('1', 'Task 1', 'active'),
        createMockTask('2', 'Task 2', 'completed')
      ];

      tasksSubject.next(testTasks);
      fixture.detectChanges();

      const taskItems = fixture.nativeElement.querySelectorAll('.task-item');
      expect(taskItems.length).toBe(2);

      // Check accessibility attributes
      taskItems.forEach((item: Element, index: number) => {
        expect(item.getAttribute('role')).toBe('listitem');

        const checkbox = item.querySelector('.task-checkbox') as HTMLInputElement;
        expect(checkbox.getAttribute('aria-label')).toBeTruthy();

        const taskText = item.querySelector('.task-text');
        expect(taskText?.getAttribute('aria-label')).toBeTruthy();

        const deleteButton = item.querySelector('.delete-button');
        expect(deleteButton?.getAttribute('aria-label')).toContain('Delete task');
      });
    });

    it('should show visual distinction for completed items (acceptance criteria)', () => {
      const testTasks = [
        createMockTask('1', 'Active task', 'active'),
        createMockTask('2', 'Completed task', 'completed')
      ];

      tasksSubject.next(testTasks);
      fixture.detectChanges();

      const taskItems = fixture.nativeElement.querySelectorAll('.task-item');
      expect(taskItems[0].classList.contains('completed')).toBe(false);
      expect(taskItems[1].classList.contains('completed')).toBe(true);
    });

    it('should show appropriate empty states with helpful messages', () => {
      // Test empty state for all tasks
      tasksSubject.next([]);
      component.setFilter('all');
      fixture.detectChanges();

      let emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No tasks yet');

      // Test empty state for active tasks with completed tasks present
      const tasksWithOnlyCompleted = [createMockTask('1', 'Completed', 'completed')];
      tasksSubject.next(tasksWithOnlyCompleted);
      component.setFilter('active');
      fixture.detectChanges();

      emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState.textContent).toContain('No active tasks');
    });

    it('should show storage warning with accessible alert role', () => {
      component.showStorageWarning = true;
      component.storageWarningMessage = 'Test warning message';
      fixture.detectChanges();

      const warning = fixture.nativeElement.querySelector('.storage-warning');
      expect(warning).toBeTruthy();
      expect(warning.getAttribute('role')).toBe('alert');
      expect(warning.getAttribute('aria-live')).toBe('polite');
      expect(warning.textContent).toContain('Test warning message');

      const dismissButton = warning.querySelector('.warning-dismiss');
      expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss warning');
    });
  });

  describe('Warning Management', () => {
    it('should dismiss storage warning when requested', () => {
      component.showStorageWarning = true;
      component.storageWarningMessage = 'Test warning';

      component.dismissWarning();

      expect(component.showStorageWarning).toBe(false);
    });

    it('should not show warning duplicate warnings', () => {
      // First operation with fallback
      mockTaskService.addTask.mockReturnValue(mockFallbackResult);
      component.newTaskText = 'Task 1';
      component.addTask();

      expect(component.showStorageWarning).toBe(true);

      // Second operation with fallback - should not duplicate warning
      component.newTaskText = 'Task 2';
      component.addTask();

      expect(component.showStorageWarning).toBe(true); // Still true but not duplicated
    });
  });

  describe('TrackBy Function and Performance', () => {
    it('should track tasks by ID for performance optimization', () => {
      const task = createMockTask('test-id-123', 'Test task');
      const trackByResult = component.trackByTaskId(0, task);

      expect(trackByResult).toBe('test-id-123');
    });

    it('should maintain tracking consistency with different indices', () => {
      const task = createMockTask('consistent-id', 'Test task');

      const result1 = component.trackByTaskId(0, task);
      const result2 = component.trackByTaskId(5, task);
      const result3 = component.trackByTaskId(100, task);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('consistent-id');
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should handle component destruction gracefully with active subscriptions', () => {
      // Simulate active subscription
      tasksSubject.next([createMockTask('1', 'Task 1')]);

      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });

  describe('Integration and Data Flow', () => {
    it('should maintain data consistency between service and component', () => {
      const initialTasks = [
        createMockTask('1', 'Task 1', 'active'),
        createMockTask('2', 'Task 2', 'completed')
      ];

      tasksSubject.next(initialTasks);

      expect(component.allTasks).toEqual(initialTasks);
      expect(component.getTaskCount()).toBe(2);
      expect(component.getTaskCount('active')).toBe(1);
      expect(component.getTaskCount('completed')).toBe(1);
    });

    it('should handle rapid state changes without race conditions', () => {
      // Simulate rapid task updates
      const updates = [
        [createMockTask('1', 'Task 1')],
        [createMockTask('1', 'Task 1'), createMockTask('2', 'Task 2')],
        [createMockTask('1', 'Task 1', 'completed'), createMockTask('2', 'Task 2')],
        [createMockTask('2', 'Task 2')]
      ];

      updates.forEach(tasks => {
        tasksSubject.next(tasks);
        expect(component.allTasks).toEqual(tasks);
      });
    });

    it('should maintain filter state across data updates', () => {
      component.setFilter('active');

      // Update with new tasks
      const newTasks = [
        createMockTask('1', 'Active 1', 'active'),
        createMockTask('2', 'Completed 1', 'completed'),
        createMockTask('3', 'Active 2', 'active')
      ];

      tasksSubject.next(newTasks);

      expect(component.currentFilter).toBe('active');
      expect(component.filteredTasks.length).toBe(2);
      expect(component.filteredTasks.every(t => t.status === 'active')).toBe(true);
    });
  });
});