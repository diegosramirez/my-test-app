import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { UpcomingFixturesComponent } from './upcoming-fixtures.component';
import { FixtureService } from '../../services/fixture.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Fixture } from '../../models/fixture.model';

describe('UpcomingFixturesComponent', () => {
  let component: UpcomingFixturesComponent;
  let fixture: ComponentFixture<UpcomingFixturesComponent>;
  let mockFixtureService: any;
  let mockAnalyticsService: any;

  const mockFixtures: Fixture[] = [
    {
      id: 1,
      home_team: { id: 1, name: 'Arsenal' },
      away_team: { id: 2, name: 'Liverpool' },
      date: new Date('2024-12-15T15:00:00Z'),
      status: 'scheduled',
      prediction: {
        home_win_probability: 0.45,
        draw_probability: 0.25,
        away_win_probability: 0.30,
        prediction_confidence: 'high',
        last_calculated: new Date(),
        form_period_used: 8
      }
    },
    {
      id: 2,
      home_team: { id: 3, name: 'Manchester City' },
      away_team: { id: 4, name: 'Chelsea' },
      date: new Date('2024-12-16T17:30:00Z'),
      status: 'scheduled'
      // No prediction to test fallback
    },
    {
      id: 3,
      home_team: { id: 5, name: 'Manchester United' },
      away_team: { id: 6, name: 'Tottenham' },
      date: new Date('2024-12-17T20:00:00Z'),
      status: 'postponed'
    }
  ];

  beforeEach(async () => {
    mockFixtureService = {
      getUpcomingFixturesWithPredictions: vi.fn().mockReturnValue(of([])),
      triggerPredictionRecalculation: vi.fn().mockReturnValue(of(void 0))
    };
    mockAnalyticsService = {
      trackEvent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UpcomingFixturesComponent],
      providers: [
        { provide: FixtureService, useValue: mockFixtureService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingFixturesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load fixtures on init', () => {
    mockFixtureService.getUpcomingFixturesWithPredictions.mockReturnValue(of(mockFixtures));

    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.fixtures().length).toBe(3);
    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('predictions_viewed', expect.objectContaining({
      fixture_count: 3,
      accuracy_available: true
    }));
  });

  it('should handle loading state correctly', async () => {
    const delayedObservable = of(mockFixtures).pipe();
    mockFixtureService.getUpcomingFixturesWithPredictions.mockReturnValue(delayedObservable);

    expect(component.isLoading()).toBe(false);

    component.loadFixtures();
    expect(component.isLoading()).toBe(true);

    // Wait for observable to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.isLoading()).toBe(false);
  });

  it('should handle error state', () => {
    mockFixtureService.getUpcomingFixturesWithPredictions.mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    component.loadFixtures();

    expect(component.hasError()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it('should refresh predictions when refresh button clicked', () => {
    // Setup fixtures first
    component.fixtures.set(mockFixtures);

    mockFixtureService.triggerPredictionRecalculation.mockReturnValue(of(void 0));
    mockFixtureService.getUpcomingFixturesWithPredictions.mockReturnValue(of(mockFixtures));

    component.refreshPredictions();

    expect(mockFixtureService.triggerPredictionRecalculation).toHaveBeenCalled();
    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('predictions_refreshed', expect.objectContaining({
      refresh_type: 'manual',
      fixture_count: 3
    }));
  });

  it('should track prediction click events', () => {
    const fixtureWithPrediction = mockFixtures[0];

    component.onPredictionClicked(fixtureWithPrediction);

    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('prediction_clicked', {
      match_id: 1,
      prediction_confidence: 'high',
      user_action: 'view_details'
    });
  });

  it('should not track click events for fixtures without predictions', () => {
    const fixtureWithoutPrediction = mockFixtures[1];

    component.onPredictionClicked(fixtureWithoutPrediction);

    expect(mockAnalyticsService.trackEvent).not.toHaveBeenCalledWith('prediction_clicked', expect.anything());
  });

  it('should generate correct predictions summary', () => {
    component.fixtures.set(mockFixtures);

    const summary = component.getPredictionsSummary();

    expect(summary).toBe('Displaying win probability percentages for 1 of 3 scheduled matches (33%)');
  });

  it('should track fixtures by id', () => {
    const trackResult = component.trackByFixtureId(0, mockFixtures[0]);
    expect(trackResult).toBe(1);
  });

  it('should display loading spinner when loading and no fixtures', async () => {
    component.fixtures.set([]);
    component.isLoading.set(true);
    fixture.detectChanges();

    const loadingState = fixture.nativeElement.querySelector('.loading-state');
    expect(loadingState).toBeTruthy();
    expect(loadingState.textContent).toContain('Loading fixtures and calculating predictions');
  });

  it('should display error state when error occurs', async () => {
    component.hasError.set(true);
    component.isLoading.set(false);
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState.textContent).toContain('Unable to load fixtures');
  });

  it('should display fixtures when loaded', async () => {
    mockFixtureService.getUpcomingFixturesWithPredictions.mockReturnValue(of(mockFixtures));
    component.ngOnInit();
    fixture.detectChanges();

    const matchComponents = fixture.nativeElement.querySelectorAll('app-match-prediction');
    expect(matchComponents.length).toBe(3);
  });

  it('should disable refresh button when loading', async () => {
    component.isLoading.set(true);
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector('.refresh-btn');
    expect(refreshButton.disabled).toBe(true);
  });
});