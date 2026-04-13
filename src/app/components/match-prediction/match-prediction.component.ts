import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Fixture } from '../../models/fixture.model';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';

@Component({
  selector: 'app-match-prediction',
  standalone: true,
  imports: [CommonModule, ProbabilityIndicatorComponent],
  template: `
    <div class="match-card" [class]="getStatusClass()">
      <div class="match-header">
        <div class="teams">
          <div class="team">
            <span class="team-name">{{ fixture.home_team.name }}</span>
            <span class="vs">vs</span>
            <span class="team-name">{{ fixture.away_team.name }}</span>
          </div>
        </div>
        <div class="match-info">
          <div class="date">{{ formatDate(fixture.date) }}</div>
          <div class="venue" *ngIf="fixture.venue">{{ fixture.venue }}</div>
          <div class="status" [class]="'status-' + fixture.status">
            {{ getStatusDisplay() }}
          </div>
        </div>
      </div>

      <!-- Prediction Content -->
      <div class="prediction-content" *ngIf="showPredictions()">
        <div class="prediction-header">
          <h4>Win Probabilities</h4>
          <div class="confidence-badge" [class]="'confidence-' + fixture.prediction!.prediction_confidence">
            {{ fixture.prediction!.prediction_confidence.toUpperCase() }}
          </div>
        </div>

        <div class="probabilities">
          <app-probability-indicator
            [probability]="fixture.prediction!.home_win_probability"
            [label]="fixture.home_team.name + ' Win'">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.prediction!.draw_probability"
            label="Draw">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.prediction!.away_win_probability"
            [label]="fixture.away_team.name + ' Win'">
          </app-probability-indicator>
        </div>

        <div class="prediction-meta">
          <div class="update-time">
            <small>Updated {{ getTimeAgo() }}</small>
          </div>
          <div class="form-period">
            <small>Based on {{ fixture.prediction!.form_period_used }} recent matches</small>
          </div>
        </div>
      </div>

      <!-- Unavailable Prediction Message -->
      <div class="prediction-unavailable" *ngIf="showUnavailableMessage()">
        <p>{{ getUnavailableMessage() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .match-card {
      border: 1px solid var(--gray-200, #e5e7eb);
      border-radius: 0.75rem;
      padding: 1rem;
      background: white;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      margin-bottom: 1rem;
      transition: box-shadow 0.2s ease;
    }

    .match-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .match-card.postponed {
      background-color: #fef3c7;
      border-color: #f59e0b;
    }

    .match-card.cancelled {
      background-color: #fee2e2;
      border-color: #ef4444;
    }

    .match-header {
      margin-bottom: 1rem;
    }

    .teams {
      margin-bottom: 0.5rem;
    }

    .team {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      font-size: 1.125rem;
    }

    .team-name {
      color: var(--gray-900, #111827);
    }

    .vs {
      color: var(--gray-500, #6b7280);
      font-weight: normal;
      font-size: 0.875rem;
    }

    .match-info {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      font-size: 0.875rem;
      color: var(--gray-600, #4b5563);
    }

    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .status-scheduled {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .status-postponed {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .prediction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .prediction-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--gray-900, #111827);
    }

    .confidence-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .confidence-high {
      background-color: #dcfce7;
      color: #166534;
    }

    .confidence-medium {
      background-color: #fef3c7;
      color: #92400e;
    }

    .confidence-low {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .probabilities {
      margin-bottom: 1rem;
    }

    .prediction-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--gray-200, #e5e7eb);
    }

    .prediction-meta small {
      color: var(--gray-500, #6b7280);
    }

    .prediction-unavailable {
      text-align: center;
      padding: 1.5rem;
      color: var(--gray-500, #6b7280);
      font-style: italic;
      border: 2px dashed var(--gray-200, #e5e7eb);
      border-radius: 0.5rem;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .match-card {
        padding: 0.75rem;
      }

      .team {
        flex-direction: column;
        text-align: center;
        gap: 0.25rem;
      }

      .vs {
        order: -1;
      }

      .match-info {
        justify-content: center;
        gap: 0.5rem;
      }

      .prediction-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .prediction-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchPredictionComponent {
  @Input() fixture!: Fixture;

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  getStatusDisplay(): string {
    switch (this.fixture.status) {
      case 'scheduled': return 'Scheduled';
      case 'postponed': return 'Postponed';
      case 'cancelled': return 'Cancelled';
      case 'live': return 'Live';
      case 'finished': return 'Finished';
      default: return 'Unknown';
    }
  }

  getStatusClass(): string {
    return this.fixture.status;
  }

  showPredictions(): boolean {
    return this.fixture.status === 'scheduled' && this.fixture.prediction != null;
  }

  showUnavailableMessage(): boolean {
    return this.fixture.status === 'scheduled' && this.fixture.prediction == null;
  }

  getUnavailableMessage(): string {
    if (this.fixture.status === 'postponed') {
      return 'Match postponed - predictions unavailable';
    } else if (this.fixture.status === 'cancelled') {
      return 'Match cancelled';
    } else {
      return 'Prediction unavailable - insufficient historical data';
    }
  }

  getTimeAgo(): string {
    if (!this.fixture.prediction) return '';

    const now = new Date();
    const calculatedTime = new Date(this.fixture.prediction.last_calculated);
    const diffHours = Math.floor((now.getTime() - calculatedTime.getTime()) / (1000 * 60 * 60));

    if (diffHours === 0) {
      return 'just now';
    } else if (diffHours === 1) {
      return '1 hour ago';
    } else {
      return `${diffHours} hours ago`;
    }
  }
}