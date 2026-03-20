import { TestBed } from '@angular/core/testing';
import { TodoStorageService } from './todo-storage.service';
import { TodoTask } from './todo.model';

describe('TodoStorageService', () => {
  let service: TodoStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoStorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  const makeTasks = (): TodoTask[] => [
    { id: 'a', text: 'Task A', completed: false, createdAt: 1000 },
    { id: 'b', text: 'Task B', completed: true, createdAt: 2000 },
  ];

  it('should return empty array when localStorage is empty', () => {
    expect(service.load()).toEqual([]);
  });

  it('should round-trip save and load tasks in versioned envelope', () => {
    const tasks = makeTasks();
    service.save(tasks);
    expect(service.load()).toEqual(tasks);
  });

  it('should return empty array for corrupted JSON', () => {
    localStorage.setItem('todo_tasks', '{bad json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(service.load()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should return empty array for non-array tasks field', () => {
    localStorage.setItem('todo_tasks', JSON.stringify({ version: 1, tasks: 'not-an-array' }));
    expect(service.load()).toEqual([]);
  });

  it('should return empty array for object without version field', () => {
    localStorage.setItem('todo_tasks', JSON.stringify({ tasks: [] }));
    expect(service.load()).toEqual([]);
  });

  it('should return empty array for null stored value parsed as string', () => {
    localStorage.setItem('todo_tasks', 'null');
    expect(service.load()).toEqual([]);
  });

  it('should return empty array for number stored value', () => {
    localStorage.setItem('todo_tasks', '42');
    expect(service.load()).toEqual([]);
  });

  it('should return empty array for string stored value', () => {
    localStorage.setItem('todo_tasks', '"hello"');
    expect(service.load()).toEqual([]);
  });

  it('should handle plain array fallback (legacy format)', () => {
    const tasks = makeTasks();
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
    expect(service.load()).toEqual(tasks);
  });

  it('should store data as versioned envelope with version 1', () => {
    service.save(makeTasks());
    const raw = JSON.parse(localStorage.getItem('todo_tasks')!);
    expect(raw.version).toBe(1);
    expect(Array.isArray(raw.tasks)).toBe(true);
    expect(raw.tasks.length).toBe(2);
  });

  it('should save empty array correctly', () => {
    service.save([]);
    const raw = JSON.parse(localStorage.getItem('todo_tasks')!);
    expect(raw.version).toBe(1);
    expect(raw.tasks).toEqual([]);
  });

  it('should clear stored data', () => {
    service.save(makeTasks());
    service.clear();
    expect(localStorage.getItem('todo_tasks')).toBeNull();
    expect(service.load()).toEqual([]);
  });

  it('should handle QuotaExceededError on save gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => service.save(makeTasks())).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should handle localStorage.getItem throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(service.load()).toEqual([]);
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should handle localStorage.removeItem throwing on clear', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => service.clear()).not.toThrow();
    spy.mockRestore();
  });

  it('should preserve task completed state through round-trip', () => {
    const tasks = makeTasks();
    service.save(tasks);
    const loaded = service.load();
    expect(loaded[0].completed).toBe(false);
    expect(loaded[1].completed).toBe(true);
  });
});
