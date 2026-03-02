import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of, BehaviorSubject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { SidenavComponent } from './sidenav.component';
import { SidenavService } from './sidenav.service';
import { SidenavState } from './sidenav.models';

describe('SidenavComponent', () => {
  let fixture: ComponentFixture<SidenavComponent>;
  let component: SidenavComponent;
  let fakeSidenavService: {
    state$: BehaviorSubject<SidenavState>;
    isOpen$: ReturnType<typeof of>;
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    toggle: ReturnType<typeof vi.fn>;
    setBreakpoint: ReturnType<typeof vi.fn>;
    syncOpenedState: ReturnType<typeof vi.fn>;
    snapshot: SidenavState;
  };

  const initialState: SidenavState = { isOpen: false, breakpoint: 'desktop' };

  beforeEach(async () => {
    const stateSubject = new BehaviorSubject<SidenavState>(initialState);

    fakeSidenavService = {
      state$: stateSubject,
      isOpen$: stateSubject.asObservable(),
      open: vi.fn(),
      close: vi.fn(),
      toggle: vi.fn(),
      setBreakpoint: vi.fn(),
      syncOpenedState: vi.fn(),
      get snapshot() {
        return stateSubject.getValue();
      },
    };

    await TestBed.configureTestingModule({
      imports: [SidenavComponent],
      providers: [
        { provide: SidenavService, useValue: fakeSidenavService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a mat-nav-list landmark element', () => {
    const matNavList = fixture.debugElement.query(By.css('mat-nav-list'));
    expect(matNavList).toBeTruthy();
  });

  it('should render navigation links inside mat-nav-list', () => {
    const matNavList = fixture.debugElement.query(By.css('mat-nav-list'));
    expect(matNavList).toBeTruthy();
    const links = matNavList.queryAll(By.css('a'));
    expect(links.length).toBeGreaterThan(0);
  });

  it('should have role navigation accessible via mat-nav-list', () => {
    // mat-nav-list renders with role="navigation" natively
    const navListEl: HTMLElement = fixture.debugElement.query(
      By.css('mat-nav-list')
    ).nativeElement;
    // mat-nav-list sets role="navigation" on the host element
    const role = navListEl.getAttribute('role');
    // Accept either explicit role="navigation" or the semantic nav element
    const isNavigationLandmark =
      role === 'navigation' || navListEl.tagName.toLowerCase() === 'nav';
    expect(isNavigationLandmark).toBe(true);
  });

  it('should not render a bare <nav> element (uses mat-nav-list instead)', () => {
    const nativeNav = fixture.debugElement.query(By.css('nav'));
    // The component uses mat-nav-list, not a bare <nav> element
    expect(nativeNav).toBeNull();
  });
});
