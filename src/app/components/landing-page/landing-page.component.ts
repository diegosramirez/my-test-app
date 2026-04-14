import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, interval, Subscription, of } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import { Match, FootballDataService } from '../../services/football-data.service';
import { MatchResultsComponent } from '../match-results/match-results.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, MatchResultsComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent implements OnInit, OnDestroy {
  matches$: Observable<Match[]> | undefined;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  lastUpdated$: Observable<Date | null>;

  private refreshSubscription?: Subscription;
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(private footballService: FootballDataService) {
    this.loading$ = this.footballService.loading$;
    this.error$ = this.footballService.error$;
    this.lastUpdated$ = this.footballService.lastUpdated$;
  }

  ngOnInit(): void {
    // Initial load
    this.loadMatches();

    // Set up auto-refresh during active use
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadMatches(): void {
    this.matches$ = this.footballService.getRecentMatches();
  }

  private setupAutoRefresh(): void {
    // Auto-refresh every 5 minutes during active use
    this.refreshSubscription = interval(this.AUTO_REFRESH_INTERVAL)
      .pipe(
        switchMap(() => this.footballService.getRecentMatches())
      )
      .subscribe();
  }

  onRefreshClick(): void {
    this.matches$ = this.footballService.refreshData();
  }

  formatLastUpdated(date: Date | null): string {
    if (!date) return 'Never';

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isCacheStale(date: Date | null): boolean {
    if (!date) return true;

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return diffInMinutes > 5; // Consider stale after 5 minutes
  }
}