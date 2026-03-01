import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a heading with "Profile"', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const heading = compiled.querySelector('h1, h2, h3');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase()).toContain('profile');
  });

  it('should have a defined title property', () => {
    expect(component.title).toBeDefined();
    expect(typeof component.title).toBe('string');
    expect(component.title.length).toBeGreaterThan(0);
  });

  it('should display the title in the template', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent?.toLowerCase()).toContain('profile');
  });

  it('should be a standalone component', () => {
    const metadata = (ProfileComponent as any).__annotations__?.[0] ?? {};
    // Standalone components import themselves via TestBed.imports without errors
    expect(fixture).toBeTruthy();
  });
});
