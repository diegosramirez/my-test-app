import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Fixture } from '../../models/fixture.model';
import { FixtureService } from '../../services/fixture.service';
import { AnalyticsService } from '../../services/analytics.service';
import { MatchPredictionComponent } from '../match-prediction/match-prediction.component';

@Component({
  selector: 'app-upcoming-fixtures',
  standalone: true,
  imports: [CommonModule, MatchPredictionComponent],
  template: `
    <div class="fixtures-container">
      <div class="header">
        <h1>Upcoming Premier League Fixtures</h1>
        <div class="header-actions">
          <button
            class="refresh-btn"
            (click)="refreshPredictions()"
            [disabled]="isLoading()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 12 3-3 3 3"/>
              <path d="m12 8 3-3 3 3"/>
              <circle cx="13" cy="12" r="3"/>
              <path d="m21 12-3 3-3-3"/>
              <path d="m12 16-3 3-3-3"/>
              <circle cx="11" cy="12" r="3"/>
            </svg>
            {{ isLoading() ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading() && fixtures().length === 0">
        <div class="loading-spinner"></div>
        <p>Loading fixtures and calculating predictions...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError() && !isLoading()">
        <p>Unable to load fixtures. Please try again.</p>
        <button class="retry-btn" (click)="loadFixtures()">Retry</button>
      </div>

      <!-- Fixtures List -->
      <div class="fixtures-list" *ngIf="!isLoading() || fixtures().length > 0">
        <div class="fixtures-summary" *ngIf="fixtures().length > 0">
          <p>{{ getPredictionsSummary() }}</p>
        </div>

        <app-match-prediction
          *ngFor="let fixture of fixtures(); trackBy: trackByFixtureId"
          [fixture]="fixture"
          (click)="onPredictionClicked(fixture)">
        </app-match-prediction>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="fixtures().length === 0 && !isLoading() && !hasError()">
          <p>No upcoming fixtures found.</p>
        </div>
      </div>

      <!-- Refresh Indicator -->
      <div class="refresh-indicator" *ngIf="isLoading() && fixtures().length > 0">
        <small>Updating predictions...</small>
      </div>
    </div>
  `,
  styles: [`
    .fixtures-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: var(--gray-900, #111827);
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--blue-600, #2563eb);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: var(--blue-700, #1d4ed8);
    }

    .refresh-btn:disabled {
      background: var(--gray-400, #9ca3af);
      cursor: not-allowed;
    }

    .refresh-btn svg {
      animation: spin 1s linear infinite;
    }

    .refresh-btn:not(:disabled) svg {
      animation: none;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 4px solid var(--gray-200, #e5e7eb);
      border-top: 4px solid var(--blue-600, #2563eb);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    .error-state p {
      color: var(--red-600, #dc2626);
      margin-bottom: 1rem;
    }

    .retry-btn {
      padding: 0.5rem 1rem;
      background: var(--red-600, #dc2626);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .retry-btn:hover {
      background: var(--red-700, #b91c1c);
    }

    .fixtures-summary {
      background: var(--blue-50, #eff6ff);
      border: 1px solid var(--blue-200, #bfdbfe);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .fixtures-summary p {
      margin: 0;
      color: var(--blue-700, #1d4ed8);
      font-weight: 500;
    }

    .refresh-indicator {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--gray-800, #1f2937);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }

    .fixtures-list {
      margin-bottom: 2rem;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .fixtures-container {
        padding: 0.5rem;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .header h1 {
        font-size: 1.5rem;
      }

      .header-actions {
        justify-content: center;
      }

      .refresh-indicator {
        position: relative;
        bottom: auto;
        right: auto;
        text-align: center;
        margin-top: 1rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpcomingFixturesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  fixtures = signal<Fixture[]>([]);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  constructor(
    private fixtureService: FixtureService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFixtures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFixtures(): void {
    const startTime = Date.now();
    this.isLoading.set(true);
    this.hasError.set(false);

    this.fixtureService.getUpcomingFixturesWithPredictions()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading.set(false);
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (fixtures) => {
          this.fixtures.set(fixtures);
          this.hasError.set(false);

          // Track analytics
          const loadTime = Date.now() - startTime;
          const fixturesWithPredictions = fixtures.filter(f => f.prediction).length;

          this.analyticsService.trackEvent('predictions_viewed', {
            fixture_count: fixtures.length,
            load_time: loadTime,
            accuracy_available: fixturesWithPredictions > 0
          });
        },
        error: (error) => {
          console.error('Failed to load fixtures:', error);
          this.hasError.set(true);
        }
      });
  }

  refreshPredictions(): void {
    const startTime = Date.now();
    this.isLoading.set(true);

    // Trigger recalculation and reload
    this.fixtureService.triggerPredictionRecalculation()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.loadFixtures();

          const calculationTime = Date.now() - startTime;
          this.analyticsService.trackEvent('predictions_refreshed', {
            refresh_type: 'manual',
            fixture_count: this.fixtures().length,
            calculation_time: calculationTime
          });
        },
        error: (error) => {
          console.error('Failed to refresh predictions:', error);
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      });
  }

  onPredictionClicked(fixture: Fixture): void {
    if (fixture.prediction) {
      this.analyticsService.trackEvent('prediction_clicked', {
        match_id: fixture.id,
        prediction_confidence: fixture.prediction.prediction_confidence,
        user_action: 'view_details'
      });
    }
  }

  getPredictionsSummary(): string {
    const totalFixtures = this.fixtures().length;
    const fixturesWithPredictions = this.fixtures().filter(f => f.prediction).length;
    const percentage = totalFixtures > 0 ? Math.round((fixturesWithPredictions / totalFixtures) * 100) : 0;

    return `Displaying win probability percentages for ${fixturesWithPredictions} of ${totalFixtures} scheduled matches (${percentage}%)`;
  }

  trackByFixtureId(index: number, fixture: Fixture): number {
    return fixture.id;
  }
}