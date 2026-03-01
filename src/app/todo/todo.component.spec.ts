import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoComponent } from './todo.component';

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;
  let localStorageMock: Record<string, string>;

  beforeEach(async () => {
    localStorageMock = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageMock[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key: string) => {
        delete localStorageMock[key];
      }
    );

    await TestBed.configureTestingModule({
      imports: [TodoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  describe('initialisation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should start with an empty list when localStorage has no data', () => {
      expect(component.todos).toEqual([]);
    });

    it('should load existing tasks from localStorage on init', async () => {
      const stored = ['Buy milk', 'Walk the dog'];
      localStorageMock['todo-items'] = JSON.stringify(stored);

      // Re-create the component so ngOnInit reads the pre-populated store
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TodoComponent],
      }).compileComponents();

      const newFixture = TestBed.createComponent(TodoComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.todos).toEqual(stored);
    });

    it('should handle malformed localStorage data gracefully', async () => {
      localStorageMock['todo-items'] = 'not-valid-json{{';

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TodoComponent],
      }).compileComponents();

      const newFixture = TestBed.createComponent(TodoComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.todos).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Add task
  // ---------------------------------------------------------------------------

  describe('addTodo()', () => {
    it('should add a valid task to the list', () => {
      component.newTodo = 'Write unit tests';
      component.addTodo();

      expect(component.todos).toContain('Write unit tests');
    });

    it('should persist the new task to localStorage', () => {
      component.newTodo = 'Write unit tests';
      component.addTodo();

      const stored = JSON.parse(localStorageMock['todo-items']);
      expect(stored).toContain('Write unit tests');
    });

    it('should clear the input field after adding a task', () => {
      component.newTodo = 'Write unit tests';
      component.addTodo();

      expect(component.newTodo).toBe('');
    });

    it('should support adding multiple tasks', () => {
      component.newTodo = 'Task one';
      component.addTodo();
      component.newTodo = 'Task two';
      component.addTodo();

      expect(component.todos).toEqual(['Task one', 'Task two']);
    });

    it('should NOT add an empty string task', () => {
      component.newTodo = '';
      component.addTodo();

      expect(component.todos).toHaveLength(0);
    });

    it('should NOT add a whitespace-only task', () => {
      component.newTodo = '   ';
      component.addTodo();

      expect(component.todos).toHaveLength(0);
    });

    it('should NOT modify localStorage when task is empty', () => {
      component.newTodo = '';
      component.addTodo();

      expect(localStorageMock['todo-items']).toBeUndefined();
    });

    it('should NOT modify localStorage when task is whitespace-only', () => {
      component.newTodo = '   ';
      component.addTodo();

      expect(localStorageMock['todo-items']).toBeUndefined();
    });

    it('should trim leading/trailing whitespace before adding', () => {
      component.newTodo = '  Buy groceries  ';
      component.addTodo();

      expect(component.todos).toContain('Buy groceries');
      expect(component.todos).not.toContain('  Buy groceries  ');
    });
  });

  // ---------------------------------------------------------------------------
  // Delete task
  // ---------------------------------------------------------------------------

  describe('deleteTodo()', () => {
    beforeEach(() => {
      component.newTodo = 'Task A';
      component.addTodo();
      component.newTodo = 'Task B';
      component.addTodo();
      component.newTodo = 'Task C';
      component.addTodo();
    });

    it('should remove the task at the given index', () => {
      component.deleteTodo(1); // removes 'Task B'

      expect(component.todos).toEqual(['Task A', 'Task C']);
    });

    it('should persist the updated list to localStorage after deletion', () => {
      component.deleteTodo(0); // removes 'Task A'

      const stored = JSON.parse(localStorageMock['todo-items']);
      expect(stored).toEqual(['Task B', 'Task C']);
    });

    it('should remove the first task correctly', () => {
      component.deleteTodo(0);

      expect(component.todos[0]).toBe('Task B');
      expect(component.todos).toHaveLength(2);
    });

    it('should remove the last task correctly', () => {
      component.deleteTodo(2);

      expect(component.todos).toEqual(['Task A', 'Task B']);
    });

    it('should result in an empty list when the only task is deleted', () => {
      // Reset to a single-item list
      component.todos = ['Only task'];
      component.deleteTodo(0);

      expect(component.todos).toHaveLength(0);
    });

    it('should persist an empty array to localStorage when last task is deleted', () => {
      component.todos = ['Only task'];
      component.deleteTodo(0);

      const stored = JSON.parse(localStorageMock['todo-items']);
      expect(stored).toEqual([]);
    });

    it('should not affect other tasks when one is deleted', () => {
      const before = [...component.todos];
      component.deleteTodo(1);

      expect(component.todos).toHaveLength(before.length - 1);
      expect(component.todos).toContain('Task A');
      expect(component.todos).toContain('Task C');
      expect(component.todos).not.toContain('Task B');
    });
  });

  // ---------------------------------------------------------------------------
  // Template / DOM integration
  // ---------------------------------------------------------------------------

  describe('template integration', () => {
    it('should render a task in the DOM after adding it', () => {
      component.newTodo = 'Render me';
      component.addTodo();
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Render me');
    });

    it('should remove a task from the DOM after deleting it', () => {
      component.newTodo = 'Delete me';
      component.addTodo();
      fixture.detectChanges();

      component.deleteTodo(0);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Delete me');
    });

    it('should render all tasks in the DOM', () => {
      ['Alpha', 'Beta', 'Gamma'].forEach((t) => {
        component.newTodo = t;
        component.addTodo();
      });
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Alpha');
      expect(compiled.textContent).toContain('Beta');
      expect(compiled.textContent).toContain('Gamma');
    });
  });
});
