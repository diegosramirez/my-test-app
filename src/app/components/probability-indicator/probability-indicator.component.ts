import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-probability-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="probability-indicator">
      <div class="probability-info">
        <span class="label">{{ label }}</span>
        <span class="percentage">{{ (probability * 100) | number:'1.0-0' }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          [class.favorite]="isFavorite"
          [class.close]="isClose"
          [class.underdog]="isUnderdog"
          [style.width.%]="probability * 100">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .probability-indicator {
      margin-bottom: 0.5rem;
    }

    .probability-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
    }

    .label {
      font-weight: 500;
      color: var(--gray-700, #666);
    }

    .percentage {
      font-weight: 600;
      color: var(--gray-900, #333);
    }

    .progress-bar {
      height: 8px;
      background-color: var(--gray-200, #e5e5e5);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease, background-color 0.3s ease;
      border-radius: 4px;
    }

    .progress-fill.favorite {
      background-color: #22c55e; /* Green for favorites */
    }

    .progress-fill.close {
      background-color: #f59e0b; /* Amber for close matches */
    }

    .progress-fill.underdog {
      background-color: #6b7280; /* Gray for underdogs */
    }

    @media screen and (max-width: 768px) {
      .probability-info {
        font-size: 0.8rem;
      }

      .progress-bar {
        height: 6px;
      }
    }
  `]
})
export class ProbabilityIndicatorComponent {
  @Input() probability: number = 0;
  @Input() label: string = '';

  get isFavorite(): boolean {
    return this.probability >= 0.5;
  }

  get isClose(): boolean {
    return this.probability >= 0.3 && this.probability < 0.5;
  }

  get isUnderdog(): boolean {
    return this.probability < 0.3;
  }
}