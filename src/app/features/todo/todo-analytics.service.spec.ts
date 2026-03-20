import { TestBed } from '@angular/core/testing';
import { TodoAnalyticsService } from './todo-analytics.service';

describe('TodoAnalyticsService', () => {
  let service: TodoAnalyticsService;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoAnalyticsService);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('trackPageViewed logs todo_page_viewed with timestamp', () => {
    service.trackPageViewed();
    expect(logSpy).toHaveBeenCalledWith('todo_page_viewed', expect.objectContaining({ timestamp: expect.any(Number) }));
  });

  it('trackTaskAdded logs event with taskText and totalTasks', () => {
    service.trackTaskAdded('Buy milk', 3);
    expect(logSpy).toHaveBeenCalledWith('todo_task_added', expect.objectContaining({ taskText: 'Buy milk', totalTasks: 3 }));
  });

  it('trackTaskCompleted logs event with taskId and totalCompleted', () => {
    service.trackTaskCompleted('abc', 2);
    expect(logSpy).toHaveBeenCalledWith('todo_task_completed', expect.objectContaining({ taskId: 'abc', totalCompleted: 2 }));
  });

  it('trackTaskDeleted logs event with taskId and remainingTasks', () => {
    service.trackTaskDeleted('xyz', 5);
    expect(logSpy).toHaveBeenCalledWith('todo_task_deleted', expect.objectContaining({ taskId: 'xyz', remainingTasks: 5 }));
  });

  it('trackAddBlocked logs event with reason', () => {
    service.trackAddBlocked('empty_input');
    expect(logSpy).toHaveBeenCalledWith('todo_add_blocked', expect.objectContaining({ reason: 'empty_input' }));
  });
});
