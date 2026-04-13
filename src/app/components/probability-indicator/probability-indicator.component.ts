import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-probability-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="probability-container">
      <div class="probability-label">
        <span>{{ label }}</span>
        <span class="percentage">{{ (probability * 100).toFixed(0) }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          [style.width.%]="probability * 100"
          [class]="getColorClass()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .probability-container {
      margin-bottom: 0.5rem;
    }

    .probability-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .percentage {
      font-weight: 600;
      color: var(--gray-700, #374151);
    }

    .progress-bar {
      height: 0.5rem;
      background-color: var(--gray-200, #e5e7eb);
      border-radius: 0.25rem;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      border-radius: 0.25rem;
      transition: width 0.3s ease;
      position: relative;
    }

    /* Color classes for different probability ranges */
    .progress-fill.favorite {
      background: linear-gradient(90deg, #10b981, #059669); /* Green for favorites */
    }

    .progress-fill.close {
      background: linear-gradient(90deg, #f59e0b, #d97706); /* Amber for close matches */
    }

    .progress-fill.underdog {
      background: linear-gradient(90deg, #ef4444, #dc2626); /* Red for underdogs */
    }

    .progress-fill.unlikely {
      background: linear-gradient(90deg, #6b7280, #4b5563); /* Gray for very low probability */
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .probability-label {
        font-size: 0.8rem;
      }

      .progress-bar {
        height: 0.375rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProbabilityIndicatorComponent {
  @Input() probability: number = 0;
  @Input() label: string = '';

  getColorClass(): string {
    if (this.probability >= 0.5) {
      return 'favorite'; // Green for favorites (50%+)
    } else if (this.probability >= 0.3) {
      return 'close'; // Amber for close matches (30-49%)
    } else if (this.probability >= 0.15) {
      return 'underdog'; // Red for underdogs (15-29%)
    } else {
      return 'unlikely'; // Gray for very unlikely (<15%)
    }
  }
}