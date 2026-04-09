import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, BehaviorSubject, interval, merge, of } from 'rxjs';
import { takeUntil, switchMap, startWith, catchError, finalize } from 'rxjs/operators';
import { FixtureWithPrediction, MatchPrediction } from '../../models/prediction.model';
import { PredictionEngineService } from '../../services/prediction-engine.service';
import { MatchPredictionComponent } from '../match-prediction/match-prediction.component';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  loadTime: number | null;
}

@Component({
  selector: 'app-upcoming-fixtures',
  standalone: true,
  imports: [CommonModule, MatchPredictionComponent],
  template: `
    <div class="upcoming-fixtures-container" data-testid="upcoming-fixtures">
      <!-- Header -->
      <div class="header">
        <h1>Upcoming Premier League Fixtures</h1>
        <p class="subtitle">Win probabilities based on recent team form</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loadingState.isLoading" data-testid="loading">
        <div class="loading-spinner"></div>
        <p>Loading predictions...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="loadingState.error && !loadingState.isLoading" data-testid="error">
        <div class="error-icon">⚠️</div>
        <h3>Unable to load predictions</h3>
        <p>{{ loadingState.error }}</p>
        <button class="retry-btn" (click)="retryLoad()">Retry</button>
      </div>

      <!-- Fixtures List -->
      <div class="fixtures-list" *ngIf="!loadingState.isLoading && !loadingState.error">
        <!-- Stats Header -->
        <div class="stats-header" *ngIf="fixtures.length > 0">
          <div class="stat">
            <span class="value">{{ fixtures.length }}</span>
            <span class="label">Upcoming Matches</span>
          </div>
          <div class="stat">
            <span class="value">{{ getPredictionsCount() }}</span>
            <span class="label">Predictions Available</span>
          </div>
          <div class="stat" *ngIf="loadingState.loadTime">
            <span class="value">{{ loadingState.loadTime }}ms</span>
            <span class="label">Load Time</span>
          </div>
        </div>

        <!-- Refresh Controls -->
        <div class="controls" *ngIf="fixtures.length > 0">
          <button
            class="refresh-all-btn"
            (click)="refreshAllPredictions()"
            [disabled]="refreshingAll"
            data-testid="refresh-all">
            {{ refreshingAll ? 'Refreshing...' : 'Refresh All Predictions' }}
          </button>
          <div class="auto-refresh-info">
            <span>Auto-refresh: {{ getNextRefreshTime() }}</span>
          </div>
        </div>

        <!-- Fixtures -->
        <div class="fixtures" *ngIf="fixtures.length > 0; else noFixtures">
          <app-match-prediction
            *ngFor="let fixture of fixtures; trackBy: trackByFixtureId"
            [fixture]="fixture"
            [refreshing]="refreshingFixtures.has(fixture.id)"
            (refreshPrediction)="refreshSinglePrediction($event)"
            (predictionClicked)="onPredictionClicked($event)">
          </app-match-prediction>
        </div>

        <ng-template #noFixtures>
          <div class="no-fixtures" data-testid="no-fixtures">
            <div class="icon">📅</div>
            <h3>No upcoming fixtures</h3>
            <p>Check back later for new Premier League matches.</p>
          </div>
        </ng-template>
      </div>

      <!-- Performance Warning -->
      <div class="performance-warning" *ngIf="showPerformanceWarning" data-testid="performance-warning">
        <p>⚡ Predictions took longer than expected to load. This may indicate heavy server load.</p>
      </div>
    </div>
  `,
  styles: [`
    .upcoming-fixtures-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2.25rem;
      font-weight: bold;
      color: #111827;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1.125rem;
    }

    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #f3f4f6;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-state {
      text-align: center;
      padding: 3rem 1rem;
      background-color: #fef2f2;
      border-radius: 0.5rem;
      border: 1px solid #fecaca;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .error-state h3 {
      color: #dc2626;
      margin-bottom: 0.5rem;
    }

    .error-state p {
      color: #7f1d1d;
      margin-bottom: 1.5rem;
    }

    .retry-btn {
      padding: 0.75rem 1.5rem;
      background-color: #dc2626;
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-weight: 500;
      cursor: pointer;
    }

    .retry-btn:hover {
      background-color: #b91c1c;
    }

    .stats-header {
      display: flex;
      justify-content: space-around;
      background-color: #f9fafb;
      padding: 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #e5e7eb;
    }

    .stat {
      text-align: center;
    }

    .stat .value {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .stat .label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background-color: #ffffff;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
    }

    .refresh-all-btn {
      padding: 0.75rem 1.5rem;
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .refresh-all-btn:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .refresh-all-btn:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .auto-refresh-info {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .fixtures {
      margin-top: 1rem;
    }

    .no-fixtures {
      text-align: center;
      padding: 4rem 1rem;
      background-color: #f9fafb;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
    }

    .no-fixtures .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .no-fixtures h3 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .no-fixtures p {
      color: #6b7280;
    }

    .performance-warning {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background-color: #fbbf24;
      color: #92400e;
      padding: 0.75rem 1rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 50;
    }

    /* Mobile Styles */
    @media (max-width: 640px) {
      .upcoming-fixtures-container {
        padding: 0.5rem;
      }

      .header h1 {
        font-size: 1.875rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .stats-header {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .controls {
        flex-direction: column;
        gap: 0.75rem;
        align-items: stretch;
        text-align: center;
      }

      .refresh-all-btn {
        width: 100%;
      }

      .performance-warning {
        position: static;
        margin-top: 1rem;
        border-radius: 0.5rem;
      }
    }
  `]
})
export class UpcomingFixturesComponent implements OnInit, OnDestroy {
  fixtures: FixtureWithPrediction[] = [];
  loadingState: LoadingState = {
    isLoading: true,
    error: null,
    loadTime: null
  };

