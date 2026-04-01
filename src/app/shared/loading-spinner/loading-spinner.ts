import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-container" aria-live="polite" [attr.aria-label]="label" role="status">
      <div class="spinner"></div>
      <span class="sr-only">{{ label }}</span>
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border, #e0e0e0);
      border-top-color: var(--color-primary, #1976d2);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading...';
}
