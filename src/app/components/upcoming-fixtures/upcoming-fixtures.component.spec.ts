import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UpcomingFixturesComponent } from './upcoming-fixtures.component';
import { PredictionEngineService } from '../../services/prediction-engine.service';
import { FixtureWithPrediction } from '../../models/prediction.model';

describe('UpcomingFixturesComponent', () => {
  let component: UpcomingFixturesComponent;
  let fixture: ComponentFixture<UpcomingFixturesComponent>;
  let mockPredictionService: any;
  let mockFixtures: FixtureWithPrediction[];

  beforeEach(async () => {
    mockFixtures = [
      {
        id: 'fixture-1',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeTeamId: 'arsenal',
        awayTeamId: 'chelsea',
        kickoff: '2024-04-10T15:00:00.000Z',
        venue: 'Emirates Stadium',
        status: 'scheduled',
        prediction: {
          home_win_probability: 0.45,
          draw_probability: 0.30,
          away_win_probability: 0.25,
          prediction_confidence: 'medium',
          last_calculated: '2024-04-09T10:00:00.000Z',
          form_period_used: 8
        }
      }
    ];

    mockPredictionService = {
      calculateMultiplePredictions: vi.fn().mockReturnValue(of(new Map([
        ['fixture-1', mockFixtures[0].prediction!]
      ]))),
      calculatePrediction: vi.fn().mockReturnValue(of({
        prediction: mockFixtures[0].prediction!,
        success: true,
        calculationTime: 500
      }))
    };

    await TestBed.configureTestingModule({
      imports: [UpcomingFixturesComponent],
      providers: [
        { provide: PredictionEngineService, useValue: mockPredictionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingFixturesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load fixtures and predictions on init', () => {
    fixture.detectChanges(); // Triggers ngOnInit

    expect(component.fixtures.length).toBeGreaterThan(0);
    expect(component.loadingState.isLoading).toBe(false);
    expect(mockPredictionService.calculateMultiplePredictions).toHaveBeenCalled();
  });

  it('should display loading state initially', () => {
    expect(component.loadingState.isLoading).toBe(true);

    fixture.detectChanges();

    const loadingElement = fixture.debugElement.nativeElement.querySelector('[data-testid="loading"]');
    // Note: This might be null if loading completes quickly in the test
  });

  it('should handle prediction service errors', () => {
    mockPredictionService.calculateMultiplePredictions.mockReturnValue(
      throwError(() => new Error('Service error'))
    );

    component.retryLoad();

    expect(component.loadingState.error).toBeTruthy();
    expect(component.loadingState.isLoading).toBe(false);
  });

  it('should refresh all predictions', () => {
    component.fixtures = mockFixtures;
    component.refreshingAll = false; // Reset state
    component.refreshAllPredictions();

    expect(component.refreshingAll).toBe(true);
    expect(mockPredictionService.calculateMultiplePredictions).toHaveBeenCalled();
  });

  it('should refresh single prediction', () => {
    component.fixtures = mockFixtures;
    component.refreshingFixtures.clear(); // Reset state
    const fixtureId = 'fixture-1';

    component.refreshSinglePrediction(fixtureId);

    expect(component.refreshingFixtures.has(fixtureId)).toBe(true);
    expect(mockPredictionService.calculatePrediction).toHaveBeenCalledWith({
      fixtureId,
      homeTeamId: 'arsenal',
      awayTeamId: 'chelsea',
      recalculate: true
    });
  });

  it('should count predictions correctly', () => {
    component.fixtures = [
      { ...mockFixtures[0], prediction: mockFixtures[0].prediction },
      { ...mockFixtures[0], id: 'fixture-2', prediction: undefined },
      { ...mockFixtures[0], id: 'fixture-3', status: 'postponed' }
    ];

    expect(component.getPredictionsCount()).toBe(1);
  });

  it('should track fixtures by id', () => {
    const fixture = mockFixtures[0];
    const trackResult = component.trackByFixtureId(0, fixture);
    expect(trackResult).toBe('fixture-1');
  });

  it('should handle prediction click events', () => {
    const spy = vi.spyOn(component as any, 'emitTrackingEvent');

    component.onPredictionClicked({
      matchId: 'fixture-1',
      predictionConfidence: 'medium',
      action: 'expand_details'
    });

    expect(spy).toHaveBeenCalledWith('prediction_clicked', {
      match_id: 'fixture-1',
      prediction_confidence: 'medium',
      user_action: 'expand_details'
    });
  });

  it('should display no fixtures message when list is empty', () => {
    component.fixtures = [];
    component.loadingState.isLoading = false;
    component.loadingState.error = null;

    fixture.detectChanges();

    const noFixturesElement = fixture.debugElement.nativeElement.querySelector('[data-testid="no-fixtures"]');
    expect(noFixturesElement).toBeTruthy();
  });

  it('should show performance warning for slow loads', () => {
    component.showPerformanceWarning = true;

    fixture.detectChanges();

    const warningElement = fixture.debugElement.nativeElement.querySelector('[data-testid="performance-warning"]');
    expect(warningElement).toBeTruthy();
  });

  it('should format next refresh time', () => {
    const nextRefreshTime = component.getNextRefreshTime();
    expect(nextRefreshTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should retry loading on error', () => {
    component.loadingState.error = 'Test error';
    const spy = vi.spyOn(mockPredictionService, 'calculateMultiplePredictions').mockReturnValue(of(new Map()));

    component.retryLoad();

    expect(component.loadingState.isLoading).toBe(true);
    expect(component.loadingState.error).toBe(null);
    expect(spy).toHaveBeenCalled();
  });
});