  refreshingAll = false;
  refreshingFixtures = new Set<string>();
  showPerformanceWarning = false;

  private destroy$ = new Subject<void>();
  private autoRefresh$ = new BehaviorSubject<void>(undefined);
  private readonly PERFORMANCE_THRESHOLD_MS = 2000;
  private readonly AUTO_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(private predictionService: PredictionEngineService) {}

  ngOnInit(): void {
    this.loadFixturesWithPredictions();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByFixtureId(index: number, fixture: FixtureWithPrediction): string {
    return fixture.id;
  }

  getPredictionsCount(): number {
    return this.fixtures.filter(f => f.prediction && f.status === 'scheduled').length;
  }

  getNextRefreshTime(): string {
    // Calculate next refresh time (simplified)
    const nextRefresh = new Date(Date.now() + this.AUTO_REFRESH_INTERVAL_MS);
    return nextRefresh.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  retryLoad(): void {
    this.loadingState = { isLoading: true, error: null, loadTime: null };
    this.loadFixturesWithPredictions();
  }

  refreshAllPredictions(): void {
    if (this.refreshingAll) return;

    this.refreshingAll = true;
    const startTime = Date.now();

    // Emit tracking event
    this.emitTrackingEvent('predictions_refreshed', {
      refresh_type: 'manual_all',
      fixture_count: this.fixtures.length,
      calculation_time: 0
    });

    // Simulate refresh by recalculating all predictions
    const fixtureRequests = this.fixtures.map(f => ({
      id: f.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId
    }));

    this.predictionService.calculateMultiplePredictions(fixtureRequests)
      .pipe(
        finalize(() => {
          this.refreshingAll = false;
          this.emitTrackingEvent('predictions_refreshed', {
            refresh_type: 'manual_all_complete',
            fixture_count: this.fixtures.length,
            calculation_time: Date.now() - startTime
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (predictions) => {
          this.fixtures = this.fixtures.map(fixture => ({
            ...fixture,
            prediction: predictions.get(fixture.id) || fixture.prediction
          }));
        },
        error: (error) => {
          console.error('Error refreshing predictions:', error);
          this.loadingState.error = 'Failed to refresh predictions';
        }
      });
  }

  refreshSinglePrediction(fixtureId: string): void {
    const fixture = this.fixtures.find(f => f.id === fixtureId);
    if (!fixture || this.refreshingFixtures.has(fixtureId)) return;

    this.refreshingFixtures.add(fixtureId);
    const startTime = Date.now();

    this.predictionService.calculatePrediction({
      fixtureId,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      recalculate: true
    }).pipe(
      finalize(() => {
        this.refreshingFixtures.delete(fixtureId);
        this.emitTrackingEvent('predictions_refreshed', {
          refresh_type: 'manual_single',
          fixture_count: 1,
          calculation_time: Date.now() - startTime
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.success && response.prediction) {
          const fixtureIndex = this.fixtures.findIndex(f => f.id === fixtureId);
          if (fixtureIndex >= 0) {
            this.fixtures[fixtureIndex] = {
              ...this.fixtures[fixtureIndex],
              prediction: response.prediction
            };
          }
        }
      },
      error: (error) => {
        console.error('Error refreshing single prediction:', error);
      }
    });
  }

  onPredictionClicked(event: { matchId: string; predictionConfidence: string; action: string }): void {
    this.emitTrackingEvent('prediction_clicked', {
      match_id: event.matchId,
      prediction_confidence: event.predictionConfidence,
      user_action: event.action
    });
  }

  private loadFixturesWithPredictions(): void {
    const startTime = Date.now();

    // Generate mock fixtures for demonstration
    const mockFixtures = this.generateMockFixtures();

    // Calculate predictions for all fixtures
    const fixtureRequests = mockFixtures.map(f => ({
      id: f.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId
    }));

    this.predictionService.calculateMultiplePredictions(fixtureRequests)
      .pipe(
        finalize(() => {
          const loadTime = Date.now() - startTime;
          this.loadingState.loadTime = loadTime;
          this.loadingState.isLoading = false;

          if (loadTime > this.PERFORMANCE_THRESHOLD_MS) {
            this.showPerformanceWarning = true;
            setTimeout(() => {
              this.showPerformanceWarning = false;
            }, 5000);
          }

          // Emit tracking events
          this.emitTrackingEvent('predictions_viewed', {
            fixture_count: this.fixtures.length,
            load_time: loadTime,
            accuracy_available: false
          });
        }),
        catchError((error) => {
          this.loadingState.error = 'Failed to load predictions. Please try again.';
          this.loadingState.isLoading = false;
          return of(new Map<string, MatchPrediction>());
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (predictions) => {
          this.fixtures = mockFixtures.map(fixture => ({
            ...fixture,
            prediction: predictions.get(fixture.id)
          }));
        }
      });
  }

  private generateMockFixtures(): FixtureWithPrediction[] {
    const teams = [
      { id: 'arsenal', name: 'Arsenal' },
      { id: 'chelsea', name: 'Chelsea' },
      { id: 'liverpool', name: 'Liverpool' },
      { id: 'manchester-city', name: 'Manchester City' },
      { id: 'manchester-united', name: 'Manchester United' },
      { id: 'tottenham', name: 'Tottenham' },
      { id: 'newcastle', name: 'Newcastle' },
      { id: 'brighton', name: 'Brighton' },
      { id: 'aston-villa', name: 'Aston Villa' },
      { id: 'west-ham', name: 'West Ham' }
    ];

    const fixtures: FixtureWithPrediction[] = [];

    for (let i = 0; i < 6; i++) {
      const homeTeam = teams[Math.floor(Math.random() * teams.length)];
      let awayTeam = teams[Math.floor(Math.random() * teams.length)];

      // Ensure different teams
      while (awayTeam.id === homeTeam.id) {
        awayTeam = teams[Math.floor(Math.random() * teams.length)];
      }

      const kickoffDate = new Date();
      kickoffDate.setDate(kickoffDate.getDate() + i + 1);
      kickoffDate.setHours(15, 0, 0, 0);

      fixtures.push({
        id: `fixture-${i + 1}`,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoff: kickoffDate.toISOString(),
        venue: `${homeTeam.name} Stadium`,
        status: 'scheduled'
      });
    }

    return fixtures;
  }

  private setupAutoRefresh(): void {
    // Auto refresh every 4 hours
    const autoRefresh$ = interval(this.AUTO_REFRESH_INTERVAL_MS).pipe(
      startWith(0),
      takeUntil(this.destroy$)
    );

    // Manual refresh trigger
    const manualRefresh$ = this.autoRefresh$.pipe(
      takeUntil(this.destroy$)
    );

    merge(autoRefresh$, manualRefresh$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.loadingState.isLoading && !this.refreshingAll) {
          this.refreshAllPredictions();
        }
      });
  }

  private emitTrackingEvent(eventName: string, properties: any): void {
    // In a real application, this would send to analytics service
    console.log('Analytics Event:', eventName, properties);

    // Simulate tracking call
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }
  }
}