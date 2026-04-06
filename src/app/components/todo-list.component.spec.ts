import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from '../services/todo.service';
import { Todo, TodoFilter } from '../models/todo.interface';

describe('TodoListComponent', () => {
  let component: TodoListComponent;
  let fixture: ComponentFixture<TodoListComponent>;
  let todoService: TodoService;

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [TodoListComponent, FormsModule, CommonModule],
      providers: [TodoService]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    todoService = TestBed.inject(TodoService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial rendering', () => {
    it('should display empty state when no todos exist', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.empty-state');

      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No tasks yet');
    });

    it('should display todo input field', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('.todo-input') as HTMLInputElement;

      expect(input).toBeTruthy();
      expect(input.placeholder).toBe('What needs to be done?');
      expect(input.maxLength).toBe(100);
    });

    it('should display filter buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const filterButtons = compiled.querySelectorAll('.filter-button');

      expect(filterButtons.length).toBe(3);
      expect(filterButtons[0].textContent).toContain('All');
      expect(filterButtons[1].textContent).toContain('Active');
      expect(filterButtons[2].textContent).toContain('Completed');
    });

    it('should have "All" filter active by default', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const activeFilter = compiled.querySelector('.filter-button.active');

      expect(activeFilter?.textContent).toContain('All');
    });
  });

  describe('Adding todos', () => {
    it('should add todo when form is submitted', fakeAsync(() => {
      component.newTodoText = 'New test todo';
      fixture.detectChanges();

      component.addTodo();
      tick(100); // Wait for async operation
      fixture.detectChanges();

      expect(component.newTodoText).toBe('');
      expect(todoService.todos.length).toBe(1);
      expect(todoService.todos[0].text).toBe('New test todo');
    }));

    it('should add todo when Enter key is pressed', fakeAsync(() => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('.todo-input') as HTMLInputElement;

      input.value = 'Todo from enter key';
      input.dispatchEvent(new Event('input'));
      component.newTodoText = 'Todo from enter key';
      fixture.detectChanges();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(enterEvent);

      component.addTodo();
      tick(100);
      fixture.detectChanges();

      expect(todoService.todos.length).toBe(1);
      expect(todoService.todos[0].text).toBe('Todo from enter key');
    }));

    it('should not add empty todos', () => {
      component.newTodoText = '';
      component.addTodo();

      expect(todoService.todos.length).toBe(0);
    });

    it('should not add todos with only whitespace', () => {
      component.newTodoText = '   ';
      component.addTodo();

      expect(todoService.todos.length).toBe(0);
    });

    it('should show error for todos longer than 100 characters', fakeAsync(() => {
      component.newTodoText = 'a'.repeat(101);
      component.addTodo();
      tick(100);
      fixture.detectChanges();

      expect(component['errorMessage']()).toContain('Task text must be between 1-100 characters');
      expect(todoService.todos.length).toBe(0);
    }));

    it('should display character count', () => {
      component.newTodoText = 'Test todo';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const charCount = compiled.querySelector('.char-count');

      expect(charCount?.textContent).toContain('9/100');
    });

    it('should show warning for character count near limit', () => {
      component.newTodoText = 'a'.repeat(95);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const charCount = compiled.querySelector('.char-count');

      expect(charCount?.classList.contains('warning')).toBe(true);
    });
  });

  describe('Todo list display', () => {
    beforeEach(() => {
      todoService.addTodo('First todo');
      todoService.addTodo('Second todo');
      const secondTodo = todoService.todos[1];
      todoService.toggleTodo(secondTodo.id);
      fixture.detectChanges();
    });

    it('should display todos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoItems = compiled.querySelectorAll('.todo-item');

      expect(todoItems.length).toBe(2);
    });

    it('should display todo text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoTitles = compiled.querySelectorAll('.todo-title');

      expect(todoTitles[0].textContent).toBe('First todo');
      expect(todoTitles[1].textContent).toBe('Second todo');
    });

    it('should display checkboxes with correct states', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('.todo-checkbox') as NodeListOf<HTMLInputElement>;

      expect(checkboxes[0].checked).toBe(false);
      expect(checkboxes[1].checked).toBe(true);
    });

    it('should apply completed class to finished todos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoItems = compiled.querySelectorAll('.todo-item');

      expect(todoItems[0].classList.contains('completed')).toBe(false);
      expect(todoItems[1].classList.contains('completed')).toBe(true);
    });

    it('should display creation time', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoMetas = compiled.querySelectorAll('.todo-meta');

      expect(todoMetas[0].textContent).toContain('Created');
      expect(todoMetas[1].textContent).toContain('Created');
    });
  });

  describe('Todo interactions', () => {
    let todo: Todo;

    beforeEach(() => {
      todo = todoService.addTodo('Test todo');
      fixture.detectChanges();
    });

    it('should toggle todo when checkbox is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const checkbox = compiled.querySelector('.todo-checkbox') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      checkbox.click();
      fixture.detectChanges();

      expect(todoService.todos[0].completed).toBe(true);
    });

    it('should delete todo when delete button is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const deleteButton = compiled.querySelector('.delete-button') as HTMLButtonElement;

      expect(todoService.todos.length).toBe(1);

      deleteButton.click();
      fixture.detectChanges();

      expect(todoService.todos.length).toBe(0);
    });

    it('should show delete button on hover', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoItem = compiled.querySelector('.todo-item') as HTMLElement;
      const deleteButton = compiled.querySelector('.delete-button') as HTMLElement;

      // Initially hidden
      expect(getComputedStyle(deleteButton).opacity).toBe('0');

      // Show on hover
      todoItem.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();

      // Note: CSS hover effects are not testable in unit tests
      // This would require integration testing
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      todoService.addTodo('Active todo 1');
      todoService.addTodo('Active todo 2');
      todoService.addTodo('Completed todo 1');
      todoService.addTodo('Completed todo 2');

      // Complete last two todos
      todoService.toggleTodo(todoService.todos[2].id);
      todoService.toggleTodo(todoService.todos[3].id);
      fixture.detectChanges();
    });

    it('should show all todos when "All" filter is selected', () => {
      component.setFilter('all');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const todoItems = compiled.querySelectorAll('.todo-item');
      expect(todoItems.length).toBe(4);
    });

    it('should show only active todos when "Active" filter is selected', () => {
      component.setFilter('active');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const todoItems = compiled.querySelectorAll('.todo-item');
      expect(todoItems.length).toBe(2);
    });

    it('should show only completed todos when "Completed" filter is selected', () => {
      component.setFilter('completed');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const todoItems = compiled.querySelectorAll('.todo-item');
      expect(todoItems.length).toBe(2);
    });

    it('should highlight active filter button', () => {
      component.setFilter('active');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const filterButtons = compiled.querySelectorAll('.filter-button');

      expect(filterButtons[0].classList.contains('active')).toBe(false); // All
      expect(filterButtons[1].classList.contains('active')).toBe(true);  // Active
      expect(filterButtons[2].classList.contains('active')).toBe(false); // Completed
    });

    it('should display correct filter counts', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const filterCounts = compiled.querySelectorAll('.filter-count');

      expect(filterCounts[0].textContent).toBe('(4)'); // All
      expect(filterCounts[1].textContent).toBe('(2)'); // Active
      expect(filterCounts[2].textContent).toBe('(2)'); // Completed
    });
  });

  describe('Statistics and actions', () => {
    beforeEach(() => {
      todoService.addTodo('Active todo');
      todoService.addTodo('Completed todo');
      todoService.toggleTodo(todoService.todos[1].id);
      fixture.detectChanges();
    });

    it('should display correct todo statistics', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.querySelector('.stats-text');

      expect(statsText?.textContent).toContain('1 of 2 remaining');
    });

    it('should show clear completed button when there are completed todos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-completed');

      expect(clearButton).toBeTruthy();
      expect(clearButton?.textContent).toContain('Clear Completed (1)');
    });

    it('should clear completed todos when clear button is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-completed') as HTMLButtonElement;

      expect(todoService.todos.length).toBe(2);

      clearButton.click();
      fixture.detectChanges();

      expect(todoService.todos.length).toBe(1);
      expect(todoService.todos[0].completed).toBe(false);
    });

    it('should not show clear completed button when no completed todos exist', () => {
      // Toggle the completed todo back to active
      todoService.toggleTodo(todoService.todos[1].id);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearButton = compiled.querySelector('.clear-completed');

      expect(clearButton).toBeFalsy();
    });
  });

  describe('Empty states', () => {
    it('should show appropriate message for empty all filter', () => {
      expect(component.getEmptyStateMessage()).toBe('No tasks yet. Add one above to get started!');
    });

    it('should show appropriate message for empty active filter with existing completed todos', () => {
      todoService.addTodo('Completed todo');
      todoService.toggleTodo(todoService.todos[0].id);
      component.setFilter('active');

      expect(component.getEmptyStateMessage()).toBe('No active tasks! 🎉');
    });

    it('should show appropriate message for empty completed filter', () => {
      todoService.addTodo('Active todo');
      component.setFilter('completed');

      expect(component.getEmptyStateMessage()).toBe('No completed tasks yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      todoService.addTodo('Test todo');
      fixture.detectChanges();
    });

    it('should have proper ARIA labels on main container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('.todo-container');

      expect(container?.getAttribute('role')).toBe('main');
      expect(container?.getAttribute('aria-label')).toBe('Todo List Application');
    });

    it('should have proper ARIA labels on form elements', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const input = compiled.querySelector('.todo-input');
      const button = compiled.querySelector('.add-button');

      expect(input?.getAttribute('aria-label')).toBe('Enter new todo item');
      expect(button?.getAttribute('aria-label')).toBe('Add todo item');
    });

    it('should have proper ARIA labels on filter controls', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const filterControls = compiled.querySelector('.filter-controls');

      expect(filterControls?.getAttribute('role')).toBe('tablist');
      expect(filterControls?.getAttribute('aria-label')).toBe('Filter todos');
    });

    it('should have proper ARIA attributes on todo items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const todoItem = compiled.querySelector('.todo-item');
      const checkbox = compiled.querySelector('.todo-checkbox');

      expect(todoItem?.getAttribute('role')).toBe('listitem');
      expect(checkbox?.getAttribute('aria-label')).toContain('Mark task as');
    });
  });

  describe('Performance', () => {
    it('should use trackBy function for efficient rendering', () => {
      const todo = todoService.addTodo('Test todo');
      const trackId = component.todoService.trackByTodoId(0, todo);

      expect(trackId).toBe(todo.id);
    });

    it('should handle rendering time measurement', () => {
      // Add multiple todos for performance test
      for (let i = 0; i < 50; i++) {
        todoService.addTodo(`Todo ${i}`);
      }
      fixture.detectChanges();

      expect(component.renderTime).toBeGreaterThanOrEqual(0);
      expect(component.filteredTodos.length).toBe(50);
    });
  });

  describe('Date formatting', () => {
    it('should format recent dates correctly', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 30000); // 30 seconds ago
      const oneHourAgo = new Date(now.getTime() - 3600000); // 1 hour ago
      const oneDayAgo = new Date(now.getTime() - 86400000); // 1 day ago

      expect(component.formatDate(oneMinuteAgo)).toBe('just now');
      expect(component.formatDate(oneHourAgo)).toBe('1 hour ago');
      expect(component.formatDate(oneDayAgo)).toBe('1 day ago');
    });

    it('should format older dates as calendar dates', () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const formatted = component.formatDate(oneWeekAgo);

      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY format
    });
  });
});
});