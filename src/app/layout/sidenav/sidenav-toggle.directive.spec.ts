import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { SidenavToggleDirective } from './sidenav-toggle.directive';
import { SidenavService } from './sidenav.service';
import { SidenavState } from './sidenav.models';

// ---------------------------------------------------------------------------
// Minimal host component
// ---------------------------------------------------------------------------
@Component({
  standalone: true,
  imports: [SidenavToggleDirective],
  template: `<button appSidenavToggle type="button">Toggle</button>`,
})
class TestHostComponent {}

// ---------------------------------------------------------------------------
// Fake service
// ---------------------------------------------------------------------------
const DEFAULT_STATE: SidenavState = { isOpen: false, breakpoint: 'desktop', mode: 'side' };

class FakeSidenavService {
  private _state$ = new BehaviorSubject<SidenavState>({ ...DEFAULT_STATE });

  readonly state$ = this._state$.asObservable();
  readonly isOpen$ = this._state$.asObservable();

  get snapshot(): SidenavState {
    return this._state$.getValue();
  }

  toggle = vi.fn(() => {
    const current = this._state$.getValue();
    this._state$.next({ ...current, isOpen: !current.isOpen });
  });

  open = vi.fn(() => {
    this._state$.next({ ...this._state$.getValue(), isOpen: true });
  });

  close = vi.fn(() => {
    this._state$.next({ ...this._state$.getValue(), isOpen: false });
  });

  setBreakpoint = vi.fn();
  syncOpenedState = vi.fn();

  /** Test helper — push arbitrary state */
  _pushState(partial: Partial<SidenavState>): void {
    this._state$.next({ ...this._state$.getValue(), ...partial });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getButton(fixture: ComponentFixture<TestHostComponent>): DebugElement {
  return fixture.debugElement.query(By.css('button'));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SidenavToggleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let fakeService: FakeSidenavService;
  let buttonEl: HTMLButtonElement;

  beforeEach(async () => {
    fakeService = new FakeSidenavService();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: SidenavService, useValue: fakeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    buttonEl = getButton(fixture).nativeElement as HTMLButtonElement;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Existence
  // -------------------------------------------------------------------------
  it('should create the directive', () => {
    const directiveInstance = getButton(fixture).injector.get(SidenavToggleDirective);
    expect(directiveInstance).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Click → toggle
  // -------------------------------------------------------------------------
  it('should call sidenavService.toggle() when the host element is clicked', () => {
    buttonEl.click();
    expect(fakeService.toggle).toHaveBeenCalledTimes(1);
  });

  it('should call toggle() on each successive click', () => {
    buttonEl.click();
    buttonEl.click();
    buttonEl.click();
    expect(fakeService.toggle).toHaveBeenCalledTimes(3);
  });

  // -------------------------------------------------------------------------
  // aria-expanded host binding
  // NOTE: The directive no longer sets [attr.aria-expanded] on the host.
  // aria-expanded is managed exclusively by the template in
  // sidenav-container.component.html to avoid conflicting bindings.
  // These tests verify the attribute is NOT set by the directive itself.
  // -------------------------------------------------------------------------
  it('should NOT set aria-expanded on the host element (attribute managed by template)', () => {
    // The directive must not independently set aria-expanded; the template owns it.
    // After initial render with isOpen=false the directive should leave the
    // attribute absent (or not touch it at all).
    const attrValue = buttonEl.getAttribute('aria-expanded');
    // The directive does not set the attribute, so it should be null unless
    // the host template sets it. In this isolated test host there is no
    // template binding, so it must be null.
    expect(attrValue).toBeNull();
  });

  it('should NOT update aria-expanded when service emits isOpen=true', () => {
    fakeService._pushState({ isOpen: true });
    fixture.detectChanges();

    const attrValue = buttonEl.getAttribute('aria-expanded');
    // Still null — directive does not own this attribute.
    expect(attrValue).toBeNull();
  });

  it('should NOT update aria-expanded when service emits isOpen=false', () => {
    fakeService._pushState({ isOpen: true });
    fixture.detectChanges();

    fakeService._pushState({ isOpen: false });
    fixture.detectChanges();

    expect(buttonEl.getAttribute('aria-expanded')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // isOpen field reflects service state (internal state tracking)
  // -------------------------------------------------------------------------
  it('should track isOpen=false initially', () => {
    const dir = getButton(fixture).injector.get(SidenavToggleDirective);
    expect(dir.isOpen).toBe(false);
  });

  it('should update isOpen to true when service emits isOpen=true', () => {
    const dir = getButton(fixture).injector.get(SidenavToggleDirective);
    fakeService._pushState({ isOpen: true });
    fixture.detectChanges();
    expect(dir.isOpen).toBe(true);
  });

  it('should update isOpen to false after toggling back', () => {
    const dir = getButton(fixture).injector.get(SidenavToggleDirective);

    fakeService._pushState({ isOpen: true });
    fixture.detectChanges();
    expect(dir.isOpen).toBe(true);

    fakeService._pushState({ isOpen: false });
    fixture.detectChanges();
    expect(dir.isOpen).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Cleanup — no subscription leaks
  // -------------------------------------------------------------------------
  it('should unsubscribe from service on destroy without throwing', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });

  it('should not react to service emissions after destroy', () => {
    const dir = getButton(fixture).injector.get(SidenavToggleDirective);
    fixture.destroy();

    // Push state after destroy — should not throw or update
    expect(() => fakeService._pushState({ isOpen: true })).not.toThrow();
    // isOpen should remain at the last value before destroy (false)
    expect(dir.isOpen).toBe(false);
  });
});
