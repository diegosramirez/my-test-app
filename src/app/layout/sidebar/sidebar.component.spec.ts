import { TestBed, } from '@angular/core/testing';
import { reflectComponentType } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AnalyticsService } from '../../services/analytics.service';
import { routes } from '../../app.routes';
import { NavItem } from '../../models/nav-item.model';

describe('SidebarComponent', () => {
  let analyticsSpy: { track: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    analyticsSpy = { track: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter(routes),
        { provide: AnalyticsService, useValue: analyticsSpy },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('should be standalone', () => {
    const mirror = reflectComponentType(SidebarComponent);
    expect(mirror).toBeTruthy();
    expect(mirror!.isStandalone).toBe(true);
  });

  it('should have four nav items', () => {
    const comp = createComponent().componentInstance;
    expect(comp.navItems.length).toBe(4);
    expect(comp.navItems.map((n: NavItem) => n.label)).toEqual([
      'Dashboard', 'Transactions', 'Budget', 'Settings',
    ]);
  });

  it('should have correct routes for nav items', () => {
    const comp = createComponent().componentInstance;
    expect(comp.navItems.map((n: NavItem) => n.route)).toEqual([
      '/', '/transactions', '/budget', '/settings',
    ]);
  });

  it('should render four navigation links', () => {
    const fixture = createComponent();
    const links = fixture.nativeElement.querySelectorAll('.nav-link');
    expect(links.length).toBe(4);
  });

  it('should render nav element with aria-label "Main navigation"', () => {
    const fixture = createComponent();
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('should render hamburger button with aria attributes', () => {
    const fixture = createComponent();
    const btn = fixture.nativeElement.querySelector('.hamburger-btn');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Toggle navigation menu');
    expect(btn.getAttribute('aria-controls')).toBe('sidebar-nav');
    expect(btn.hasAttribute('aria-expanded')).toBe(true);
  });

  it('should have aria-expanded=false initially', () => {
    const fixture = createComponent();
    const btn = fixture.nativeElement.querySelector('.hamburger-btn');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('should toggle isSidebarOpen on toggleSidebar()', () => {
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    expect(comp.isSidebarOpen).toBe(false);
    comp.toggleSidebar();
    expect(comp.isSidebarOpen).toBe(true);
    comp.toggleSidebar();
    expect(comp.isSidebarOpen).toBe(false);
  });

  it('should update aria-expanded when sidebar opens', () => {
    const fixture = createComponent();
    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.hamburger-btn');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('should add "open" class to sidebar when open', () => {
    const fixture = createComponent();
    const sidebar = fixture.nativeElement.querySelector('.sidebar');
    expect(sidebar.classList.contains('open')).toBe(false);
    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    expect(sidebar.classList.contains('open')).toBe(true);
  });

  it('should render backdrop when sidebar is open', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeTruthy();
  });

  it('should close sidebar when backdrop is clicked', () => {
    const fixture = createComponent();
    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.backdrop');
    backdrop.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isSidebarOpen).toBe(false);
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
  });

  it('should fire nav_link_clicked analytics on link click', () => {
    const fixture = createComponent();
    const comp = fixture.componentInstance;
    comp.onNavLinkClick({ label: 'Budget', route: '/budget', icon: '📋' });
    expect(analyticsSpy.track).toHaveBeenCalledWith('nav_link_clicked', { route_path: '/budget' });
  });

  it('should not fire analytics on programmatic close', () => {
    const fixture = createComponent();
    fixture.componentInstance.closeSidebar();
    expect(analyticsSpy.track).not.toHaveBeenCalled();
  });

  it('should render icons for each nav item', () => {
    const fixture = createComponent();
    const icons = fixture.nativeElement.querySelectorAll('.nav-icon');
    expect(icons.length).toBe(4);
    icons.forEach((icon: HTMLElement) => {
      expect(icon.textContent!.trim().length).toBeGreaterThan(0);
    });
  });

  it('should render labels for each nav item', () => {
    const fixture = createComponent();
    const labels = fixture.nativeElement.querySelectorAll('.nav-label');
    const texts = Array.from(labels).map((l: any) => l.textContent.trim());
    expect(texts).toEqual(['Dashboard', 'Transactions', 'Budget', 'Settings']);
  });

  it('should render sidebar header with "Finance Tracker"', () => {
    const fixture = createComponent();
    const header = fixture.nativeElement.querySelector('.sidebar-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Finance Tracker');
  });

  it('should render mobile header with "Finance Tracker"', () => {
    const fixture = createComponent();
    const title = fixture.nativeElement.querySelector('.mobile-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Finance Tracker');
  });

  it('sidebar nav should have id matching aria-controls', () => {
    const fixture = createComponent();
    const nav = fixture.nativeElement.querySelector('#sidebar-nav');
    expect(nav).toBeTruthy();
    const btn = fixture.nativeElement.querySelector('.hamburger-btn');
    expect(btn.getAttribute('aria-controls')).toBe('sidebar-nav');
  });

  it('each nav item should have icon field', () => {
    const comp = createComponent().componentInstance;
    comp.navItems.forEach((item: NavItem) => {
      expect(item.icon).toBeTruthy();
      expect(typeof item.icon).toBe('string');
    });
  });

  it('closeSidebarOnMobile should not close on desktop width', () => {
    const fixture = createComponent();
    fixture.componentInstance.isSidebarOpen = true;
    // Default jsdom innerWidth is 1024, which is >= 768
    fixture.componentInstance.closeSidebarOnMobile();
    expect(fixture.componentInstance.isSidebarOpen).toBe(true);
  });
});
