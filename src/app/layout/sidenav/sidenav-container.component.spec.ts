import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

import { SidenavContainerComponent } from './sidenav-container.component';
import { SidenavService } from './sidenav.service';
import { SidenavState, SidenavMode } from './sidenav.models';

// ---------------------------------------------------------------------------
// Stub components
// ---------------------------------------------------------------------------

@Component({ selector: 'app-sidenav', template: '', standalone: false })
class SidenavStubComponent {}

@Component({ selector: 'app-sidenav-toggle', template: '', standalone: false })
class SidenavToggleStubComponent {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNavigationEnd(id = 1, url = '/'): NavigationEnd {
  return new NavigationEnd(id, url, url);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SidenavContainerComponent', () => {
  let component: SidenavContainerComponent;
  let fixture: ComponentFixture<SidenavContainerComponent>;

  // Mocks — created before configureTestingModule so spies are in place
  // before Angular DI resolves providers.
  let routerEventsSubject: Subject<unknown>;
  let mockRouter: { events: Subject<unknown> };

  let breakpointSubject: BehaviorSubject<BreakpointState>;
  let mockBreakpointObserver: { observe: jest.Mock };

  let stateSubject: BehaviorSubject<SidenavState>;
  let mockSidenavService: {
    state$: BehaviorSubject<SidenavState>;
    isOpen$: BehaviorSubject<boolean>;
    open: jest.Mock;
    close: jest.Mock;
    toggle: jest.Mock;
    syncOpenedState: jest.Mock;
    setMode: jest.Mock;
  };

  beforeEach(() => {
    // ------------------------------------------------------------------
    // Build mocks BEFORE configureTestingModule so that any DI resolution
    // that happens during compileComponents / module init already sees the
    // correct values (including the router events getter).
    // ------------------------------------------------------------------

    routerEventsSubject = new Subject<unknown>();

    // Use a getter from the start so the value is always the live subject,
    // regardless of when Angular resolves the dependency.
    mockRouter = {
      get events() {
        return routerEventsSubject;
      },
    } as unknown as { events: Subject<unknown> };

    breakpointSubject = new BehaviorSubject<BreakpointState>({
      matches: false,
      breakpoints: {},
    });

    mockBreakpointObserver = {
      observe: jest.fn().mockReturnValue(breakpointSubject.asObservable()),
    };

    const initialState: SidenavState = {
      isOpen: true,
      mode: 'side' as SidenavMode,
      breakpoint: 'desktop',
    };

    stateSubject = new BehaviorSubject<SidenavState>(initialState);

    mockSidenavService = {
      state$: stateSubject,
      isOpen$: new BehaviorSubject<boolean>(true),
      open: jest.fn(),
      close: jest.fn(),
      toggle: jest.fn(),
      syncOpenedState: jest.fn(),
      setMode: jest.fn(),
    };

    // ------------------------------------------------------------------
    // Configure testing module AFTER mocks are fully constructed.
    // ------------------------------------------------------------------

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatSidenavModule],
      declarations: [
        SidenavContainerComponent,
        SidenavStubComponent,
        SidenavToggleStubComponent,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
        { provide: SidenavService, useValue: mockSidenavService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidenavContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Creation
  // -------------------------------------------------------------------------

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // isMobile$ — breakpoint observer integration
  // -------------------------------------------------------------------------

  describe('isMobile$', () => {
    it('should emit false when breakpoint does not match (desktop)', (done) => {
      breakpointSubject.next({ matches: false, breakpoints: {} });

      component.isMobile$.subscribe((isMobile) => {
        expect(isMobile).toBe(false);
        done();
      });
    });

    it('should emit true when breakpoint matches (mobile)', (done) => {
      breakpointSubject.next({ matches: true, breakpoints: {} });

      component.isMobile$.subscribe((isMobile) => {
        expect(isMobile).toBe(true);
        done();
      });
    });
  });

  // -------------------------------------------------------------------------
  // state$ — service state passthrough
  // -------------------------------------------------------------------------

  describe('state$', () => {
    it('should emit the current state from SidenavService', (done) => {
      component.state$.subscribe((state) => {
        expect(state.isOpen).toBe(true);
        expect(state.mode).toBe('side');
        done();
      });
    });

    it('should reflect updated state when service emits a new value', (done) => {
      const updatedState: SidenavState = {
        isOpen: false,
        mode: 'over' as SidenavMode,
        breakpoint: 'mobile',
      };

      const emissions: SidenavState[] = [];

      component.state$.subscribe((state) => {
        emissions.push(state);
        if (emissions.length === 2) {
          expect(emissions[1].isOpen).toBe(false);
          expect(emissions[1].mode).toBe('over');
          done();
        }
      });

      stateSubject.next(updatedState);
    });
  });

  // -------------------------------------------------------------------------
  // onOpenedChange
  // -------------------------------------------------------------------------

  describe('onOpenedChange()', () => {
    it('should call syncOpenedState with true when sidenav opens', () => {
      component.onOpenedChange(true);
      expect(mockSidenavService.syncOpenedState).toHaveBeenCalledWith(true);
    });

    it('should call syncOpenedState with false when sidenav closes', () => {
      component.onOpenedChange(false);
      expect(mockSidenavService.syncOpenedState).toHaveBeenCalledWith(false);
    });
  });

  // -------------------------------------------------------------------------
  // Router NavigationEnd — auto-close on mobile
  // -------------------------------------------------------------------------

  describe('router NavigationEnd handling', () => {
    it('should close sidenav on NavigationEnd when on mobile', () => {
      // Simulate mobile breakpoint active
      breakpointSubject.next({ matches: true, breakpoints: {} });
      fixture.detectChanges();

      routerEventsSubject.next(makeNavigationEnd(1, '/some-route'));

      expect(mockSidenavService.close).toHaveBeenCalled();
    });

    it('should NOT close sidenav on NavigationEnd when on desktop', () => {
      // Ensure desktop breakpoint
      breakpointSubject.next({ matches: false, breakpoints: {} });
      fixture.detectChanges();

      routerEventsSubject.next(makeNavigationEnd(1, '/some-route'));

      expect(mockSidenavService.close).not.toHaveBeenCalled();
    });

    it('should NOT react to non-NavigationEnd router events', () => {
      breakpointSubject.next({ matches: true, breakpoints: {} });
      fixture.detectChanges();

      // Emit a generic object that is not a NavigationEnd instance
      routerEventsSubject.next({ id: 1 });

      expect(mockSidenavService.close).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // ngOnDestroy — teardown
  // -------------------------------------------------------------------------

  describe('ngOnDestroy()', () => {
    it('should complete internal subscriptions without errors', () => {
      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
