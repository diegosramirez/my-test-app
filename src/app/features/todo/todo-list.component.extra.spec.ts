import { TestBed } from '@angular/core/testing';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from './todo.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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

describe('TodoListComponent — additional tests', () => {
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

  it('should have input with maxlength=250 and autocomplete=off', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[name="newTodo"]') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('250');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('should have placeholder text on input', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[name="newTodo"]') as HTMLInputElement;
    expect(input.placeholder).toBe('What needs to be done?');
  });

  it('should show storage warning banner when storage is unavailable', () => {
    // Make storage fail
    mockStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };
    mockStorage.removeItem = () => { throw new DOMException('QuotaExceededError'); };

    // Recreate TestBed so service picks up failing storage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TodoListComponent] });

    const fixture = TestBed.createComponent(TodoListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const warning = el.querySelector('.storage-warning');
    expect(warning).toBeTruthy();
    expect(warning!.textContent).toContain("Changes won't be saved");
  });

  it('should show undo snackbar after deleting a todo', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Delete me');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const deleteBtn = el.querySelector('.delete-btn') as HTMLButtonElement;
    deleteBtn.click();
    fixture.detectChanges();

    const snackbar = el.querySelector('.snackbar');
    expect(snackbar).toBeTruthy();
    expect(snackbar!.textContent).toContain('Task deleted');
    expect(el.querySelector('.undo-btn')).toBeTruthy();
  });

  it('should restore todo when undo button is clicked', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Restore me');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.delete-btn')!.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.todo-item').length).toBe(0);

    el.querySelector<HTMLButtonElement>('.undo-btn')!.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.todo-item').length).toBe(1);
    expect(el.querySelector('.todo-title')!.textContent).toContain('Restore me');
    vi.useRealTimers();
  });

  it('should toggle todo via checkbox click', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Toggle via UI');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const checkbox = el.querySelector('.todo-checkbox') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(el.querySelector('.todo-item')!.classList.contains('completed')).toBe(true);
  });

  it('should display correct items left count', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('One');
    service.addTodo('Two');
    service.addTodo('Three');
    service.toggleTodo(service.todos()[0].id);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const itemsLeft = el.querySelector('.items-left')!.textContent!.trim();
    expect(itemsLeft).toContain('2 items left');
  });

  it('should show "1 item left" (singular) when only one active', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Only one');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const itemsLeft = el.querySelector('.items-left')!.textContent!.trim();
    expect(itemsLeft).toContain('1 item left');
    expect(itemsLeft).not.toContain('items');
  });

  it('should clear input after adding todo', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const input = el.querySelector('input[name="newTodo"]') as HTMLInputElement;
    input.value = 'Clear me';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance['newTodoTitle']).toBe('');
  });

  it('should not add todo when input is empty', async () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.todos().length).toBe(0);
  });

  it('should switch filter when filter button is clicked', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const filterBtns = el.querySelectorAll('.filter-btn');
    expect(filterBtns.length).toBe(3);

    // Click "Active"
    (filterBtns[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.filter()).toBe('active');
    expect(filterBtns[1].getAttribute('aria-checked')).toBe('true');
  });

  it('should use semantic ul structure with role=list', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const ul = el.querySelector('ul[role="list"]');
    expect(ul).toBeTruthy();
  });

  it('should render delete button as a real button element', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Has button');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const deleteBtn = el.querySelector('.delete-btn');
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn!.tagName).toBe('BUTTON');
  });

  it('should render checkbox as real input[type=checkbox]', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Has checkbox');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const checkbox = el.querySelector('.todo-checkbox') as HTMLInputElement;
    expect(checkbox.tagName).toBe('INPUT');
    expect(checkbox.type).toBe('checkbox');
  });

  it('should clear completed via button click', () => {
    const fixture = TestBed.createComponent(TodoListComponent);
    const service = TestBed.inject(TodoService);
    service.addTodo('Active');
    service.addTodo('Done');
    service.toggleTodo(service.todos()[0].id);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const clearBtn = el.querySelector('.clear-completed-btn') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();

    expect(service.todos().length).toBe(1);
    expect(el.querySelector('.snackbar')).toBeTruthy();
  });
});
