import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a heading containing "Dashboard"', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const heading = compiled.querySelector('h1, h2, h3');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase()).toContain('dashboard');
  });

  it('should have a defined component class', () => {
    expect(typeof DashboardComponent).toBe('function');
  });

  it('should render without throwing errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
