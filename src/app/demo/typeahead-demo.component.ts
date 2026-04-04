import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { TypeaheadComponent } from '../shared/typeahead.component';
import { SearchRequest, SearchResponse, SearchResult } from '../shared/search.interface';

@Component({
  selector: 'app-typeahead-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TypeaheadComponent],
  template: `
    <div class="demo-container">
      <h1>Typeahead Search Component Demo</h1>

      <section class="demo-section">
        <h2>Basic Usage</h2>
        <p>Search for programming languages:</p>
        <app-typeahead
          placeholder="Search programming languages..."
          [searchFn]="searchLanguages"
          (resultSelected)="onLanguageSelected($event)"
          (searchStarted)="onSearchStarted($event)"
          (searchCompleted)="onSearchCompleted($event)"
          (searchError)="onSearchError($event)"
          (keyboardNavigation)="onKeyboardNavigation($event)"
        ></app-typeahead>

        <div *ngIf="selectedLanguage" class="result-display">
          <h3>Selected Language:</h3>
          <div class="selected-item">
            <strong>{{ selectedLanguage.title }}</strong>
            <p>{{ selectedLanguage.description }}</p>
          </div>
        </div>
      </section>

      <section class="demo-section">
        <h2>Form Integration</h2>
        <p>Using with Angular Reactive Forms:</p>
        <form class="demo-form">
          <label for="search-input">Search Input:</label>
          <app-typeahead
            id="search-input"
            placeholder="Search countries..."
            [searchFn]="searchCountries"
            [formControl]="searchFormControl"
          ></app-typeahead>

          <div class="form-value">
            <strong>Form Value:</strong> {{ searchFormControl.value }}
          </div>
        </form>
      </section>

      <section class="demo-section">
        <h2>Custom Configuration</h2>
        <p>With custom debounce, retry settings, and character limit:</p>
        <app-typeahead
          placeholder="Search with custom config..."
          [searchFn]="searchWithDelay"
          [config]="customConfig"
          [maxLength]="100"
          [minQueryLength]="2"
        ></app-typeahead>
      </section>

      <section class="demo-section">
        <h2>Error Simulation</h2>
        <p>Test error handling and retry functionality:</p>
        <app-typeahead
          placeholder="Type 'error' to simulate errors..."
          [searchFn]="searchWithErrors"
        ></app-typeahead>
      </section>

      <section class="analytics-section">
        <h2>Analytics & Performance</h2>
        <div class="analytics-grid">
          <div class="metric">
            <span class="metric-label">Total Searches:</span>
            <span class="metric-value">{{ analytics.totalSearches }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Avg Response Time:</span>
            <span class="metric-value">{{ analytics.avgResponseTime }}ms</span>
          </div>
          <div class="metric">
            <span class="metric-label">Cancelled Requests:</span>
            <span class="metric-value">{{ analytics.cancelledRequests }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Keyboard Navigation:</span>
            <span class="metric-value">{{ analytics.keyboardNavigations }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Error Rate:</span>
            <span class="metric-value">{{ analytics.errorRate }}%</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    h1 {
      color: #1f2937;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }

    .demo-section {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    }

    .demo-section h2 {
      color: #374151;
      margin-top: 0;
      margin-bottom: 10px;
    }

    .demo-section p {
      color: #6b7280;
      margin-bottom: 15px;
    }

    .demo-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .demo-form label {
      font-weight: 500;
      color: #374151;
    }

    .form-value {
      padding: 10px;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-family: monospace;
    }

    .result-display {
      margin-top: 20px;
      padding: 15px;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
    }

    .result-display h3 {
      margin-top: 0;
      color: #1f2937;
    }

    .selected-item {
      padding: 10px;
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }

    .selected-item strong {
      color: #1e40af;
    }

    .selected-item p {
      margin: 5px 0 0 0;
      color: #64748b;
    }

    .analytics-section {
      background: #1f2937;
      color: #f9fafb;
      border: none;
    }

    .analytics-section h2 {
      color: #f9fafb;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px;
      background: #374151;
      border-radius: 8px;
    }

    .metric-label {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }

    @media (max-width: 768px) {
      .demo-container {
        padding: 15px;
      }

      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TypeaheadDemoComponent {
  selectedLanguage: SearchResult | null = null;
  searchFormControl = new FormControl('');

  customConfig = {
    debounceMs: 500,
    maxRetries: 2,
    resultLimit: 5
  };

  analytics = {
    totalSearches: 0,
    avgResponseTime: 0,
    cancelledRequests: 0,
    keyboardNavigations: 0,
    errorRate: 0,
    totalErrors: 0,
    responseTimes: [] as number[]
  };

  // Mock data
  private languages: SearchResult[] = [
    { id: '1', title: 'JavaScript', description: 'Dynamic programming language for web development' },
    { id: '2', title: 'TypeScript', description: 'Typed superset of JavaScript' },
    { id: '3', title: 'Python', description: 'High-level programming language for general-purpose programming' },
    { id: '4', title: 'Java', description: 'Object-oriented programming language' },
    { id: '5', title: 'C#', description: 'Modern object-oriented programming language' },
    { id: '6', title: 'Go', description: 'Fast, statically typed compiled language' },
    { id: '7', title: 'Rust', description: 'Systems programming language focused on safety and performance' },
    { id: '8', title: 'Swift', description: 'Programming language for iOS and macOS development' },
    { id: '9', title: 'Kotlin', description: 'Modern programming language for JVM and Android' },
    { id: '10', title: 'C++', description: 'General-purpose programming language with object-oriented features' }
  ];

  private countries: SearchResult[] = [
    { id: '1', title: 'United States', description: 'North American country' },
    { id: '2', title: 'United Kingdom', description: 'European island nation' },
    { id: '3', title: 'Canada', description: 'North American country' },
    { id: '4', title: 'Australia', description: 'Oceanic country and continent' },
    { id: '5', title: 'Germany', description: 'Central European country' },
    { id: '6', title: 'France', description: 'Western European country' },
    { id: '7', title: 'Japan', description: 'East Asian island nation' },
    { id: '8', title: 'Brazil', description: 'South American country' },
    { id: '9', title: 'India', description: 'South Asian country' },
    { id: '10', title: 'China', description: 'East Asian country' }
  ];

  // Search functions
  searchLanguages = (request: SearchRequest): Observable<SearchResponse> => {
    const query = request.query.toLowerCase();
    const filtered = this.languages.filter(lang =>
      lang.title.toLowerCase().includes(query) ||
      (lang.description && lang.description.toLowerCase().includes(query))
    );

    return of({
      results: filtered.slice(0, request.limit || 10),
      totalCount: filtered.length,
      hasMore: filtered.length > (request.limit || 10)
    }).pipe(delay(Math.random() * 300 + 100)); // Simulate network delay
  };

  searchCountries = (request: SearchRequest): Observable<SearchResponse> => {
    const query = request.query.toLowerCase();
    const filtered = this.countries.filter(country =>
      country.title.toLowerCase().includes(query) ||
      (country.description && country.description.toLowerCase().includes(query))
    );

    return of({
      results: filtered.slice(0, request.limit || 10),
      totalCount: filtered.length,
      hasMore: filtered.length > (request.limit || 10)
    }).pipe(delay(Math.random() * 200 + 50));
  };

  searchWithDelay = (request: SearchRequest): Observable<SearchResponse> => {
    return this.searchLanguages(request).pipe(
      delay(800) // Longer delay to test loading states
    );
  };

  searchWithErrors = (request: SearchRequest): Observable<SearchResponse> => {
    if (request.query.toLowerCase().includes('error')) {
      return new Observable(subscriber => {
        setTimeout(() => {
          subscriber.error(new Error('Simulated network error for testing'));
        }, 300);
      });
    }

    return this.searchLanguages(request);
  };

  // Event handlers
  onLanguageSelected(result: SearchResult): void {
    this.selectedLanguage = result;
    console.log('Language selected:', result);
  }

  onSearchStarted(event: { query: string; queryLength: number }): void {
    this.analytics.totalSearches++;
    console.log('Search started:', event);
  }

  onSearchCompleted(event: { responseTime: number; resultCount: number; query: string }): void {
    this.analytics.responseTimes.push(event.responseTime);
    this.analytics.avgResponseTime = Math.round(
      this.analytics.responseTimes.reduce((a, b) => a + b, 0) / this.analytics.responseTimes.length
    );
    console.log('Search completed:', event);
  }

  onSearchError(event: { errorType: string; retryCount: number; query: string }): void {
    this.analytics.totalErrors++;
    this.analytics.errorRate = Math.round((this.analytics.totalErrors / this.analytics.totalSearches) * 100);
    console.log('Search error:', event);
  }

  onKeyboardNavigation(event: { keyPressed: string; currentIndex: number }): void {
    this.analytics.keyboardNavigations++;
    console.log('Keyboard navigation:', event);
  }
}