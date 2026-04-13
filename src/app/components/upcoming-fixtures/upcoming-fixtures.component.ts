import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { Fixture } from '../../models/prediction.interface';
import { FixtureService } from '../../services/fixture.service';
import { PredictionEngineService } from '../../services/prediction-engine.service';
import { MatchPredictionComponent } from '../match-prediction/match-prediction.component';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  loadTime: number;
}

@Component({
  selector: 'app-upcoming-fixtures',
  standalone: true,
  imports: [CommonModule, MatchPredictionComponent],
  templateUrl: './upcoming-fixtures.component.html',
  styleUrl: './upcoming-fixtures.component.css'
})
export class UpcomingFixturesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingSubject = new BehaviorSubject<LoadingState>({
    isLoading: false,
    error: null,
    loadTime: 0
  });

  fixtures: Fixture[] = [];
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private fixtureService: FixtureService,
    private predictionEngine: PredictionEngineService
  ) {}

  ngOnInit(): void {
    this.loadFixtures();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get fixturesWithPredictions(): Fixture[] {
    return this.fixtures.filter(fixture =>
      fixture.prediction && fixture.prediction.prediction_confidence !== 'unavailable'
    );
  }

  get availabilityPercentage(): number {
    if (this.fixtures.length === 0) return 0;
    return Math.round((this.fixturesWithPredictions.length / this.fixtures.length) * 100);
  }

  get hasDisruptedFixtures(): boolean {
    return this.fixtures.some(fixture => fixture.status !== 'scheduled');
  }

  get disruptedFixtures(): Fixture[] {
    return this.fixtures.filter(fixture => fixture.status !== 'scheduled');
  }

  loadFixtures(): void {
    const startTime = Date.now();
    this.updateLoadingState({ isLoading: true, error: null, loadTime: 0 });

    this.fixtureService.getUpcomingFixturesWithPredictions().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Failed to load fixtures:', error);
        this.updateLoadingState({
          isLoading: false,
          error: 'Failed to load upcoming fixtures. Please try again.',
          loadTime: Date.now() - startTime
        });
        throw error;
      }),
      finalize(() => {
        if (!this.loadingSubject.value.error) {
          this.updateLoadingState({
            isLoading: false,
            error: null,
            loadTime: Date.now() - startTime
          });
        }
      })
    ).subscribe({
      next: (fixtures) => {
        this.fixtures = fixtures;
        this.trackPredictionsViewed(fixtures);
      },
      error: () => {
        this.fixtures = [];
      }
    });
  }

  refreshPredictions(): void {
    const fixtureIds = this.fixtures.map(f => f.id);
    if (fixtureIds.length === 0) return;

    const startTime = Date.now();
    this.updateLoadingState({ isLoading: true, error: null, loadTime: 0 });

    this.fixtureService.triggerPredictionRecalculation(fixtureIds).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        const calculationTime = Date.now() - startTime;
        this.updateLoadingState({ isLoading: false, error: null, loadTime: calculationTime });
        this.trackPredictionsRefreshed(fixtureIds.length, calculationTime);
      })
    ).subscribe({
      next: (responses) => {
        // Update fixtures with new predictions
        this.fixtures = this.fixtures.map(fixture => {
          const updated = responses.find(r => r.fixture_id === fixture.id);
          if (updated) {
            return { ...fixture, prediction: updated.prediction };
          }
          return fixture;
        });
      },
      error: (error) => {
        console.error('Failed to refresh predictions:', error);
        this.updateLoadingState({
          isLoading: false,
          error: 'Failed to refresh predictions. Please try again.',
          loadTime: Date.now() - startTime
        });
      }
    });
  }

  onPredictionClicked(event: { match_id: string; prediction_confidence: string; user_action: string }): void {
    // Track prediction interaction
    this.trackPredictionClicked(event);
  }

  clearCache(): void {
    this.predictionEngine.clearCache();
    this.loadFixtures();
  }

  private setupAutoRefresh(): void {
    // Auto-refresh every 4 hours
    setInterval(() => {
      if (!this.loadingSubject.value.isLoading) {
        this.refreshPredictions();
      }
    }, 4 * 60 * 60 * 1000);
  }

  private updateLoadingState(newState: Partial<LoadingState>): void {
    this.loadingSubject.next({ ...this.loadingSubject.value, ...newState });
  }

  private trackPredictionsViewed(fixtures: Fixture[]): void {
    // Track analytics: predictions_viewed
    const fixtureCount = fixtures.length;
    const loadTime = this.loadingSubject.value.loadTime;
    const accuracyAvailable = fixtures.some(f => f.prediction?.prediction_confidence !== 'unavailable');

    console.log('Analytics: predictions_viewed', {
      fixture_count: fixtureCount,
      load_time: loadTime,
      accuracy_available: accuracyAvailable
    });

    // In a real implementation, this would send to analytics service
    // this.analyticsService.track('predictions_viewed', { ... });
  }

  private trackPredictionClicked(event: { match_id: string; prediction_confidence: string; user_action: string }): void {
    // Track analytics: prediction_clicked
    console.log('Analytics: prediction_clicked', {
      match_id: event.match_id,
      prediction_confidence: event.prediction_confidence,
      user_action: event.user_action
    });

    // In a real implementation, this would send to analytics service
    // this.analyticsService.track('prediction_clicked', { ... });
  }

  private trackPredictionsRefreshed(fixtureCount: number, calculationTime: number): void {
    // Track analytics: predictions_refreshed
    console.log('Analytics: predictions_refreshed', {
      refresh_type: 'manual',
      fixture_count: fixtureCount,
      calculation_time: calculationTime
    });

    // In a real implementation, this would send to analytics service
    // this.analyticsService.track('predictions_refreshed', { ... });
  }

  trackByFixtureId(index: number, fixture: Fixture): string {
    return fixture.id;
  }

  getCurrentTime(): string {
    return new Date().toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}