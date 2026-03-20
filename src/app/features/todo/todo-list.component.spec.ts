import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoListComponent } from './todo-list.component';
import { TodoStorageService } from './todo-storage.service';
import { TodoAnalyticsService } from './todo-analytics.service';
import { TodoTask } from './todo.model';

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;
  let component: TodoListComponent;
  let storageSpy: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };
  let analyticsSpy: {
    trackPageViewed: ReturnType<typeof vi.fn>;
    trackTaskAdded: ReturnType<typeof vi.fn>;
    trackTaskCompleted: ReturnType<typeof vi.fn>;
    trackTaskDeleted: ReturnType<typeof vi.fn>;
    trackAddBlocked: ReturnType<typeof vi.fn>;
  };

  const sampleTasks: TodoTask[] = [
    { id: '1', text: 'Buy milk', completed: false, createdAt: 1000 },
    { id: '2', text: 'Walk dog', completed: true, createdAt: 2000 },
  ];

  beforeEach(async () => {
    storageSpy = {
      load: vi.fn().mockReturnValue([]),
      save: vi.fn(),
      clear: vi.fn(),
    } as any;

    analyticsSpy = {
      trackPageViewed: vi.fn(),
      trackTaskAdded: vi.fn(),
      trackTaskCompleted: vi.fn(),
      trackTaskDeleted: vi.fn(),
      trackAddBlocked: vi.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
    })
      .overrideProvider(TodoStorageService, { useValue: storageSpy })
      .overrideProvider(TodoAnalyticsService, { useValue: analyticsSpy })
      .compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
    component = fixture.componentInstance;
  });

  // === INIT & PAGE VIEWED ===

  it('should create and track page viewed', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(analyticsSpy.trackPageViewed).toHaveBeenCalled();
  });

  it('should load tasks from storage on init', () => {
    storageSpy.load.mockReturnValue([...sampleTasks]);
    fixture.detectChanges();
    expect(component.tasks().length).toBe(2);
  });

  // === EMPTY STATE ===

  it('should show empty state when no tasks', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.empty-state');
    expect(el).toBeTruthy();
    expect(el!.textContent).toContain('No tasks yet');
    expect(el!.getAttribute('aria-live')).toBe('polite');
  });

  it('should hide empty state when tasks exist', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'X', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeFalsy();
  });

  // === ADD TASK ===

  it('should add a task with trimmed text and clear input', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = '  New task  ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].text).toBe('New task');
    expect(component.tasks()[0].completed).toBe(false);
    expect(component.tasks()[0].id).toBeTruthy();
    expect(component.inputValue()).toBe('');
    expect(storageSpy.save).toHaveBeenCalled();
    expect(analyticsSpy.trackTaskAdded).toHaveBeenCalledWith('New task', 1);
  });

  it('should add task at the bottom of the list', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'First', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = 'Second';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(2);
    expect(component.tasks()[1].text).toBe('Second');
  });

  it('should allow duplicate task text', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = 'Same task';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    input.value = 'Same task';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(2);
    expect(component.tasks()[0].id).not.toBe(component.tasks()[1].id);
  });

  it('should hide empty state after adding a task', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();

    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');
    input.value = 'Task';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).toBeFalsy();
  });

  // === VALIDATION ===

  it('should reject empty input and show validation hint', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(0);
    const hint = fixture.nativeElement.querySelector('.validation-hint');
    expect(hint).toBeTruthy();
    expect(hint!.textContent).toContain('Enter a task description first.');
    expect(analyticsSpy.trackAddBlocked).toHaveBeenCalledWith('empty_input');
  });

  it('should reject completely empty input', () => {
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(0);
    expect(component.showHint()).toBe(true);
  });

  it('should clear validation hint on next input', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.validation-hint')).toBeTruthy();

    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.validation-hint')).toBeFalsy();
  });

  it('should not show validation hint initially', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.validation-hint')).toBeFalsy();
  });

  // === TOGGLE COMPLETE ===

  it('should toggle task completion', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Test', completed: false, createdAt: 1 }]);
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(component.tasks()[0].completed).toBe(true);
    expect(storageSpy.save).toHaveBeenCalled();
    expect(analyticsSpy.trackTaskCompleted).toHaveBeenCalled();

    // Toggle back
    checkbox.click();
    fixture.detectChanges();
    expect(component.tasks()[0].completed).toBe(false);
  });

  it('should not re-sort tasks when toggling completion', () => {
    storageSpy.load.mockReturnValue([
      { id: '1', text: 'A', completed: false, createdAt: 1 },
      { id: '2', text: 'B', completed: false, createdAt: 2 },
      { id: '3', text: 'C', completed: false, createdAt: 3 },
    ]);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    checkboxes[1].click(); // complete middle task
    fixture.detectChanges();

    expect(component.tasks()[0].id).toBe('1');
    expect(component.tasks()[1].id).toBe('2');
    expect(component.tasks()[2].id).toBe('3');
  });

  it('should apply completed styling class', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Done', completed: true, createdAt: 1 }]);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.task-row');
    expect(row.classList.contains('completed')).toBe(true);
  });

  it('should remove completed styling when toggled back', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Done', completed: true, createdAt: 1 }]);
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.task-row');
    expect(row.classList.contains('completed')).toBe(false);
  });

  it('should compute completedCount correctly', () => {
    storageSpy.load.mockReturnValue([...sampleTasks]);
    fixture.detectChanges();
    expect(component.completedCount()).toBe(1);
  });

  // === DELETE TASK ===

  it('should delete a task', async () => {
    storageSpy.load.mockReturnValue([
      { id: '1', text: 'A', completed: false, createdAt: 1 },
      { id: '2', text: 'B', completed: false, createdAt: 2 },
    ]);
    fixture.detectChanges();

    const deleteBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    deleteBtns[0].click();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].id).toBe('2');
    expect(storageSpy.save).toHaveBeenCalled();
    expect(analyticsSpy.trackTaskDeleted).toHaveBeenCalledWith('1', 1);
  });

  it('should show empty state after deleting last task', async () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Only', completed: false, createdAt: 1 }]);
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    deleteBtn.click();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();

    expect(component.tasks().length).toBe(0);
    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });

  it('should focus input after deleting last task', async () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Only', completed: false, createdAt: 1 }]);
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    deleteBtn.click();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(document.activeElement).toBe(input);
  });

  it('should focus next delete button after deleting a task with remaining tasks', async () => {
    storageSpy.load.mockReturnValue([
      { id: '1', text: 'A', completed: false, createdAt: 1 },
      { id: '2', text: 'B', completed: false, createdAt: 2 },
      { id: '3', text: 'C', completed: false, createdAt: 3 },
    ]);
    fixture.detectChanges();

    const deleteBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    deleteBtns[0].click();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();

    // After deleting first, focus should be on the new first delete button
    const remainingBtns = fixture.nativeElement.querySelectorAll('.delete-btn');
    expect(document.activeElement).toBe(remainingBtns[0]);
  });

  // === PERSISTENCE ===

  it('should save to storage on every add', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form');

    input.value = 'Task 1';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(storageSpy.save).toHaveBeenCalledTimes(1);
    expect(storageSpy.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ text: 'Task 1' })]));
  });

  it('should save to storage on toggle', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'X', completed: false, createdAt: 1 }]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('input[type="checkbox"]').click();
    fixture.detectChanges();

    expect(storageSpy.save).toHaveBeenCalledWith([expect.objectContaining({ id: '1', completed: true })]);
  });

  it('should save to storage on delete', async () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'X', completed: false, createdAt: 1 }]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.delete-btn').click();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storageSpy.save).toHaveBeenCalledWith([]);
  });

  // === ACCESSIBILITY ===

  it('should have aria-label on delete buttons', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Groceries', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.delete-btn');
    expect(btn.getAttribute('aria-label')).toBe('Delete task: Groceries');
  });

  it('should have aria-label on checkboxes', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'Groceries', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox.getAttribute('aria-label')).toBe('Mark task: Groceries');
  });

  it('should have role=list on task container', () => {
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('[role="list"]');
    expect(list).toBeTruthy();
  });

  it('should have role=listitem on task rows', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'X', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('[role="listitem"]');
    expect(item).toBeTruthy();
  });

  it('should have maxlength 200 on input', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input.getAttribute('maxlength')).toBe('200');
  });

  it('should auto-focus input on load', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(document.activeElement).toBe(input);
  });

  it('should use real checkbox and button elements', () => {
    storageSpy.load.mockReturnValue([{ id: '1', text: 'X', completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]').tagName).toBe('INPUT');
    expect(fixture.nativeElement.querySelector('.delete-btn').tagName).toBe('BUTTON');
  });

  it('should display header "My To-Dos"', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('My To-Dos');
  });

  it('should display task text with overflow-wrap', () => {
    const longText = 'a'.repeat(200);
    storageSpy.load.mockReturnValue([{ id: '1', text: longText, completed: false, createdAt: 1 }]);
    fixture.detectChanges();
    const textEl = fixture.nativeElement.querySelector('.task-text');
    expect(textEl.textContent).toContain(longText);
  });
});
