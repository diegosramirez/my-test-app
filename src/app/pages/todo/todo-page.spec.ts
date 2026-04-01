import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoPage } from './todo-page';
import { TaskService } from '../../services/task.service';

describe('TodoPage Integration', () => {
  let fixture: ComponentFixture<TodoPage>;
  let service: TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoPage],
    }).compileComponents();

    service = TestBed.inject(TaskService);
    fixture = TestBed.createComponent(TodoPage);
    fixture.detectChanges();
  });

  function query(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  function queryAll(testId: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));
  }

  function addTask(title: string): void {
    const input = query('task-input') as HTMLInputElement;
    input.value = title;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    // Extra cycle needed for ngModel to sync cleared value back to DOM
    fixture.detectChanges();
    fixture.detectChanges();
  }

  describe('Empty state', () => {
    it('should show only input field when no tasks exist', () => {
      expect(query('task-input')).toBeTruthy();
      expect(query('active-count')).toBeNull();
      expect(query('filter-all')).toBeNull();
      expect(query('clear-completed')).toBeNull();
    });
  });

  describe('Add task', () => {
    it('should add a task and show it in the list', () => {
      addTask('Buy milk');
      expect(query('task-item-1')).toBeTruthy();
      expect(query('task-item-1')!.textContent).toContain('Buy milk');
    });

    it('should show footer after adding a task', () => {
      addTask('Test task');
      expect(query('active-count')).toBeTruthy();
      expect(query('filter-all')).toBeTruthy();
    });

    it('should show correct singular counter', () => {
      addTask('Only task');
      expect(query('active-count')!.textContent).toContain('1 item left');
    });

    it('should show correct plural counter', () => {
      addTask('Task 1');
      addTask('Task 2');
      expect(query('active-count')!.textContent).toContain('2 items left');
    });

    it('should clear input after adding', async () => {
      addTask('Test');
      await fixture.whenStable();
      fixture.detectChanges();
      const input = query('task-input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should not add empty tasks', () => {
      addTask('   ');
      expect(service.tasks().length).toBe(0);
    });
  });

  describe('Complete task', () => {
    it('should toggle task completion via checkbox', () => {
      addTask('My task');
      const checkbox = query('task-checkbox-1') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
      expect(service.tasks()[0].completed).toBe(true);
      expect(query('active-count')!.textContent).toContain('0 items left');
    });

    it('should apply completed styling', () => {
      addTask('My task');
      const checkbox = query('task-checkbox-1') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
      const item = query('task-item-1')!;
      expect(item.classList.contains('completed')).toBe(true);
    });
  });

  describe('Delete task', () => {
    it('should remove task when delete button clicked', () => {
      addTask('Task to delete');
      const deleteBtn = query('delete-button-1');
      deleteBtn!.click();
      fixture.detectChanges();
      expect(query('task-item-1')).toBeNull();
      expect(service.tasks().length).toBe(0);
    });

    it('should hide footer when last task deleted', () => {
      addTask('Only task');
      const deleteBtn = query('delete-button-1');
      deleteBtn!.click();
      fixture.detectChanges();
      expect(query('active-count')).toBeNull();
      expect(query('filter-all')).toBeNull();
    });
  });

  describe('Filters', () => {
    beforeEach(() => {
      addTask('Active task');
      addTask('Completed task');
      const checkbox = query('task-checkbox-2') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
    });

    it('should show all tasks by default', () => {
      expect(fixture.nativeElement.querySelectorAll('[data-testid^="task-item-"]').length).toBe(2);
    });

    it('should filter to active tasks', () => {
      query('filter-active')!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('[data-testid^="task-item-"]').length).toBe(1);
      expect(query('task-item-1')).toBeTruthy();
    });

    it('should filter to completed tasks', () => {
      query('filter-completed')!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('[data-testid^="task-item-"]').length).toBe(1);
      expect(query('task-item-2')).toBeTruthy();
    });

    it('should show aria-pressed on active filter', () => {
      query('filter-active')!.click();
      fixture.detectChanges();
      expect(query('filter-active')!.getAttribute('aria-pressed')).toBe('true');
      expect(query('filter-all')!.getAttribute('aria-pressed')).toBe('false');
    });

    it('should show contextual empty message for completed filter when none completed', () => {
      // Uncomplete the completed task
      const checkbox = query('task-checkbox-2') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
      query('filter-completed')!.click();
      fixture.detectChanges();
      const msg = query('empty-message');
      expect(msg).toBeTruthy();
      expect(msg!.textContent).toContain('No completed tasks');
    });

    it('should show contextual empty message for active filter when all completed', () => {
      const checkbox = query('task-checkbox-1') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
      query('filter-active')!.click();
      fixture.detectChanges();
      const msg = query('empty-message');
      expect(msg).toBeTruthy();
      expect(msg!.textContent).toContain('No active tasks');
    });
  });

  describe('Clear completed', () => {
    it('should remove completed tasks', () => {
      addTask('Active');
      addTask('Done');
      (query('task-checkbox-2') as HTMLInputElement).click();
      fixture.detectChanges();
      expect(query('clear-completed')).toBeTruthy();
      query('clear-completed')!.click();
      fixture.detectChanges();
      expect(service.tasks().length).toBe(1);
      expect(service.tasks()[0].title).toBe('Active');
    });

    it('should hide clear button when no completed tasks', () => {
      addTask('Active task');
      expect(query('clear-completed')).toBeNull();
    });

    it('should keep active count accurate after clearing', () => {
      addTask('Active');
      addTask('Done');
      (query('task-checkbox-2') as HTMLInputElement).click();
      fixture.detectChanges();
      query('clear-completed')!.click();
      fixture.detectChanges();
      expect(query('active-count')!.textContent).toContain('1 item left');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on delete button', () => {
      addTask('My task');
      const deleteBtn = query('delete-button-1');
      expect(deleteBtn!.getAttribute('aria-label')).toBe('Delete task: My task');
    });

    it('should have aria-live on counter', () => {
      addTask('Task');
      const counter = query('active-count');
      expect(counter!.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-pressed on filter buttons', () => {
      addTask('Task');
      expect(query('filter-all')!.getAttribute('aria-pressed')).toBe('true');
      expect(query('filter-active')!.getAttribute('aria-pressed')).toBe('false');
      expect(query('filter-completed')!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('Standalone architecture', () => {
    it('should use standalone components', () => {
      // TodoPage is imported directly, not declared in NgModule
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
});
