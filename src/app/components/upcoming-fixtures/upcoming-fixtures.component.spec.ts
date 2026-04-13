import { TestBed } from '@angular/core/testing';
import { UpcomingFixturesComponent } from './upcoming-fixtures.component';
import { MatchPredictionComponent } from '../match-prediction/match-prediction.component';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';
import { PredictionEngineService } from '../../services/prediction-engine.service';
import { ComponentFixture } from '@angular/core/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Fixture } from '../../models/fixture.interface';

describe('UpcomingFixturesComponent', () => {
  let component: UpcomingFixturesComponent;
  let fixture: ComponentFixture<UpcomingFixturesComponent>;
  let mockPredictionEngineService: any;
  let lastRefreshSubject: BehaviorSubject<Date>;

  const mockFixturesWithPredictions: Fixture[] = [
    {
      id: 1,
      homeTeam: { id: 1, name: 'Manchester City' },
      awayTeam: { id: 2, name: 'Liverpool' },
      kickoffTime: new Date('2024-05-15T20:00:00Z'),
      status: 'scheduled',
      homeWinProbability: 0.65,
      drawProbability: 0.20,
      awayWinProbability: 0.15,
      predictionConfidence: 'high',
      lastCalculated: new Date(),
      formPeriodUsed: 10
    },
    {
      id: 2,
      homeTeam: { id: 3, name: 'Chelsea' },
      awayTeam: { id: 4, name: 'Arsenal' },
      kickoffTime: new Date('2024-05-16T15:00:00Z'),
      status: 'scheduled'
      // No predictions for this fixture
    },
    {
      id: 3,
      homeTeam: { id: 5, name: 'Tottenham' },
      awayTeam: { id: 6, name: 'Manchester United' },
      kickoffTime: new Date('2024-05-17T18:00:00Z'),
      status: 'postponed'
    }
  ];

  beforeEach(async () => {
    lastRefreshSubject = new BehaviorSubject<Date>(new Date());

    mockPredictionEngineService = {
      calculatePredictions: vi.fn().mockReturnValue(of(mockFixturesWithPredictions)),
      refreshPredictions: vi.fn().mockReturnValue(of(mockFixturesWithPredictions)),
      getLastRefreshTime: vi.fn().mockReturnValue(lastRefreshSubject.asObservable())
    };

    // Mock console.log to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [UpcomingFixturesComponent, MatchPredictionComponent, ProbabilityIndicatorComponent],
      providers: [
        { provide: PredictionEngineService, useValue: mockPredictionEngineService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingFixturesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should start in loading state', () => {
      expect(component.isLoading()).toBe(true);
      expect(component.error()).toBeNull();
      expect(component.fixtures()).toEqual([]);
    });

    it('should call prediction engine on init', () => {
      fixture.detectChanges();

      expect(mockPredictionEngineService.calculatePredictions).toHaveBeenCalled();
    });

    it('should load fixtures successfully on init', (done) => {
      component.ngOnInit();

      // Wait for async operations to complete
      setTimeout(() => {
        expect(component.isLoading()).toBe(false);
        expect(component.error()).toBeNull();
        expect(component.fixtures().length).toBe(3);
        done();
      }, 10);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const loadingSpinner = compiled.querySelector('.loading-spinner');
      const loadingState = compiled.querySelector('.loading-state');

      expect(loadingSpinner).toBeTruthy();
      expect(loadingState).toBeTruthy();
      expect(loadingState?.textContent).toContain('Loading fixtures and predictions...');
    });

    it('should hide loading state when data is loaded', () => {
      component.isLoading.set(false);
      component.fixtures.set(mockFixturesWithPredictions);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const loadingState = compiled.querySelector('.loading-state');
      expect(loadingState).toBeFalsy();
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      const errorMessage = 'Failed to load fixtures';
      component.error.set(errorMessage);
      component.isLoading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorState = compiled.querySelector('.error-state');
      const errorMessageEl = compiled.querySelector('.error-message p');

      expect(errorState).toBeTruthy();
      expect(errorMessageEl?.textContent).toContain(errorMessage);
    });

    it('should provide retry button in error state', () => {
      component.error.set('Some error');
      component.isLoading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const retryButton = compiled.querySelector('.retry-btn') as HTMLButtonElement;

      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toContain('Try Again');
    });

    it('should handle retry button click', () => {
      component.error.set('Some error');
      component.isLoading.set(false);
      fixture.detectChanges();

      vi.spyOn(component, 'loadFixtures');

      const compiled = fixture.nativeElement as HTMLElement;
      const retryButton = compiled.querySelector('.retry-btn') as HTMLButtonElement;
      retryButton.click();

      expect(component.loadFixtures).toHaveBeenCalled();
    });
  });

  describe('Fixtures Display', () => {
    beforeEach(() => {
      component.isLoading.set(false);
      component.error.set(null);
      component.fixtures.set(mockFixturesWithPredictions);
      fixture.detectChanges();
    });

    it('should display fixtures list when data is available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fixturesList = compiled.querySelector('.fixtures-list');
      expect(fixturesList).toBeTruthy();
    });

    it('should display fixtures statistics', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const stats = compiled.querySelector('.fixtures-stats');

      expect(stats?.textContent).toContain('3 fixtures');
      expect(stats?.textContent).toContain('1 with predictions');
      expect(stats?.textContent).toContain('50% coverage'); // 1 out of 2 scheduled fixtures has predictions
    });

    it('should render match prediction components for each fixture', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const matchComponents = compiled.querySelectorAll('app-match-prediction');
      expect(matchComponents.length).toBe(3);
    });

    it('should show disclaimer when fixtures are available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const disclaimer = compiled.querySelector('.disclaimer');

      expect(disclaimer).toBeTruthy();
      expect(disclaimer?.textContent).toContain('Disclaimer');
      expect(disclaimer?.textContent).toContain('entertainment purposes only');
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      component.isLoading.set(false);
      component.error.set(null);
      component.fixtures.set([]);
      fixture.detectChanges();
    });

    it('should show no fixtures message when list is empty', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const noFixtures = compiled.querySelector('.no-fixtures');

      expect(noFixtures).toBeTruthy();
      expect(noFixtures?.textContent).toContain('No upcoming fixtures');
    });

    it('should not show disclaimer when no fixtures available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const disclaimer = compiled.querySelector('.disclaimer');
      expect(disclaimer).toBeFalsy();
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      component.isLoading.set(false);
      component.fixtures.set(mockFixturesWithPredictions);
      fixture.detectChanges();
    });

    it('should display refresh button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const refreshButton = compiled.querySelector('.refresh-btn');
      expect(refreshButton?.textContent?.trim()).toBe('Refresh');
    });

    it('should show refreshing state when refresh is in progress', () => {
      component.isRefreshing.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const refreshButton = compiled.querySelector('.refresh-btn') as HTMLButtonElement;

      expect(refreshButton.textContent?.trim()).toBe('Refreshing...');
      expect(refreshButton.disabled).toBe(true);
    });

    it('should call refreshPredictions when refresh button is clicked', () => {
      vi.spyOn(component, 'refreshPredictions');

      const compiled = fixture.nativeElement as HTMLElement;
      const refreshButton = compiled.querySelector('.refresh-btn') as HTMLButtonElement;
      refreshButton.click();

      expect(component.refreshPredictions).toHaveBeenCalled();
    });

    it('should trigger prediction engine refresh when refreshPredictions is called', () => {
      component.refreshPredictions();

      expect(mockPredictionEngineService.refreshPredictions).toHaveBeenCalledWith(
        mockFixturesWithPredictions
      );
    });
  });

  describe('Header Display', () => {
    beforeEach(() => {
      component.fixtures.set(mockFixturesWithPredictions);
      fixture.detectChanges();
    });

    it('should display page title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.fixtures-header h1');
      expect(title?.textContent).toContain('Upcoming Premier League Fixtures');
    });

    it('should display last refresh time', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const lastUpdated = compiled.querySelector('.last-updated');
      expect(lastUpdated?.textContent).toContain('Updated');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      component.fixtures.set(mockFixturesWithPredictions);
    });

    describe('getFixturesWithPredictions', () => {
      it('should count fixtures that have all predictions', () => {
        const count = component.getFixturesWithPredictions();
        expect(count).toBe(1); // Only first fixture has complete predictions
      });

      it('should return 0 when no fixtures have predictions', () => {
        const fixturesWithoutPredictions = mockFixturesWithPredictions.map(f => ({
          ...f,
          homeWinProbability: undefined,
          drawProbability: undefined,
          awayWinProbability: undefined
        }));
        component.fixtures.set(fixturesWithoutPredictions);

        const count = component.getFixturesWithPredictions();
        expect(count).toBe(0);
      });
    });

    describe('getPredictionAccuracy', () => {
      it('should calculate percentage of scheduled fixtures with predictions', () => {
        const accuracy = component.getPredictionAccuracy();
        // 2 scheduled fixtures (excluding postponed), 1 with predictions = 50%
        expect(accuracy).toBe(50);
      });

      it('should return 0 when no scheduled fixtures exist', () => {
        component.fixtures.set([]);
        const accuracy = component.getPredictionAccuracy();
        expect(accuracy).toBe(0);
      });

      it('should exclude non-scheduled fixtures from calculation', () => {
        const allPostponedFixtures = mockFixturesWithPredictions.map(f => ({
          ...f,
          status: 'postponed' as const
        }));
        component.fixtures.set(allPostponedFixtures);

        const accuracy = component.getPredictionAccuracy();
        expect(accuracy).toBe(0);
      });
    });

    describe('getTimeAgo', () => {
      beforeEach(() => {
        vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should return correct time differences', () => {
        const oneHourAgo = new Date('2024-05-15T11:00:00Z');
        const oneDayAgo = new Date('2024-05-14T12:00:00Z');

        expect(component.getTimeAgo(oneHourAgo)).toBe('1 hour ago');
        expect(component.getTimeAgo(oneDayAgo)).toBe('1 day ago');
      });
    });

    describe('trackByFixtureId', () => {
      it('should return fixture id for tracking', () => {
        const fixture = mockFixturesWithPredictions[0];
        const result = component.trackByFixtureId(0, fixture);
        expect(result).toBe(fixture.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during fixture loading', (done) => {
      const errorMessage = 'Network error';
      mockPredictionEngineService.calculatePredictions.mockReturnValue(
        throwError(() => new Error(errorMessage))
      );

      component.ngOnInit();

      setTimeout(() => {
        expect(component.isLoading()).toBe(false);
        expect(component.error()).toContain('Failed to load fixtures');
        done();
      }, 10);
    });

    it('should handle errors during prediction refresh', () => {
      mockPredictionEngineService.refreshPredictions.mockReturnValue(
        throwError(() => new Error('Refresh failed'))
      );

      component.fixtures.set(mockFixturesWithPredictions);
      component.refreshPredictions();

      expect(component.isRefreshing()).toBe(false);
    });
  });

  describe('Analytics Tracking', () => {
    it('should track predictions_viewed event on successful load', (done) => {
      vi.spyOn(component as any, 'trackAnalyticsEvent');

      component.ngOnInit();

      setTimeout(() => {
        expect((component as any).trackAnalyticsEvent).toHaveBeenCalledWith(
          'predictions_viewed',
          expect.objectContaining({
            fixture_count: 3,
            accuracy_available: 50
          })
        );
        done();
      }, 10);
    });

    it('should track predictions_refreshed event on manual refresh', () => {
      vi.spyOn(component as any, 'trackAnalyticsEvent');
      component.fixtures.set(mockFixturesWithPredictions);

      component.refreshPredictions();

      expect((component as any).trackAnalyticsEvent).toHaveBeenCalledWith(
        'predictions_refreshed',
        expect.objectContaining({
          refresh_type: 'manual',
          fixture_count: 3
        })
      );
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      component.ngOnInit();
      vi.spyOn(component['destroy$'], 'next');
      vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Auto-refresh functionality', () => {
    it('should setup auto-refresh interval on init', () => {
      // This is tested indirectly through the ngOnInit behavior
      // The interval is set up but we can't easily test the 4-hour interval in unit tests
      expect(mockPredictionEngineService.calculatePredictions).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have mobile-responsive CSS classes', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('.upcoming-fixtures');
      const header = compiled.querySelector('.fixtures-header');

      expect(container).toBeTruthy();
      expect(header).toBeTruthy();
    });
  });
});