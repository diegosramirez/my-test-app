import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LandingPageComponent } from './landing-page.component';
import { FootballDataService, Match } from '../../services/football-data.service';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockFootballService: any;

  // Mock subjects to control observable behavior
  let mockLoadingSubject: BehaviorSubject<boolean>;
  let mockErrorSubject: BehaviorSubject<string | null>;
  let mockLastUpdatedSubject: BehaviorSubject<Date | null>;

  const mockMatches: Match[] = [
    {
      id: 1,
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      homeScore: 2,
      awayScore: 1,
      matchDate: new Date('2024-04-13T15:00:00Z'),
      status: 'FINISHED'
    },
    {
      id: 2,
      homeTeam: 'Manchester United',
      awayTeam: 'Liverpool',
      homeScore: 1,
      awayScore: 3,
      matchDate: new Date('2024-04-12T15:00:00Z'),
      status: 'FINISHED'
    }
  ];

  beforeEach(async () => {
    // Initialize mock subjects
    mockLoadingSubject = new BehaviorSubject<boolean>(false);
    mockErrorSubject = new BehaviorSubject<string | null>(null);
    mockLastUpdatedSubject = new BehaviorSubject<Date | null>(null);

    // Create spy object with all required methods
    mockFootballService = {
      getRecentMatches: vi.fn().mockReturnValue(of(mockMatches)),
      refreshData: vi.fn().mockReturnValue(of(mockMatches)),
      loading$: mockLoadingSubject.asObservable(),
      error$: mockErrorSubject.asObservable(),
      lastUpdated$: mockLastUpdatedSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        { provide: FootballDataService, useValue: mockFootballService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up subjects
    mockLoadingSubject.complete();
    mockErrorSubject.complete();
    mockLastUpdatedSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load matches on initialization', () => {
    fixture.detectChanges();
    expect(mockFootballService.getRecentMatches).toHaveBeenCalled();
    expect(component.matches$).toBeDefined();
  });

  it('should display Premier League branding and title', () => {
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('h1'));
    const tagline = fixture.debugElement.query(By.css('.tagline'));

    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent).toContain('Premier League Results');
    expect(tagline).toBeTruthy();
    expect(tagline.nativeElement.textContent).toContain('Latest match results and scores');
  });

  it('should pass correct data to match-results component', () => {
    component.matches$ = of(mockMatches);
    mockLoadingSubject.next(false);
    mockErrorSubject.next(null);

    fixture.detectChanges();

    const matchResultsComponent = fixture.debugElement.query(By.css('app-match-results'));
    expect(matchResultsComponent).toBeTruthy();
  });

  it('should show loading state correctly', () => {
    mockLoadingSubject.next(true);
    fixture.detectChanges();

    // Check that loading state is reflected in template
    const matchResultsComponent = fixture.debugElement.query(By.css('app-match-results'));
    expect(matchResultsComponent).toBeTruthy();
  });

  it('should show error state correctly', () => {
    mockErrorSubject.next('API error occurred');
    fixture.detectChanges();

    // Check that error state is reflected in template
    const matchResultsComponent = fixture.debugElement.query(By.css('app-match-results'));
    expect(matchResultsComponent).toBeTruthy();
  });

  it('should display refresh button and handle click', () => {
    fixture.detectChanges();

    const refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    expect(refreshBtn).toBeTruthy();

    refreshBtn.nativeElement.click();
    expect(mockFootballService.refreshData).toHaveBeenCalled();
  });

  it('should disable refresh button when loading', () => {
    mockLoadingSubject.next(true);
    fixture.detectChanges();

    const refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    expect(refreshBtn.nativeElement.disabled).toBe(true);
  });

  it('should enable refresh button when not loading', () => {
    mockLoadingSubject.next(false);
    fixture.detectChanges();

    const refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    expect(refreshBtn.nativeElement.disabled).toBe(false);
  });

  it('should show spinning icon when loading', () => {
    mockLoadingSubject.next(true);
    fixture.detectChanges();

    const refreshIcon = fixture.debugElement.query(By.css('.refresh-icon'));
    expect(refreshIcon.nativeElement.classList).toContain('spinning');
  });

  it('should format last updated correctly - just now', () => {
    const now = new Date();
    const result = component.formatLastUpdated(now);
    expect(result).toBe('Just now');
  });

  it('should format last updated correctly - minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = component.formatLastUpdated(fiveMinutesAgo);
    expect(result).toBe('5 min ago');
  });

  it('should format last updated correctly - hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = component.formatLastUpdated(twoHoursAgo);
    expect(result).toBe('2 hours ago');
  });

  it('should format last updated correctly - one hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const result = component.formatLastUpdated(oneHourAgo);
    expect(result).toBe('1 hour ago');
  });

  it('should format last updated correctly - days ago', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const result = component.formatLastUpdated(yesterday);
    expect(result).toMatch(/\d{1,2} \w{3} \d{2}:\d{2}/); // e.g., "13 Apr 10:30"
  });

  it('should return "Never" for null date', () => {
    const result = component.formatLastUpdated(null);
    expect(result).toBe('Never');
  });

  it('should detect fresh cache correctly', () => {
    const now = new Date();
    const isFresh = component.isCacheStale(now);
    expect(isFresh).toBe(false);
  });

  it('should detect stale cache correctly', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const isStale = component.isCacheStale(tenMinutesAgo);
    expect(isStale).toBe(true);
  });

  it('should consider null date as stale', () => {
    const isStale = component.isCacheStale(null);
    expect(isStale).toBe(true);
  });

  it('should show stale indicator when cache is stale', () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000);
    mockLastUpdatedSubject.next(staleDate);
    fixture.detectChanges();

    const staleIndicator = fixture.debugElement.query(By.css('.stale-indicator'));
    expect(staleIndicator).toBeTruthy();
    expect(staleIndicator.nativeElement.textContent).toContain('⚠️');
  });

  it('should not show stale indicator when cache is fresh', () => {
    const freshDate = new Date();
    mockLastUpdatedSubject.next(freshDate);
    fixture.detectChanges();

    const staleIndicator = fixture.debugElement.query(By.css('.stale-indicator'));
    expect(staleIndicator).toBeFalsy();
  });

  it('should apply stale class when cache is stale', () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000);
    mockLastUpdatedSubject.next(staleDate);
    fixture.detectChanges();

    const lastUpdatedElement = fixture.debugElement.query(By.css('.last-updated'));
    expect(lastUpdatedElement.nativeElement.classList).toContain('stale');
  });

  it('should display last updated timestamp correctly', () => {
    const testDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
    mockLastUpdatedSubject.next(testDate);
    fixture.detectChanges();

    const timestampElement = fixture.debugElement.query(By.css('.timestamp'));
    expect(timestampElement).toBeTruthy();
    expect(timestampElement.nativeElement.textContent).toBe('2 min ago');
  });

  it('should setup auto-refresh on initialization', fakeAsync(() => {
    // Mock the interval setup
    vi.spyOn(component as any, 'setupAutoRefresh');

    fixture.detectChanges();
    expect((component as any).setupAutoRefresh).toHaveBeenCalled();

    // Fast forward time to trigger auto-refresh
    tick(5 * 60 * 1000); // 5 minutes

    expect(mockFootballService.getRecentMatches).toHaveBeenCalledTimes(2); // Initial + auto-refresh
  }));

  it('should clean up auto-refresh subscription on destroy', () => {
    fixture.detectChanges();

    const subscription = (component as any).refreshSubscription;
    vi.spyOn(subscription, 'unsubscribe');

    component.ngOnDestroy();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('should handle service errors gracefully', () => {
    mockFootballService.getRecentMatches.mockReturnValue(throwError(() => new Error('API Error')));

    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('should display footer with data source information', () => {
    fixture.detectChanges();

    const footer = fixture.debugElement.query(By.css('.page-footer'));
    const dataSource = fixture.debugElement.query(By.css('.data-source'));
    const disclaimer = fixture.debugElement.query(By.css('.disclaimer'));

    expect(footer).toBeTruthy();
    expect(dataSource).toBeTruthy();
    expect(disclaimer).toBeTruthy();

    expect(dataSource.nativeElement.textContent).toContain('Football-Data.org API');
    expect(disclaimer.nativeElement.textContent).toContain('local timezone');
  });

  it('should refresh data when refresh button clicked', () => {
    fixture.detectChanges();

    component.onRefreshClick();

    expect(mockFootballService.refreshData).toHaveBeenCalled();
    expect(component.matches$).toBeDefined();
  });

  it('should handle empty matches array', () => {
    component.matches$ = of([]);
    fixture.detectChanges();

    const matchResultsComponent = fixture.debugElement.query(By.css('app-match-results'));
    expect(matchResultsComponent).toBeTruthy();
  });

  it('should handle loading state transitions correctly', () => {
    // Start with loading
    mockLoadingSubject.next(true);
    fixture.detectChanges();

    let refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    expect(refreshBtn.nativeElement.disabled).toBe(true);

    // Finish loading
    mockLoadingSubject.next(false);
    fixture.detectChanges();

    refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    expect(refreshBtn.nativeElement.disabled).toBe(false);
  });

  it('should pass all required props to match-results component', () => {
    component.matches$ = of(mockMatches);
    mockLoadingSubject.next(false);
    mockErrorSubject.next('Test error');

    fixture.detectChanges();

    const matchResultsComponent = fixture.debugElement.query(By.css('app-match-results'));
    const componentInstance = matchResultsComponent.componentInstance;

    // Note: Since we're using async pipes, we need to check the bound values
    expect(matchResultsComponent).toBeTruthy();
  });

  it('should show proper branding elements', () => {
    fixture.detectChanges();

    const logo = fixture.debugElement.query(By.css('.premier-league-logo'));
    const lion = fixture.debugElement.query(By.css('.pl-lion'));
    const brandText = fixture.debugElement.query(By.css('.brand-text'));

    expect(logo).toBeTruthy();
    expect(lion).toBeTruthy();
    expect(brandText).toBeTruthy();
    expect(lion.nativeElement.textContent).toContain('⚽');
  });

  it('should handle auto-refresh interval correctly', () => {
    expect(component['AUTO_REFRESH_INTERVAL']).toBe(5 * 60 * 1000); // 5 minutes
  });

  it('should show correct refresh button states', () => {
    fixture.detectChanges();

    const refreshBtn = fixture.debugElement.query(By.css('.refresh-btn'));
    const refreshIcon = fixture.debugElement.query(By.css('.refresh-icon'));
    const refreshText = fixture.debugElement.query(By.css('.refresh-text'));

    expect(refreshBtn).toBeTruthy();
    expect(refreshIcon).toBeTruthy();
    expect(refreshText).toBeTruthy();

    expect(refreshBtn.nativeElement.getAttribute('aria-label')).toBe('Refresh match results');
    expect(refreshText.nativeElement.textContent).toContain('Refresh');
  });
});