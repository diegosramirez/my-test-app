import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiError } from '../models/weather.interface';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error) {
      <div
        class="error-container"
        [class]="'error-type-' + error.type"
        role="alert"
        aria-live="assertive"
        [attr.aria-label]="'Error: ' + error.message"
      >
        <div class="error-icon">
          @switch (error.type) {
            @case ('network') {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            }
            @case ('not_found') {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <path d="M8 11h6"/>
              </svg>
            }
            @case ('rate_limit') {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            }
            @case ('timeout') {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            }
            @case ('validation') {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v4"/>
                <circle cx="12" cy="17" r="1"/>
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z"/>
              </svg>
            }
            @default {
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            }
          }
        </div>

        <div class="error-content">
          <h3 class="error-title">{{ getErrorTitle() }}</h3>
          <p class="error-message">{{ error.message }}</p>

          @if (getErrorSuggestions().length > 0) {
            <div class="error-suggestions">
              <p class="suggestions-title">Try these suggestions:</p>
              <ul>
                @for (suggestion of getErrorSuggestions(); track suggestion) {
                  <li>{{ suggestion }}</li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="error-actions">
          <button
            type="button"
            class="retry-button"
            (click)="onRetry()"
            [attr.aria-label]="'Retry the weather search'"
          >
            Try Again
          </button>

          @if (canDismiss()) {
            <button
              type="button"
              class="dismiss-button"
              (click)="onDismiss()"
              [attr.aria-label]="'Dismiss this error message'"
            >
              Dismiss
            </button>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./error-display.component.css']
})
export class ErrorDisplayComponent {
  @Input() error: ApiError | null = null;
  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  getErrorTitle(): string {
    if (!this.error) return '';

    switch (this.error.type) {
      case 'network':
        return 'Connection Problem';
      case 'not_found':
        return 'City Not Found';
      case 'rate_limit':
        return 'Too Many Requests';
      case 'timeout':
        return 'Request Timed Out';
      case 'validation':
        return 'Invalid Input';
      default:
        return 'Something Went Wrong';
    }
  }

  getErrorSuggestions(): string[] {
    if (!this.error) return [];

    switch (this.error.type) {
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Disable any VPN or proxy'
        ];
      case 'not_found':
        return [
          'Check the spelling of the city name',
          'Try including the state or country (e.g., "Paris, France")',
          'Use the full city name instead of abbreviations'
        ];
      case 'rate_limit':
        return [
          'Wait a moment before trying again',
          'Try searching for a different city first'
        ];
      case 'timeout':
        return [
          'Check your internet connection speed',
          'Try again in a moment',
          'Search for a major city to test the connection'
        ];
      case 'validation':
        return [
          'Make sure the city name is not empty',
          'Keep the city name under 50 characters',
          'Use only letters, numbers, spaces, commas, and hyphens'
        ];
      default:
        return [
          'Try searching for a different city',
          'Refresh the page and try again',
          'Check your internet connection'
        ];
    }
  }

  canDismiss(): boolean {
    // Only allow dismissing validation errors and unknown errors
    return this.error?.type === 'validation' || this.error?.type === 'unknown';
  }

  onRetry() {
    this.retry.emit();
  }

  onDismiss() {
    this.dismiss.emit();
  }
}