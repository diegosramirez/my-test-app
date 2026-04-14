import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of } from 'rxjs';
import { catchError, retry, shareReplay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  status: string;
}

export interface MatchResponse {
  matches: any[];
}

export interface CachedData {
  data: Match[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FootballDataService implements OnDestroy {
  private readonly API_URL = environment.footballData.apiUrl;
  private readonly API_KEY = environment.footballData.apiKey;
  private readonly CACHE_KEY = 'premier-league-matches';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;

  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private lastUpdatedSubject = new BehaviorSubject<Date | null>(null);
  private circuitBreakerOpen = false;
  private circuitBreakerTimeout: number | null = null;

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public lastUpdated$ = this.lastUpdatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCachedData();
  }

  ngOnDestroy(): void {
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
  }

  getRecentMatches(): Observable<Match[]> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      return this.getCachedMatches();
    }

    // Try to get cached data first
    const cached = this.getCachedData();
    if (cached && this.isCacheValid(cached.timestamp)) {
      this.lastUpdatedSubject.next(cached.timestamp);
      return of(cached.data);
    }

    // Fetch fresh data
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const headers = {
      'X-Auth-Token': this.API_KEY
    };

    return this.http.get<MatchResponse>(`${this.API_URL}?status=FINISHED&limit=10`, { headers })
      .pipe(
        retry(this.MAX_RETRIES),
        map(response => this.transformMatches(response.matches.slice(0, 10))),
        map(matches => {
          this.cacheMatches(matches);
          this.loadingSubject.next(false);
          this.lastUpdatedSubject.next(new Date());
          this.resetCircuitBreaker();
          return matches;
        }),
        catchError(error => {
          this.loadingSubject.next(false);
          this.handleApiError(error);
          return this.getCachedMatches();
        }),
        shareReplay(1)
      );
  }

  private transformMatches(apiMatches: any[]): Match[] {
    return apiMatches.map(match => ({
      id: match.id,
      homeTeam: match.homeTeam?.name || 'Unknown Team',
      awayTeam: match.awayTeam?.name || 'Unknown Team',
      homeScore: match.score?.fullTime?.home ?? 0,
      awayScore: match.score?.fullTime?.away ?? 0,
      matchDate: new Date(match.utcDate),
      status: match.status
    }));
  }

  private cacheMatches(matches: Match[]): void {
    const cachedData: CachedData = {
      data: matches,
      timestamp: new Date()
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
  }

  private getCachedData(): CachedData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return {
          ...parsedData,
          timestamp: new Date(parsedData.timestamp),
          data: parsedData.data.map((match: any) => ({
            ...match,
            matchDate: new Date(match.matchDate)
          }))
        };
      }
    } catch (error) {
      console.warn('Error parsing cached data:', error);
    }
    return null;
  }

  private getCachedMatches(): Observable<Match[]> {
    const cached = this.getCachedData();
    if (cached) {
      this.lastUpdatedSubject.next(cached.timestamp);
      return of(cached.data);
    }
    return of(this.generateMockData());
  }

  private loadCachedData(): void {
    const cached = this.getCachedData();
    if (cached) {
      this.lastUpdatedSubject.next(cached.timestamp);
    }
  }

  private isCacheValid(timestamp: Date): boolean {
    const now = new Date().getTime();
    const cacheTime = timestamp.getTime();
    return (now - cacheTime) < this.CACHE_DURATION;
  }

  private handleApiError(error: HttpErrorResponse): void {
    let errorMessage = 'Failed to fetch match data';

    if (error.status === 0) {
      errorMessage = 'No internet connection';
    } else if (error.status === 403) {
      errorMessage = 'API key invalid or quota exceeded';
    } else if (error.status >= 500) {
      errorMessage = 'Server error - please try again later';
      this.openCircuitBreaker();
    }

    this.errorSubject.next(errorMessage);
    console.error('Football Data API Error:', error);
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    this.circuitBreakerTimeout = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.circuitBreakerTimeout = null;
    }, 60000); // 1 minute timeout
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
  }

  private generateMockData(): Match[] {
    // Fallback mock data for when no cached data is available
    return [
      {
        id: 1,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeScore: 2,
        awayScore: 1,
        matchDate: new Date(Date.now() - 86400000), // Yesterday
        status: 'FINISHED'
      },
      {
        id: 2,
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeScore: 1,
        awayScore: 3,
        matchDate: new Date(Date.now() - 172800000), // 2 days ago
        status: 'FINISHED'
      },
      {
        id: 3,
        homeTeam: 'Manchester City',
        awayTeam: 'Tottenham',
        homeScore: 3,
        awayScore: 1,
        matchDate: new Date(Date.now() - 259200000), // 3 days ago
        status: 'FINISHED'
      }
    ];
  }

  refreshData(): Observable<Match[]> {
    // Force refresh by clearing cache
    localStorage.removeItem(this.CACHE_KEY);
    this.resetCircuitBreaker();
    return this.getRecentMatches();
  }
}