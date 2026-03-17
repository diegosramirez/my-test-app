import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NotificationEmptyStateComponent } from './notification-empty-state.component';

describe('NotificationEmptyStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationEmptyStateComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NotificationEmptyStateComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display "No notifications yet" text', () => {
    const fixture = TestBed.createComponent(NotificationEmptyStateComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No notifications yet');
  });

  it('should render an SVG illustration', () => {
    const fixture = TestBed.createComponent(NotificationEmptyStateComponent);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
