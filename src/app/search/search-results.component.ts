import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchResult } from './search.models';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading) {
      <div class="loading-container" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <span class="loading-text">Searching...</span>
      </div>
    } @else if (error) {
      <div class="error-container" role="alert">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>{{ error }}</p>
        @if (retryCallback) {
          <button
            class="retry-button"
            (click)="retryCallback()"
            type="button"
          >
            Try Again
          </button>
        }
      </div>
    } @else if (results.length > 0) {
      <div class="results-container">
        <div class="results-header" aria-live="polite">
          <span class="results-count">
            Found {{ results.length }} result{{ results.length === 1 ? '' : 's' }}
            @if (source === 'cache') {
              <span class="cache-indicator" title="Results from cache">⚡</span>
            }
          </span>
        </div>
        <ul class="results-list" role="list">
          @for (result of results; track result.id) {
            <li class="result-item" role="listitem">
              <article class="result-card">
                <h3 class="result-title" [innerHTML]="highlightQuery(result.title)"></h3>
                <p class="result-description" [innerHTML]="highlightQuery(result.description)"></p>
              </article>
            </li>
          }
        </ul>
      </div>
    } @else if (showEmptyState) {
      <div class="empty-state" role="status">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <h3>No results found</h3>
        <p>Try different keywords or check your spelling</p>
      </div>
    }
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      color: #6c757d;
      font-size: 16px;
    }

    .error-container {
      text-align: center;
      padding: 40px 20px;
      background-color: #fff5f5;
      border: 1px solid #feb2b2;
      border-radius: 8px;
      margin: 20px 0;
    }

    .error-icon {
      font-size: 32px;
      margin-bottom: 16px;
    }

    .error-container h3 {
      color: #c53030;
      margin-bottom: 8px;
    }

    .error-container p {
      color: #742a2a;
      margin-bottom: 16px;
    }

    .retry-button {
      background-color: #e53e3e;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }

    .retry-button:hover {
      background-color: #c53030;
    }

    .results-container {
      margin-top: 24px;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e1e5e9;
    }

    .results-count {
      color: #495057;
      font-size: 14px;
    }

    .cache-indicator {
      color: #28a745;
      font-size: 16px;
      margin-left: 8px;
      cursor: help;
    }

    .results-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .result-item {
      margin-bottom: 16px;
    }

    .result-card {
      padding: 20px;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      background-color: #fff;
      transition: box-shadow 0.2s ease, transform 0.1s ease;
      cursor: pointer;
    }

    .result-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .result-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #212529;
      line-height: 1.4;
    }

    .result-description {
      margin: 0;
      color: #6c757d;
      line-height: 1.6;
      font-size: 15px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin-bottom: 8px;
      color: #495057;
    }

    .highlight {
      background-color: #fff3cd;
      padding: 1px 2px;
      border-radius: 2px;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .result-card {
        padding: 16px;
      }

      .result-title {
        font-size: 16px;
      }

      .result-description {
        font-size: 14px;
      }
    }
  `]
})
export class SearchResultsComponent {
  @Input() results: SearchResult[] = [];
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Input() source: 'api' | 'cache' | null = null;
  @Input() retryCallback?: () => void;
  @Input() currentQuery = '';

  get showEmptyState(): boolean {
    return !this.isLoading && !this.error && this.results.length === 0 && this.currentQuery.length >= 2;
  }

  highlightQuery(text: string): string {
    if (!this.currentQuery || this.currentQuery.length < 2) {
      return text;
    }

    const regex = new RegExp(`(${this.escapeRegExp(this.currentQuery)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}