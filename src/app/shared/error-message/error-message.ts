import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-error-message',
  standalone: true,
  template: `
    <div class="error-container" role="alert">
      <p class="error-text">{{ message }}</p>
      @if (retryable) {
        <button class="retry-btn" (click)="retry.emit()">Retry</button>
      }
    </div>
  `,
  styles: [`
    .error-container {
      padding: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      text-align: center;
    }
    .error-text {
      color: #dc2626;
      margin: 0 0 0.75rem;
    }
    .retry-btn {
      padding: 0.5rem 1rem;
      background: var(--color-primary, #1976d2);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .retry-btn:hover { opacity: 0.9; }
    .retry-btn:focus-visible {
      outline: 2px solid var(--color-primary, #1976d2);
      outline-offset: 2px;
    }
  `]
})
export class ErrorMessageComponent {
  @Input() message = 'Something went wrong.';
  @Input() retryable = true;
  @Output() retry = new EventEmitter<void>();
}
