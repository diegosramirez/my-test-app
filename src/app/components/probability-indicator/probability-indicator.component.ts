import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-probability-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="probability-indicator" [attr.data-testid]="'probability-' + label">
      <div class="probability-header">
        <span class="label">{{ label }}</span>
        <span class="percentage" [ngClass]="getPercentageClass()">{{ formatPercentage() }}</span>
      </div>
      <div class="progress-bar" [ngClass]="getProgressBarClass()">
        <div
          class="progress-fill"
          [style.width.%]="probability * 100"
          [ngClass]="getFillClass()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .probability-indicator {
      margin-bottom: 0.75rem;
    }

    .probability-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
    }

    .label {
      font-weight: 500;
      color: #374151;
    }

    .percentage {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .percentage.favorite {
      color: #059669; /* green-600 */
    }

    .percentage.close {
      color: #d97706; /* amber-600 */
    }

    .percentage.unlikely {
      color: #6b7280; /* gray-500 */
    }

    .progress-bar {
      height: 0.5rem;
      background-color: #f3f4f6;
      border-radius: 0.25rem;
      overflow: hidden;
      position: relative;
    }

    .progress-bar.high-confidence {
      border: 1px solid #e5e7eb;
    }

    .progress-bar.medium-confidence {
      border: 1px solid #d1d5db;
    }

    .progress-bar.low-confidence {
      border: 1px dashed #d1d5db;
    }

    .progress-fill {
      height: 100%;
      border-radius: 0.25rem;
      transition: width 0.3s ease-in-out;
    }

    .progress-fill.favorite {
      background: linear-gradient(90deg, #10b981, #059669); /* green gradient */
    }

    .progress-fill.close {
      background: linear-gradient(90deg, #f59e0b, #d97706); /* amber gradient */
    }

    .progress-fill.unlikely {
      background: linear-gradient(90deg, #9ca3af, #6b7280); /* gray gradient */
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .probability-header {
        font-size: 0.8rem;
      }

      .percentage {
        font-size: 0.8rem;
      }

      .progress-bar {
        height: 0.375rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .progress-bar {
        border: 2px solid #000;
      }

      .progress-fill {
        background: #000 !important;
      }

      .label, .percentage {
        color: #000 !important;
      }
    }
  `]
})
export class ProbabilityIndicatorComponent {
  @Input() probability: number = 0;
  @Input() label: string = '';
  @Input() confidence: 'high' | 'medium' | 'low' = 'medium';

  formatPercentage(): string {
    return `${Math.round(this.probability * 100)}%`;
  }

  getPercentageClass(): string {
    if (this.probability >= 0.5) return 'favorite';
    if (this.probability >= 0.35) return 'close';
    return 'unlikely';
  }

  getProgressBarClass(): string {
    return `${this.confidence}-confidence`;
  }

  getFillClass(): string {
    if (this.probability >= 0.5) return 'favorite';
    if (this.probability >= 0.35) return 'close';
    return 'unlikely';
  }
}