import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';

import { MatchService } from '../../services/match.service';
import { Match } from '../../models/match.interface';
import { MatchCardComponent } from '../match-card/match-card.component';
import { ErrorMessageComponent } from '../error-message/error-message.component';

interface LoadingState {
  structure: boolean;
  data: boolean;
}

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatchCardComponent,
    ErrorMessageComponent
  ],
  template: `
    <div class="match-list-container">
      <header class="page-header">
        <h1 class="page-title">Premier League Results</h1>
        <p class="page-subtitle">Latest completed matches</p>
      </header>

      <!-- Progressive loading indicator for scores -->
      <div *ngIf="loading().data && !loading().structure" class="data-loading">
        <div class="loading-indicator">
          <div class="spinner-small"></div>
          <span>Loading scores...</span>
        </div>
      </div>

      <!-- Error state -->
      <app-error-message
        *ngIf="error() && !loading().structure"
        [lastUpdated]="getLastUpdatedTime()"
        [isRetrying]="isRetrying()"
        (retry)="onRetry()">
      </app-error-message>

      <!-- Match results -->
      <div *ngIf="matches().length > 0" class="matches-grid">
        <app-match-card
          *ngFor="let match of matches(); trackBy: trackByMatchId"
          [match]="match"
          [loadingScores]="loading().data">
        </app-match-card>
      </div>

      <!-- Empty state -->
      <div *ngIf="matches().length === 0 && !loading().structure && !error()" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 8C10.33 8 11 8.67 11 9.5S10.33 11 9.5 11 8 10.33 8 9.5 8.67 8 9.5 8zm5 0c.83 0 1.5.67 1.5 1.5S15.33 11 14.5 11 13 10.33 13 9.5 13.67 8 14.5 8zM12 17.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="#ccc"/>
          </svg>
        </div>
        <h3>No matches available</h3>
        <p>We couldn't find any completed Premier League matches at the moment.</p>
      </div>

      <!-- Data freshness indicator -->
      <div *ngIf="lastUpdated() && matches().length > 0" class="freshness-indicator">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#28a745"/>
        </svg>
        <span>Updated {{ formatLastUpdated() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .match-list-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .page-header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 1rem 0;
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: #666;
      margin: 0;
      font-weight: 400;
    }

    .matches-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }


    .data-loading {
      text-align: center;
      padding: 1rem;
      margin-top: 1rem;
    }

    .loading-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #666;
    }

    .empty-icon {
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
      line-height: 1.5;
    }

    .freshness-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 2rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .match-list-container {
        padding: 1rem 0.75rem;
      }

      .page-title {
        font-size: 2rem;
      }

      .page-subtitle {
        font-size: 1rem;
      }

      .page-header {
        margin-bottom: 1.5rem;
        padding: 0.5rem 0;
      }
    }

    @media (max-width: 480px) {
      .match-list-container {
        padding: 0.75rem 0.5rem;
      }

      .page-title {
        font-size: 1.75rem;
      }

    }

  `]
})
export class MatchListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected matches = signal<Match[]>([]);
  protected loading = signal<LoadingState>({ structure: true, data: true });
  protected error = signal<boolean>(false);
  protected isRetrying = signal<boolean>(false);
  protected lastUpdated = signal<string | null>(null);

  constructor(private matchService: MatchService) {}

  ngOnInit(): void {
    this.loadMatches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMatches(): void {
    this.loading.set({ structure: false, data: true });
    this.error.set(false);

    this.matchService.getRecentMatches()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading.set({ structure: false, data: false });
          this.isRetrying.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          // Show team structure immediately
          const matchesWithStructure = response.matches.map(match => ({
            ...match,
            // Keep original scores - they'll be shown immediately since loading.data will become false
          }));

          const sortedMatches = this.sortMatchesByFinishTime(matchesWithStructure);
          this.matches.set(sortedMatches);
          this.lastUpdated.set(response.lastUpdated);
          this.error.set(false);
        },
        error: (error) => {
          console.error('Failed to load matches:', error);
          this.error.set(true);
          this.matches.set([]);
        }
      });
  }

  private sortMatchesByFinishTime(matches: Match[]): Match[] {
    return matches.sort((a, b) => {
      const timeA = new Date(a.finishTime || a.matchDate).getTime();
      const timeB = new Date(b.finishTime || b.matchDate).getTime();
      return timeB - timeA; // Most recent first
    });
  }

  onRetry(): void {
    this.isRetrying.set(true);
    this.loadMatches();
  }

  getLastUpdatedTime(): string | null {
    return this.lastUpdated() || this.matchService.getLastUpdatedTime();
  }

  trackByMatchId(index: number, match: Match): string {
    return match.id;
  }

  formatLastUpdated(): string {
    const timestamp = this.lastUpdated();
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        return `${diffHours}h ago`;
      }
    } catch {
      return '';
    }
  }
}