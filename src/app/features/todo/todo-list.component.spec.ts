import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from './todo.service';
import { STORAGE } from './storage.token';
import { AnalyticsService, ConsoleAnalyticsService } from './analytics.service';
import { CURRENT_STORAGE_VERSION, TodoStorage } from './todo.model';

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let mockStorage: Storage;
  let service: TodoService;

  beforeEach(async () => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        { provide: STORAGE, useValue: mockStorage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(TodoService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when no items', () => {
    const el: HTMLElement = fixture.nativeElement;
    const emptyState = el.querySelector('[role="status"].empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState!.textContent).toContain('No to-dos yet. Add one above!');
  });

  it('should auto-focus input on load', () => {
    const input = fixture.nativeElement.querySelector('.todo-input');
    expect(document.activeElement).toBe(input);
  });

  it('should add an item on form submit', () => {
    component.newTitle = 'Test task';
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.todo-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Test task');
  });

  it('should save to localStorage in versioned envelope on add', () => {
    component.newTitle = 'Persist me';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const raw = mockStorage.getItem('todo_items');
    const parsed: TodoStorage = JSON.parse(raw!);
    expect(parsed.version).toBe(CURRENT_STORAGE_VERSION);
    expect(parsed.items[0].title).toBe('Persist me');
  });

  it('should show validation hint for empty input', () => {
    component.newTitle = '   ';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const hint = fixture.nativeElement.querySelector('#validation-hint');
    expect(hint).toBeTruthy();
    expect(hint!.textContent).toContain('Give your task a name first.');
    expect(hint!.getAttribute('aria-live')).toBe('assertive');

    // Input has aria-describedby
    const input = fixture.nativeElement.querySelector('.todo-input');
    expect(input.getAttribute('aria-describedby')).toBe('validation-hint');
  });

  it('should clear validation hint when user types', () => {
    component.newTitle = '';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(component.validationHint()).toBeTruthy();

    // Simulate typing
    component.onInputChange();
    fixture.detectChanges();
    expect(component.validationHint()).toBe('');
  });

  it('should toggle item completion', () => {
    service.add('Toggle task');
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('.todo-checkbox') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.todo-item');
    expect(item.classList.contains('completed')).toBe(true);

    // Verify persisted
    const parsed: TodoStorage = JSON.parse(mockStorage.getItem('todo_items')!);
    expect(parsed.items[0].completed).toBe(true);
  });

  it('should apply completed class on completed items', () => {
    service.add('Style test');
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('.todo-checkbox') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.todo-item');
    expect(item.classList.contains('completed')).toBe(true);
  });

  it('should delete item and show undo toast', () => {
    service.add('Delete me');
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    deleteBtn.click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    // Item removed from list
    expect(fixture.nativeElement.querySelectorAll('.todo-item').length).toBe(0);

    // Undo toast visible
    const toast = fixture.nativeElement.querySelector('.undo-toast');
    expect(toast).toBeTruthy();
    expect(toast!.textContent).toContain('Delete me');

    // Click undo
    const undoBtn = fixture.nativeElement.querySelector('.undo-btn');
    undoBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.todo-item').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.undo-toast')).toBeFalsy();
  });

  it('should finalize delete after 4 seconds', () => {
    service.add('Gone soon');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.delete-btn').click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    vi.advanceTimersByTime(4000);
    fixture.detectChanges();

    // Toast gone
    expect(fixture.nativeElement.querySelector('.undo-toast')).toBeFalsy();

    // Persisted without the item
    const parsed: TodoStorage = JSON.parse(mockStorage.getItem('todo_items')!);
    expect(parsed.items.length).toBe(0);
  });

  it('should have proper aria-labels on checkboxes and delete buttons', () => {
    service.add('Accessible task');
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('.todo-checkbox');
    expect(checkbox.getAttribute('aria-label')).toContain("Mark 'Accessible task' as complete");

    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    expect(deleteBtn.getAttribute('aria-label')).toContain("Delete 'Accessible task'");
  });

  it('should use semantic ul/li elements', () => {
    service.add('Semantic');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul.todo-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('li.todo-item')).toBeTruthy();
  });

  it('should show storage unavailable notice', () => {
    const brokenStorage = createMockStorage();
    brokenStorage.getItem = () => { throw new Error('SecurityError'); };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        { provide: STORAGE, useValue: brokenStorage },
      ],
    });
    const fix2 = TestBed.createComponent(TodoListComponent);
    fix2.detectChanges();

    const notice = fix2.nativeElement.querySelector('.storage-notice');
    expect(notice).toBeTruthy();
    expect(notice!.textContent).toContain("won't persist");
    warnSpy.mockRestore();
  });

  it('should not create item for whitespace-only input', () => {
    component.newTitle = '   \t  ';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.items().length).toBe(0);
  });

  it('should add items at the top of the list', () => {
    service.add('First');
    service.add('Second');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.todo-title');
    expect(items[0].textContent).toContain('Second');
    expect(items[1].textContent).toContain('First');
  });

  it('should finalize previous pending delete when new delete happens', () => {
    service.add('Item 1');
    service.add('Item 2');
    fixture.detectChanges();

    // Delete first item (Item 2 is at index 0)
    const deleteBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    deleteBtns[0].click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    // Delete next item
    const deleteBtns2 = fixture.nativeElement.querySelectorAll('.delete-btn');
    deleteBtns2[0].click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    // Both deleted from DOM
    expect(fixture.nativeElement.querySelectorAll('.todo-item').length).toBe(0);

    vi.advanceTimersByTime(4000);
    fixture.detectChanges();

    const parsed: TodoStorage = JSON.parse(mockStorage.getItem('todo_items')!);
    expect(parsed.items.length).toBe(0);
  });
});
