import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject, combineLatest, interval, takeUntil } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatchPredictionComponent } from '../match-prediction/match-prediction.component';
import { Fixture, Team } from '../../models/fixture.interface';
import { PredictionEngineService } from '../../services/prediction-engine.service';

@Component({
  selector: 'app-upcoming-fixtures',
  standalone: true,
  imports: [CommonModule, MatchPredictionComponent],
  template: `
    <div class="upcoming-fixtures">
      <header class="fixtures-header">
        <h1>Upcoming Premier League Fixtures</h1>
        <div class="header-controls">
          <div class="last-updated" *ngIf="lastRefresh$ | async as lastRefresh">
            <span>Updated {{ getTimeAgo(lastRefresh) }}</span>
          </div>
          <button
            type="button"
            class="refresh-btn"
            (click)="refreshPredictions()"
            [disabled]="isRefreshing()">
            {{ isRefreshing() ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </header>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading()">
        <div class="loading-spinner"></div>
        <span>Loading fixtures and predictions...</span>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="error()">
        <div class="error-message">
          <h3>Unable to load fixtures</h3>
          <p>{{ error() }}</p>
          <button type="button" class="retry-btn" (click)="loadFixtures()">
            Try Again
          </button>
        </div>
      </div>

      <!-- Fixtures List -->
      <div class="fixtures-list" *ngIf="!isLoading() && !error()">
        <div class="fixtures-stats" *ngIf="fixtures().length > 0">
          <span>{{ fixtures().length }} fixtures</span>
          <span>•</span>
          <span>{{ getFixturesWithPredictions() }} with predictions</span>
          <span>•</span>
          <span>{{ getPredictionAccuracy() }}% coverage</span>
        </div>

        <div class="no-fixtures" *ngIf="fixtures().length === 0">
          <h3>No upcoming fixtures</h3>
          <p>Check back later for the next round of matches.</p>
        </div>

        <app-match-prediction
          *ngFor="let fixture of fixtures(); trackBy: trackByFixtureId"
          [fixture]="fixture">
        </app-match-prediction>
      </div>

      <!-- Analytics Disclaimer -->
      <div class="disclaimer" *ngIf="fixtures().length > 0">
        <p>
          <strong>Disclaimer:</strong> Predictions are based on recent team form and historical data.
          Football matches can be unpredictable, and these probabilities are for entertainment purposes only.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .upcoming-fixtures {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .fixtures-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--gray-200, #e5e5e5);
    }

    .fixtures-header h1 {
      margin: 0;
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--gray-900, #111);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .last-updated {
      font-size: 0.875rem;
      color: var(--gray-600, #555);
    }

    .refresh-btn {
      background-color: var(--bright-blue, #3b82f6);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .refresh-btn:disabled {
      background-color: var(--gray-400, #9ca3af);
      cursor: not-allowed;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-state {
      color: var(--gray-600, #555);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--gray-200, #e5e5e5);
      border-top: 3px solid var(--bright-blue, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message h3 {
      margin-bottom: 0.5rem;
      color: var(--gray-900, #111);
    }

    .error-message p {
      margin-bottom: 1.5rem;
      color: var(--gray-600, #555);
    }

    .retry-btn {
      background-color: #dc2626;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .retry-btn:hover {
      background-color: #b91c1c;
    }

    .fixtures-stats {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background-color: var(--gray-50, #f9f9f9);
      border-radius: 6px;
      text-align: center;
      font-size: 0.875rem;
      color: var(--gray-700, #555);
    }

    .fixtures-stats span {
      margin: 0 0.25rem;
    }

    .no-fixtures {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--gray-600, #555);
    }

    .no-fixtures h3 {
      margin-bottom: 0.5rem;
      color: var(--gray-900, #111);
    }

    .disclaimer {
      margin-top: 2rem;
      padding: 1rem;
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #92400e;
    }

    .disclaimer p {
      margin: 0;
    }

    /* Mobile Responsive */
    @media screen and (max-width: 768px) {
      .upcoming-fixtures {
        padding: 0.5rem;
      }

      .fixtures-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
        text-align: left;
      }

      .fixtures-header h1 {
        font-size: 1.5rem;
      }

      .header-controls {
        width: 100%;
        justify-content: space-between;
      }

      .fixtures-stats {
        font-size: 0.8rem;
      }
    }
  `]
})
export class UpcomingFixturesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  fixtures = signal<Fixture[]>([]);
  isLoading = signal(true);
  isRefreshing = signal(false);
  error = signal<string | null>(null);

  lastRefresh$: Observable<Date>;

  constructor(private predictionEngine: PredictionEngineService) {
    this.lastRefresh$ = this.predictionEngine.getLastRefreshTime();
  }

  ngOnInit() {
    // Auto-refresh every 4 hours
    const autoRefresh$ = interval(4 * 60 * 60 * 1000).pipe(startWith(0));

    combineLatest([this.refreshTrigger$, autoRefresh$])
      .pipe(
        switchMap(() => this.loadFixturesWithPredictions()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (fixtures) => {
          this.fixtures.set(fixtures);
          this.isLoading.set(false);
          this.isRefreshing.set(false);
          this.error.set(null);
          this.trackAnalyticsEvent('predictions_viewed', {
            fixture_count: fixtures.length,
            load_time: Date.now(),
            accuracy_available: this.getPredictionAccuracy()
          });
        },
        error: (err) => {
          this.error.set('Failed to load fixtures. Please check your connection and try again.');
          this.isLoading.set(false);
          this.isRefreshing.set(false);
          console.error('Error loading fixtures:', err);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFixtures() {
    this.isLoading.set(true);
    this.error.set(null);
    this.refreshTrigger$.next();
  }

  refreshPredictions() {
    this.isRefreshing.set(true);
    this.predictionEngine.refreshPredictions(this.fixtures())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fixtures) => {
          this.fixtures.set(fixtures);
          this.isRefreshing.set(false);
          this.trackAnalyticsEvent('predictions_refreshed', {
            refresh_type: 'manual',
            fixture_count: fixtures.length,
            calculation_time: Date.now()
          });
        },
        error: () => {
          this.isRefreshing.set(false);
        }
      });
  }

  private loadFixturesWithPredictions(): Observable<Fixture[]> {
    // Mock upcoming fixtures data
    const mockFixtures = this.generateMockFixtures();
    return this.predictionEngine.calculatePredictions(mockFixtures);
  }

  private generateMockFixtures(): Fixture[] {
    const teams: Team[] = [
      { id: 1, name: 'Manchester City' },
      { id: 2, name: 'Liverpool' },
      { id: 3, name: 'Chelsea' },
      { id: 4, name: 'Arsenal' },
      { id: 5, name: 'Tottenham' },
      { id: 6, name: 'Manchester United' }
    ];

    const fixtures: Fixture[] = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const kickoffTime = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000); // Weekly intervals
      const homeTeamIndex = i % teams.length;
      const awayTeamIndex = (i + 1) % teams.length;

      fixtures.push({
        id: i + 1,
        homeTeam: teams[homeTeamIndex],
        awayTeam: teams[awayTeamIndex],
        kickoffTime,
        status: i === 3 ? 'postponed' : 'scheduled' // Mock postponed match
      });
    }

    return fixtures;
  }

  getFixturesWithPredictions(): number {
    return this.fixtures().filter(f =>
      f.homeWinProbability && f.drawProbability && f.awayWinProbability
    ).length;
  }

  getPredictionAccuracy(): number {
    const total = this.fixtures().filter(f => f.status === 'scheduled').length;
    const withPredictions = this.getFixturesWithPredictions();
    return total > 0 ? Math.round((withPredictions / total) * 100) : 0;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'less than 1 hour ago';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  trackByFixtureId(index: number, fixture: Fixture): number {
    return fixture.id;
  }

  private trackAnalyticsEvent(eventName: string, properties: Record<string, any>) {
    // Analytics tracking implementation
    // In a real app, this would integrate with analytics service
    console.log(`Analytics Event: ${eventName}`, properties);
  }
}