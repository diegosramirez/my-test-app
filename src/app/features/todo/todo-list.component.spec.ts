import { TestBed } from '@angular/core/testing';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from './todo.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('TodoListComponent', () => {
  let mockStorage: Storage;

  beforeEach(async () => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    vi.stubGlobal('crypto', { randomUUID: () => `test-${Date.now()}-${Math.random()}` });

    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty state message when no todos', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No tasks yet. Add one above to get started.');
  });

  it('should add a todo via form submission', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const input = el.querySelector('input[name="newTodo"]') as HTMLInputElement;
    const form = el.querySelector('form')!;

    input.value = 'New task';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('.todo-title')?.textContent).toContain('New task');
  });

  it('should have accessible delete buttons with aria-label', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('My task');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const deleteBtn = el.querySelector('.delete-btn') as HTMLButtonElement;
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete task: My task');
  });

  it('should have checkbox with associated label', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Labeled task');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const checkbox = el.querySelector('.todo-checkbox') as HTMLInputElement;
    const label = el.querySelector('.todo-title') as HTMLLabelElement;
    expect(checkbox.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(checkbox.id);
  });

  it('should use role=radiogroup for filters', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const radiogroup = el.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeTruthy();
    const radios = el.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
  });

  it('should have aria-live region for items left', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const liveRegion = el.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion!.textContent).toContain('0 items left');
  });

  it('should use semantic ul/li structure', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const ul = el.querySelector('ul.todo-list');
    expect(ul).toBeTruthy();
  });

  it('should show contextual empty state for active filter', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Task');
    service.toggleTodo(service.todos()[0].id);
    service.setFilter('active');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No active tasks.');
  });

  it('should show contextual empty state for completed filter', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Task');
    service.setFilter('completed');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No completed tasks.');
  });

  it('should show clear completed button only when completed todos exist', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.clear-completed-btn')).toBeNull();

    service.addTodo('Task');
    service.toggleTodo(service.todos()[0].id);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('.clear-completed-btn')).toBeTruthy();
  });
});
