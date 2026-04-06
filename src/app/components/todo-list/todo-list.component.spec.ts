import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { vi } from 'vitest';

import { TodoListComponent } from './todo-list.component';
import { TodoService } from '../../services/todo.service';
import { Todo } from '../../models/todo.model';
import { BehaviorSubject } from 'rxjs';

describe('TodoListComponent', () => {
  let component: TodoListComponent;
  let fixture: ComponentFixture<TodoListComponent>;
  let mockTodoService: {
    todos$: BehaviorSubject<Todo[]>;
    filter$: BehaviorSubject<'all' | 'active' | 'completed'>;
    addTodo: ReturnType<typeof vi.fn>;
    toggleTodo: ReturnType<typeof vi.fn>;
    deleteTodo: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    getFilteredTodos: ReturnType<typeof vi.fn>;
    validateTodoText: ReturnType<typeof vi.fn>;
    getCharacterLimit: ReturnType<typeof vi.fn>;
    isStorageAvailable: ReturnType<typeof vi.fn>;
    isUsingFallback: ReturnType<typeof vi.fn>;
  };

  const mockTodos: Todo[] = [
    {
      id: '1',
      text: 'Test todo 1',
      completed: false,
      createdAt: new Date('2023-01-01')
    },
    {
      id: '2',
      text: 'Test todo 2',
      completed: true,
      createdAt: new Date('2023-01-02')
    }
  ];

  beforeEach(async () => {
    mockTodoService = {
      todos$: new BehaviorSubject(mockTodos),
      filter$: new BehaviorSubject<'all' | 'active' | 'completed'>('all'),
      addTodo: vi.fn(),
      toggleTodo: vi.fn(),
      deleteTodo: vi.fn(),
      setFilter: vi.fn(),
      getFilteredTodos: vi.fn(),
      validateTodoText: vi.fn(),
      getCharacterLimit: vi.fn().mockReturnValue(500),
      isStorageAvailable: vi.fn().mockReturnValue(true),
      isUsingFallback: vi.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [TodoListComponent, CommonModule, FormsModule],
      providers: [
        { provide: TodoService, useValue: mockTodoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;

    // Setup default mock returns
    mockTodoService.getFilteredTodos.mockReturnValue(mockTodos);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with todos from service', () => {
    expect(component.todos).toEqual(mockTodos);
    expect(component.filteredTodos).toEqual(mockTodos);
    expect(component.currentFilter).toBe('all');
  });

  it('should update character count when text changes', () => {
    component.newTodoText = 'Test';
    component.onTextChange();

    expect(component.characterCount).toBe(4);
  });

  it('should add todo when form is submitted', () => {
    mockTodoService.addTodo.mockReturnValue(true);
    mockTodoService.validateTodoText.mockReturnValue(true);

    component.newTodoText = 'New todo';
    component.addTodo();

    expect(mockTodoService.addTodo).toHaveBeenCalledWith('New todo');
    expect(component.newTodoText).toBe('');
    expect(component.characterCount).toBe(0);
  });

  it('should not add todo if validation fails', () => {
    mockTodoService.validateTodoText.mockReturnValue(false);

    component.newTodoText = '';
    component.addTodo();

    expect(mockTodoService.addTodo).not.toHaveBeenCalled();
  });

  it('should toggle todo completion', () => {
    mockTodoService.toggleTodo.mockReturnValue(true);

    component.toggleTodo('1');

    expect(mockTodoService.toggleTodo).toHaveBeenCalledWith('1');
  });

  it('should delete todo', () => {
    mockTodoService.deleteTodo.mockReturnValue(true);

    component.deleteTodo('1');

    expect(mockTodoService.deleteTodo).toHaveBeenCalledWith('1');
  });

  it('should set filter', () => {
    component.setFilter('active');

    expect(mockTodoService.setFilter).toHaveBeenCalledWith('active');
  });

  it('should calculate active count correctly', () => {
    expect(component.getActiveCount()).toBe(1);
  });

  it('should calculate completed count correctly', () => {
    expect(component.getCompletedCount()).toBe(1);
  });

  it('should validate todo text through service', () => {
    mockTodoService.validateTodoText.mockReturnValue(true);

    const result = component.canAddTodo();

    expect(mockTodoService.validateTodoText).toHaveBeenCalledWith(component.newTodoText);
    expect(result).toBe(true);
  });

  it('should detect character limit exceeded', () => {
    component.characterCount = 501;
    component.maxCharacters = 500;

    expect(component.isCharacterLimitExceeded()).toBe(true);
  });

  it('should detect character limit warning', () => {
    component.characterCount = 450;
    component.maxCharacters = 500;

    expect(component.isCharacterLimitWarning()).toBe(true);
  });

  it('should return correct character count class', () => {
    component.characterCount = 501;
    component.maxCharacters = 500;
    expect(component.getCharacterCountClass()).toBe('character-count error');

    component.characterCount = 450;
    expect(component.getCharacterCountClass()).toBe('character-count warning');

    component.characterCount = 100;
    expect(component.getCharacterCountClass()).toBe('character-count');
  });

  it('should handle keyboard shortcuts', () => {
    const addTodoSpy = vi.spyOn(component, 'addTodo');
    mockTodoService.validateTodoText.mockReturnValue(true);
    component.newTodoText = 'Test todo';

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true
    });

    component.handleKeydown(event);

    expect(addTodoSpy).toHaveBeenCalled();
  });

  it('should handle todo item keydown events', () => {
    const toggleSpy = vi.spyOn(component, 'toggleTodo');
    const deleteSpy = vi.spyOn(component, 'deleteTodo');

    const mockTodo = mockTodos[0];

    // Test space key
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    Object.defineProperty(spaceEvent, 'target', { value: document.createElement('div') });
    component.onKeydown(spaceEvent, mockTodo);
    expect(toggleSpy).toHaveBeenCalledWith(mockTodo.id);

    // Test delete key
    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    Object.defineProperty(deleteEvent, 'target', { value: document.createElement('div') });
    component.onKeydown(deleteEvent, mockTodo);
    expect(deleteSpy).toHaveBeenCalledWith(mockTodo.id);
  });

  it('should handle delete button keydown', () => {
    const deleteSpy = vi.spyOn(component, 'deleteTodo');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onDeleteButtonKeydown(enterEvent, '1');
    expect(deleteSpy).toHaveBeenCalledWith('1');

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    component.onDeleteButtonKeydown(spaceEvent, '1');
    expect(deleteSpy).toHaveBeenCalledWith('1');
  });

  it('should track todos by id', () => {
    const todo = mockTodos[0];
    expect(component.trackByTodo(0, todo)).toBe(todo.id);
  });

  it('should show storage unavailable warning when storage is not available', () => {
    mockTodoService.isStorageAvailable.mockReturnValue(false);

    // Create a new component fixture with the updated service mock
    const newFixture = TestBed.createComponent(TodoListComponent);
    const newComponent = newFixture.componentInstance;

    expect(newComponent.isStorageUnavailable).toBe(true);
  });

  it('should update filtered todos when filter changes', () => {
    const activeTodos = [mockTodos[0]];
    mockTodoService.getFilteredTodos.mockReturnValue(activeTodos);

    mockTodoService.filter$.next('active');

    expect(component.currentFilter).toBe('active');
    expect(mockTodoService.getFilteredTodos).toHaveBeenCalledWith(mockTodos, 'active');
  });

  describe('DOM interactions', () => {
    it('should render todos correctly', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test todo 1');
      expect(compiled.textContent).toContain('Test todo 2');
    });

    it('should show empty state when no todos', () => {
      mockTodoService.todos$.next([]);
      mockTodoService.getFilteredTodos.mockReturnValue([]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('No todos yet');
    });

    it('should show storage warning when storage unavailable', () => {
      component.isStorageUnavailable = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Local storage unavailable');
    });

    it('should display correct todo stats', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('1 active, 1 completed');
    });
  });
});