import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { TodoComponent } from './todo.component';

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a heading containing "To-Do"', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const heading = compiled.querySelector('h1, h2, h3');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toMatch(/to-?do/i);
  });

  it('should have a defined template with at least one element', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.children.length).toBeGreaterThan(0);
  });

  it('should not throw errors on initialization', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
