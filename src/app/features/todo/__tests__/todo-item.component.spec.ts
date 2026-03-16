import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoItemComponent } from '../todo-item.component';
import { Todo } from '../todo.model';
import { ComponentRef } from '@angular/core';

describe('TodoItemComponent', () => {
  let fixture: ComponentFixture<TodoItemComponent>;
  let componentRef: ComponentRef<TodoItemComponent>;
  let el: HTMLElement;

  const baseTodo: Todo = {
    id: '1',
    title: 'Test todo',
    completed: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoItemComponent);
    componentRef = fixture.componentRef;
    el = fixture.nativeElement;
  });

  it('should render title', () => {
    componentRef.setInput('todo', baseTodo);
    fixture.detectChanges();
    const label = el.querySelector('.todo-label') as HTMLElement;
    expect(label.textContent?.trim()).toBe('Test todo');
  });

  it('should reflect checkbox state', () => {
    componentRef.setInput('todo', { ...baseTodo, completed: true });
    fixture.detectChanges();
    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should apply completed class', () => {
    componentRef.setInput('todo', { ...baseTodo, completed: true });
    fixture.detectChanges();
    expect(el.querySelector('.todo-item.completed')).toBeTruthy();
  });

  it('should emit toggled on checkbox change', () => {
    componentRef.setInput('todo', baseTodo);
    fixture.detectChanges();
    let emittedId: string | undefined;
    fixture.componentInstance.toggled.subscribe((id: string) => (emittedId = id));
    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.dispatchEvent(new Event('change'));
    expect(emittedId).toBe('1');
  });

  it('should emit deleted on button click', () => {
    componentRef.setInput('todo', baseTodo);
    fixture.detectChanges();
    let emittedId: string | undefined;
    fixture.componentInstance.deleted.subscribe((id: string) => (emittedId = id));
    const btn = el.querySelector('.todo-delete') as HTMLButtonElement;
    btn.click();
    expect(emittedId).toBe('1');
  });

  it('should have correct aria-label on delete button', () => {
    componentRef.setInput('todo', baseTodo);
    fixture.detectChanges();
    const btn = el.querySelector('.todo-delete') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Delete todo: Test todo');
  });

  it('should have title attribute on label for long text', () => {
    componentRef.setInput('todo', baseTodo);
    fixture.detectChanges();
    const label = el.querySelector('.todo-label') as HTMLElement;
    expect(label.getAttribute('title')).toBe('Test todo');
  });
});
