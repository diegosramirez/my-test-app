import { TestBed } from '@angular/core/testing';
import { TasksPage } from './tasks-page';
import { describe, it, expect } from 'vitest';

describe('TasksPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [TasksPage]
    }).compileComponents();
    const fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render heading with text "Tasks"', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading!.textContent).toContain('Tasks');
  });

  it('should style heading in darkred', async () => {
    const fixture = await setup();
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.style.color).toBe('darkred');
  });

  it('should have exactly one h1 element', async () => {
    const fixture = await setup();
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
  });
});
