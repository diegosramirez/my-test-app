import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a heading with "Settings" text', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const heading = compiled.querySelector('h1, h2, h3');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase()).toContain('settings');
  });

  it('should have a defined component class', () => {
    expect(typeof SettingsComponent).toBe('function');
  });

  it('should render without throwing errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should contain a root element in the template', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.children.length).toBeGreaterThan(0);
  });
});
