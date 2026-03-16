import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoListComponent } from '../todo-list.component';
import { TodoService, ID_GENERATOR } from '../todo.service';
import { StorageAdapter } from '../../../core/storage-adapter.service';
import { AnalyticsService } from '../../../core/analytics.service';
import { TodoStore } from '../todo.model';
import { signal } from '@angular/core';

class MockAnalyticsService extends AnalyticsService {
  events: { event: string; meta: Record<string, unknown> }[] = [];
  track(event: string, meta: Record<string, unknown>): void {
    this.events.push({ event, meta });
  }
}

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let el: HTMLElement;
  let analytics: MockAnalyticsService;
  let storage: Record<string, string>;
  let storageAvailable: boolean;
  let idCounter: number;

  function createComponent(preStorage?: Record<string, string>) {
    storage = preStorage ?? {};
    storageAvailable = true;
    analytics = new MockAnalyticsService();
    idCounter = 0;

    TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        TodoService,
        {
          provide: StorageAdapter,
          useFactory: () => {
            const svc = {
              storageAvailable: signal(storageAvailable),
              read: (key: string) => {
                if (!storageAvailable) return null;
                const raw = storage[key];
                return raw ? JSON.parse(raw) : null;
              },
              write: (key: string, data: unknown) => {
                if (!storageAvailable) return false;
                storage[key] = JSON.stringify(data);
                return true;
              },
            };
            return svc;
          },
        },
        { provide: AnalyticsService, useFactory: () => analytics },
        { provide: ID_GENERATOR, useValue: () => `id-${++idCounter}` },
      ],
    });

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  function createComponentStorageUnavailable() {
    storage = {};
    storageAvailable = false;
    analytics = new MockAnalyticsService();
    idCounter = 0;

    TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        TodoService,
        {
          provide: StorageAdapter,
          useFactory: () => ({
            storageAvailable: signal(false),
            read: () => null,
            write: () => false,
          }),
        },
        { provide: AnalyticsService, useFactory: () => analytics },
        { provide: ID_GENERATOR, useValue: () => `id-${++idCounter}` },
      ],
    });

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  function getInput(): HTMLInputElement {
    return el.querySelector('.todo-input') as HTMLInputElement;
  }

  function submitTodo(title: string): void {
    const input = getInput();
    input.value = title;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Set inputValue signal via ngModel
    component['inputValue'].set(title);
    component.onSubmit();
    fixture.detectChanges();
  }

  function getFilterButtons(): HTMLButtonElement[] {
    return Array.from(el.querySelectorAll('.filter-btn'));
  }

  function clickFilter(label: string): void {
    const btn = getFilterButtons().find(b => b.textContent?.trim() === label);
    btn?.click();
    fixture.detectChanges();
  }

  // --- Add Todo ---

  it('should add a todo on submit and clear input', () => {
    createComponent();
    submitTodo('Buy milk');
    expect(el.querySelector('.todo-label')?.textContent?.trim()).toBe('Buy milk');
    expect(component['inputValue']()).toBe('');
  });

  it('should persist todo to localStorage with versioned schema', () => {
    createComponent();
    submitTodo('Buy milk');
    const stored: TodoStore = JSON.parse(storage['todos_app_data']);
    expect(stored.version).toBe(1);
    expect(stored.todos.length).toBe(1);
    expect(stored.todos[0].title).toBe('Buy milk');
  });

  // --- Whitespace / Empty Input ---

  it('should not add todo for empty input', () => {
    createComponent();
    submitTodo('');
    expect(el.querySelectorAll('app-todo-item').length).toBe(0);
  });

  it('should not add todo for whitespace-only input', () => {
    createComponent();
    submitTodo('   ');
    expect(el.querySelectorAll('app-todo-item').length).toBe(0);
  });

  // --- Toggle ---

  it('should toggle a todo when checkbox changes', () => {
    createComponent();
    submitTodo('Test');
    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.querySelector('.todo-item.completed')).toBeTruthy();
  });

  // --- Delete ---

  it('should remove a todo when delete button clicked', () => {
    createComponent();
    submitTodo('Test');
    const deleteBtn = el.querySelector('.todo-delete') as HTMLButtonElement;
    deleteBtn.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('app-todo-item').length).toBe(0);
  });

  // --- Filter ---

  it('should filter active todos', () => {
    createComponent();
    submitTodo('Active one');
    submitTodo('Done one');
    // Toggle second (which is first in list since prepended)
    const checkboxes = el.querySelectorAll('input[type="checkbox"]');
    checkboxes[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    clickFilter('Active');
    expect(el.querySelectorAll('app-todo-item').length).toBe(1);
  });

  it('should filter completed todos', () => {
    createComponent();
    submitTodo('Active one');
    submitTodo('Done one');
    const checkboxes = el.querySelectorAll('input[type="checkbox"]');
    checkboxes[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    clickFilter('Completed');
    expect(el.querySelectorAll('app-todo-item').length).toBe(1);
  });

  it('should show all todos with All filter', () => {
    createComponent();
    submitTodo('One');
    submitTodo('Two');
    const checkboxes = el.querySelectorAll('input[type="checkbox"]');
    checkboxes[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    clickFilter('Completed');
    clickFilter('All');
    expect(el.querySelectorAll('app-todo-item').length).toBe(2);
  });

  it('should fire todo_filter_changed analytics event', () => {
    createComponent();
    clickFilter('Active');
    expect(analytics.events.some(e => e.event === 'todo_filter_changed' && (e.meta as any).filter === 'active')).toBe(true);
  });

  // --- Items Left Counter ---

  it('should show items left counter with plural', () => {
    createComponent();
    submitTodo('One');
    submitTodo('Two');
    const counter = el.querySelector('.items-left')?.textContent?.trim();
    expect(counter).toBe('2 items left');
  });

  it('should show singular item left', () => {
    createComponent();
    submitTodo('One');
    const counter = el.querySelector('.items-left')?.textContent?.trim();
    expect(counter).toBe('1 item left');
  });

  it('should show 0 items left', () => {
    createComponent();
    const counter = el.querySelector('.items-left')?.textContent?.trim();
    expect(counter).toBe('0 items left');
  });

  // --- Empty States ---

  it('should show first-run empty state message', () => {
    createComponent();
    expect(el.querySelector('.empty-state')?.textContent?.trim()).toBe('Add your first task above to get started');
  });

  it('should not show first-run message after adding a todo', () => {
    createComponent();
    submitTodo('First');
    expect(el.querySelector('.empty-state')).toBeFalsy();
  });

  it('should show "No completed tasks yet" for completed filter with none completed', () => {
    createComponent();
    submitTodo('Active');
    clickFilter('Completed');
    expect(el.querySelector('.empty-state')?.textContent?.trim()).toBe('No completed tasks yet');
  });

  it('should show "Everything is done!" for active filter when all completed', () => {
    createComponent();
    submitTodo('Done');
    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    clickFilter('Active');
    expect(el.querySelector('.empty-state')?.textContent?.trim()).toContain('Everything is done!');
  });

  // --- Storage Warning ---

  it('should show storage unavailable banner', () => {
    createComponentStorageUnavailable();
    const banner = el.querySelector('.warning-banner');
    expect(banner?.textContent).toContain("Your browser doesn't support local storage");
  });

  it('should not show storage banner when available', () => {
    createComponent();
    expect(el.querySelector('.warning-banner')).toBeFalsy();
  });

  // --- Accessibility ---

  it('should have aria-pressed on filter buttons', () => {
    createComponent();
    const buttons = getFilterButtons();
    const allBtn = buttons.find(b => b.textContent?.trim() === 'All');
    expect(allBtn?.getAttribute('aria-pressed')).toBe('true');
    const activeBtn = buttons.find(b => b.textContent?.trim() === 'Active');
    expect(activeBtn?.getAttribute('aria-pressed')).toBe('false');
  });

  it('should have section with aria-label', () => {
    createComponent();
    const section = el.querySelector('section[aria-label="Todo list"]');
    expect(section).toBeTruthy();
  });

  it('should have maxlength on input', () => {
    createComponent();
    expect(getInput().getAttribute('maxlength')).toBe('250');
  });

  // --- Persistence ---

  it('should load persisted todos on construction', () => {
    const store: TodoStore = {
      version: 1,
      todos: [{ id: 'x', title: 'Persisted', completed: false, createdAt: '2024-01-01T00:00:00Z' }],
    };
    createComponent({ 'todos_app_data': JSON.stringify(store) });
    expect(el.querySelector('.todo-label')?.textContent?.trim()).toBe('Persisted');
  });

  // --- Quota exceeded warning ---

  it('should show inline warning when write fails', () => {
    createComponent();
    // Make writes fail after initial setup
    const adapter = TestBed.inject(StorageAdapter);
    (adapter as any).write = () => false;
    // Need to also set storageAvailable to true so add works in-memory
    submitTodo('Test');
    fixture.detectChanges();
    const warning = el.querySelector('.warning-inline');
    expect(warning?.textContent).toContain('Storage full');
  });
});
