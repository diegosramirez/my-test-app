import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a heading with "Home" text', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const heading = compiled.querySelector('h1, h2');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase()).toContain('home');
  });

  it('should have a host element with content', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent?.trim().length).toBeGreaterThan(0);
  });
});
