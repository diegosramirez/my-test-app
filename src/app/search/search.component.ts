import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, switchMap, catchError, of, tap } from 'rxjs';
import { SearchInputComponent } from './search-input.component';
import { SearchResultsComponent } from './search-results.component';
import { SearchService } from './search.service';
import { SearchResult, SearchState, SearchEvent } from './search.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, SearchInputComponent, SearchResultsComponent],
  template: `
    <div class="search-container">
      <header class="search-header">
        <h1 class="search-title">Search Articles</h1>
        <p class="search-subtitle">Find relevant articles and tutorials quickly</p>
      </header>

      <main class="search-main">
        <app-search-input
          (searchQueryChange)="onSearchQueryChange($event)"
        ></app-search-input>

        <app-search-results
          [results]="searchState.results"
          [isLoading]="searchState.isLoading"
          [error]="searchState.error"
          [source]="lastSearchSource"
          [currentQuery]="searchState.query"
          [retryCallback]="retrySearch"
        ></app-search-results>
      </main>

      @if (showDebugInfo) {
        <div class="debug-info">
          <h3>Debug Information</h3>
          <p>Cache Size: {{ cacheStats.size }}</p>
          <p>Total Searches: {{ totalSearches }}</p>
          <p>Cache Hits: {{ cacheHits }}</p>
          <p>Hit Rate: {{ hitRate }}%</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .search-header {
      text-align: center;
      margin-bottom: 40px;
      color: white;
    }

    .search-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .search-subtitle {
      font-size: 1.1rem;
      margin: 0;
      opacity: 0.9;
      font-weight: 300;
    }

    .search-main {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .debug-info {
      max-width: 800px;
      margin: 20px auto 0;
      background: rgba(255, 255, 255, 0.9);
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
    }

    .debug-info h3 {
      margin-top: 0;
      color: #333;
    }

    .debug-info p {
      margin: 4px 0;
      color: #666;
    }

    @media (max-width: 768px) {
      .search-container {
        padding: 16px;
      }

      .search-title {
        font-size: 2rem;
      }

      .search-subtitle {
        font-size: 1rem;
      }

      .search-main {
        padding: 24px;
        border-radius: 12px;
      }
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  searchState: SearchState = {
    query: '',
    isLoading: false,
    results: [],
    error: null
  };

  lastSearchSource: 'api' | 'cache' | null = null;
  totalSearches = 0;
  cacheHits = 0;
  showDebugInfo = false; // Set to true for development

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    this.setupSearchStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchStream(): void {
    this.searchSubject
      .pipe(
        tap(query => {
          this.searchState.query = query;
          this.searchState.error = null;

          if (!query) {
            this.searchState.results = [];
            this.searchState.isLoading = false;
            return;
          }

          this.searchState.isLoading = true;
        }),
        switchMap(query => {
          if (!query || query.length < 2) {
            return of({ results: [], fromCache: false });
          }

          const startTime = performance.now();
          const isFromCache = this.searchService['cacheService'].has(query);

          return this.searchService.search(query).pipe(
            tap(() => {
              const endTime = performance.now();
              this.trackSearchEvent({
                query,
                timestamp: Date.now(),
                source: isFromCache ? 'cache' : 'api',
                duration: endTime - startTime,
                result_count: this.searchState.results.length
              });

              this.totalSearches++;
              if (isFromCache) {
                this.cacheHits++;
              }
            }),
            switchMap(results => of({ results, fromCache: isFromCache })),
            catchError(error => {
              this.searchState.error = 'Unable to search at this time. Please try again.';
              this.searchState.isLoading = false;
              return of({ results: [], fromCache: false });
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(({ results, fromCache }) => {
        this.searchState.results = results;
        this.searchState.isLoading = false;
        this.lastSearchSource = fromCache ? 'cache' : 'api';
      });
  }

  onSearchQueryChange(query: string): void {
    this.searchSubject.next(query);
  }

  retrySearch = (): void => {
    if (this.searchState.query) {
      this.searchState.error = null;
      this.searchSubject.next(this.searchState.query);
    }
  };

  get cacheStats() {
    return this.searchService.getCacheStats();
  }

  get hitRate(): number {
    if (this.totalSearches === 0) return 0;
    return Math.round((this.cacheHits / this.totalSearches) * 100);
  }

  private trackSearchEvent(event: SearchEvent): void {
    // In a real application, this would send analytics data
    if (this.showDebugInfo) {
      console.log('Search Event:', event);
    }
  }
}