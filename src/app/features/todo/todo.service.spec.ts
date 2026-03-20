import { TestBed } from '@angular/core/testing';
import { TodoService } from './todo.service';
import { STORAGE } from './storage.token';
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

describe('TodoService', () => {
  let service: TodoService;
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: mockStorage },
      ],
    });
    service = TestBed.inject(TodoService);
  });

  it('should start with empty items', () => {
    expect(service.items()).toEqual([]);
    expect(service.storageAvailable()).toBe(true);
  });

  it('should add an item at the top', () => {
    service.add('First');
    service.add('Second');
    expect(service.items().length).toBe(2);
    expect(service.items()[0].title).toBe('Second');
    expect(service.items()[1].title).toBe('First');
  });

  it('should persist items in versioned envelope', () => {
    service.add('Test');
    const raw = mockStorage.getItem('todo_items');
    expect(raw).toBeTruthy();
    const parsed: TodoStorage = JSON.parse(raw!);
    expect(parsed.version).toBe(CURRENT_STORAGE_VERSION);
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].title).toBe('Test');
  });

  it('should toggle item completion', () => {
    service.add('Toggle me');
    const id = service.items()[0].id;
    expect(service.items()[0].completed).toBe(false);
    service.toggle(id);
    expect(service.items()[0].completed).toBe(true);
    service.toggle(id);
    expect(service.items()[0].completed).toBe(false);
  });

  it('should delete and restore items', () => {
    service.add('Keep');
    service.add('Delete me');
    const id = service.items()[0].id;
    const deleted = service.delete(id);
    expect(deleted).toBeTruthy();
    expect(deleted!.title).toBe('Delete me');
    expect(service.items().length).toBe(1);

    service.restoreDeleted(deleted!, 0);
    expect(service.items().length).toBe(2);
    expect(service.items()[0].title).toBe('Delete me');
  });

  it('should finalize delete by persisting', () => {
    service.add('To delete');
    service.delete(service.items()[0].id);
    service.finalizeDelete();
    const parsed: TodoStorage = JSON.parse(mockStorage.getItem('todo_items')!);
    expect(parsed.items.length).toBe(0);
  });

  it('should hydrate from localStorage on construction', () => {
    const envelope: TodoStorage = {
      version: 1,
      items: [{ id: '1', title: 'Saved', completed: true, createdAt: '2026-01-01T00:00:00.000Z' }],
    };
    mockStorage.setItem('todo_items', JSON.stringify(envelope));

    const service2 = TestBed.inject(TodoService);
    // Same instance due to providedIn root, so create fresh
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: mockStorage },
      ],
    });
    const freshService = TestBed.inject(TodoService);
    expect(freshService.items().length).toBe(1);
    expect(freshService.items()[0].title).toBe('Saved');
    expect(freshService.items()[0].completed).toBe(true);
  });

  it('should handle corrupted localStorage data', () => {
    mockStorage.setItem('todo_items', 'not json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: mockStorage },
      ],
    });
    const freshService = TestBed.inject(TodoService);
    expect(freshService.items()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    expect(mockStorage.getItem('todo_items')).toBeNull();
    warnSpy.mockRestore();
  });

  it('should handle unrecognized storage format', () => {
    mockStorage.setItem('todo_items', JSON.stringify({ foo: 'bar' }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: mockStorage },
      ],
    });
    const freshService = TestBed.inject(TodoService);
    expect(freshService.items()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should handle localStorage unavailable (throws on getItem)', () => {
    const brokenStorage = createMockStorage();
    brokenStorage.getItem = () => { throw new Error('SecurityError'); };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: brokenStorage },
      ],
    });
    const freshService = TestBed.inject(TodoService);
    expect(freshService.items()).toEqual([]);
    expect(freshService.storageAvailable()).toBe(false);
    warnSpy.mockRestore();
  });

  it('should handle quota exceeded on persist', () => {
    const quotaStorage = createMockStorage();
    quotaStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        { provide: STORAGE, useValue: quotaStorage },
      ],
    });
    const freshService = TestBed.inject(TodoService);
    freshService.add('Test');
    // Item still added in-memory
    expect(freshService.items().length).toBe(1);
    expect(freshService.storageAvailable()).toBe(false);
    warnSpy.mockRestore();
  });

  it('should generate items with proper fields', () => {
    const item = service.add('My task');
    expect(item.id).toBeTruthy();
    expect(item.title).toBe('My task');
    expect(item.completed).toBe(false);
    expect(item.createdAt).toBeTruthy();
    // Verify ISO-8601
    expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
  });
});
