import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoListComponent } from './todo-list.component';
import { TodoService } from './todo.service';
import { STORAGE } from './storage.token';
import { AnalyticsService, ConsoleAnalyticsService } from './analytics.service';
import { CURRENT_STORAGE_VERSION, TodoStorage, generateId } from './todo.model';

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

describe('generateId', () => {
  it('should return a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should return unique IDs', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

describe('ConsoleAnalyticsService', () => {
  it('should call console.debug for each tracking method', () => {
    const svc = new ConsoleAnalyticsService();
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    svc.trackItemAdded('Test', '2026-01-01T00:00:00Z');
    expect(spy).toHaveBeenCalledWith('todo_item_added', { title: 'Test', timestamp: '2026-01-01T00:00:00Z' });

    svc.trackItemToggled('id1', true);
    expect(spy).toHaveBeenCalledWith('todo_item_toggled', { itemId: 'id1', completed: true });

    svc.trackItemDeleted('id2');
    expect(spy).toHaveBeenCalledWith('todo_item_deleted', { itemId: 'id2' });

    svc.trackPageViewed(5);
    expect(spy).toHaveBeenCalledWith('todo_page_viewed', { itemCount: 5 });

    spy.mockRestore();
  });
});

describe('Route configuration', () => {
  it('should lazy-load TodoListComponent at /todo', async () => {
    const { routes } = await import('../../app.routes');
    const todoRoute = routes.find(r => r.path === 'todo');
    expect(todoRoute).toBeTruthy();
    expect(todoRoute!.loadComponent).toBeDefined();

    const mod = await (todoRoute!.loadComponent as () => Promise<any>)();
    expect(mod).toBe(TodoListComponent);
  });
});

describe('TodoListComponent - edge cases', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let mockStorage: Storage;
  let service: TodoService;
  let analyticsSpy: {
    trackItemAdded: ReturnType<typeof vi.fn>;
    trackItemToggled: ReturnType<typeof vi.fn>;
    trackItemDeleted: ReturnType<typeof vi.fn>;
    trackPageViewed: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    analyticsSpy = {
      trackItemAdded: vi.fn(),
      trackItemToggled: vi.fn(),
      trackItemDeleted: vi.fn(),
      trackPageViewed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [
        { provide: STORAGE, useValue: mockStorage },
      ],
    })
    .overrideComponent(TodoListComponent, {
      set: {
        providers: [{ provide: AnalyticsService, useValue: analyticsSpy }],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(TodoService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should track page viewed on init', () => {
    expect(analyticsSpy.trackPageViewed).toHaveBeenCalledWith(0);
  });

  it('should track item added with analytics', () => {
    component.newTitle = 'Analytics test';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(analyticsSpy.trackItemAdded).toHaveBeenCalledWith('Analytics test', expect.any(String));
  });

  it('should track item toggled with analytics', () => {
    service.add('Toggle track');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.todo-checkbox').click();
    fixture.detectChanges();

    expect(analyticsSpy.trackItemToggled).toHaveBeenCalledWith(
      expect.any(String),
      true,
    );
  });

  it('should track item deleted after undo window expires', () => {
    service.add('Delete track');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.delete-btn').click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(analyticsSpy.trackItemDeleted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);
    fixture.detectChanges();

    expect(analyticsSpy.trackItemDeleted).toHaveBeenCalledWith(expect.any(String));
  });

  it('should not track deleted if undo is clicked', () => {
    service.add('Undo track');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.delete-btn').click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.undo-btn').click();
    fixture.detectChanges();

    vi.advanceTimersByTime(4000);
    expect(analyticsSpy.trackItemDeleted).not.toHaveBeenCalled();
  });

  it('should disable add button for 200ms after add (double-click guard)', () => {
    component.newTitle = 'Quick add';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.add-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    vi.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(component.addDisabled()).toBe(false);
  });

  it('should have maxlength 200 on input', () => {
    const input = fixture.nativeElement.querySelector('.todo-input');
    expect(input.getAttribute('maxlength')).toBe('200');
  });

  it('should return focus to input after adding', () => {
    component.newTitle = 'Focus test';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.todo-input'));
  });

  it('should restore item at original index on undo', () => {
    service.add('A');
    service.add('B');
    service.add('C');
    fixture.detectChanges();
    // Order: C(0), B(1), A(2)

    // Delete B (index 1)
    const deleteBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    deleteBtns[1].click();
    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    // Undo
    fixture.nativeElement.querySelector('.undo-btn').click();
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.todo-title'))
      .map((el: any) => el.textContent.trim());
    expect(titles).toEqual(['C', 'B', 'A']);
  });

  it('should clear newTitle after successful add', () => {
    component.newTitle = 'Clear me';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.newTitle).toBe('');
  });

  it('should handle rapid adds correctly', () => {
    component.newTitle = 'One';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    vi.advanceTimersByTime(200);

    component.newTitle = 'Two';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.items().length).toBe(2);
  });

  it('should persist toggle to localStorage', () => {
    service.add('Persist toggle');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.todo-checkbox').click();
    fixture.detectChanges();

    const parsed: TodoStorage = JSON.parse(mockStorage.getItem('todo_items')!);
    expect(parsed.items[0].completed).toBe(true);
  });

  it('should have storage-notice role=alert', () => {
    const brokenStorage = createMockStorage();
    brokenStorage.getItem = () => { throw new Error('SecurityError'); };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TodoListComponent],
      providers: [{ provide: STORAGE, useValue: brokenStorage }],
    });
    const fix2 = TestBed.createComponent(TodoListComponent);
    fix2.detectChanges();

    const notice = fix2.nativeElement.querySelector('.storage-notice');
    expect(notice.getAttribute('role')).toBe('alert');
    warnSpy.mockRestore();
  });
});
