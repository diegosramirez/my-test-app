import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#e74c3c"/>
        </svg>
      </div>

      <h3 class="error-title">Can't Load Match Results</h3>

      <p class="error-message">
        We're having trouble fetching the latest Premier League results.
        This happens sometimes when the football gods are busy elsewhere.
      </p>

      <div class="last-updated" *ngIf="lastUpdated">
        <p class="timestamp">Last successful update: {{ formatLastUpdated(lastUpdated) }}</p>
      </div>

      <button
        class="retry-button"
        (click)="onRetry()"
        [disabled]="isRetrying">
        <span *ngIf="!isRetrying">Try Again</span>
        <span *ngIf="isRetrying">Retrying...</span>
      </button>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      margin: 0 auto;
    }

    .error-icon {
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .error-message {
      font-size: 1rem;
      color: #666;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }

    .last-updated {
      background: #f8f9fa;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      width: 100%;
    }

    .timestamp {
      font-size: 0.875rem;
      color: #666;
      margin: 0;
      font-style: italic;
    }

    .retry-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 44px; /* Touch-friendly */
    }

    .retry-button:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .retry-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
    }

    @media (max-width: 768px) {
      .error-container {
        padding: 1.5rem;
      }

      .error-title {
        font-size: 1.25rem;
      }

      .error-message {
        font-size: 0.9rem;
      }
    }
  `]
})
export class ErrorMessageComponent {
  @Input() lastUpdated: string | null = null;
  @Input() isRetrying: boolean = false;
  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }

  formatLastUpdated(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return 'Unknown';
    }
  }
}