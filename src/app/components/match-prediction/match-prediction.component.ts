import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FixtureWithPrediction } from '../../models/prediction.model';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';

@Component({
  selector: 'app-match-prediction',
  standalone: true,
  imports: [CommonModule, ProbabilityIndicatorComponent],
  template: `
    <div class="match-prediction-card" [attr.data-testid]="'match-' + fixture.id">
      <!-- Match Header -->
      <div class="match-header">
        <div class="teams">
          <div class="team home">
            <span class="team-name">{{ fixture.homeTeam }}</span>
            <span class="home-indicator">HOME</span>
          </div>
          <div class="vs">vs</div>
          <div class="team away">
            <span class="team-name">{{ fixture.awayTeam }}</span>
          </div>
        </div>
        <div class="match-details">
          <div class="kickoff">{{ formatKickoff() }}</div>
          <div class="venue">{{ fixture.venue }}</div>
        </div>
      </div>

      <!-- Prediction Section -->
      <div class="prediction-section" *ngIf="fixture.prediction && fixture.status === 'scheduled'; else noPrediction">
        <div class="prediction-header">
          <h4>Win Probabilities</h4>
          <div class="confidence-badge" [ngClass]="fixture.prediction.prediction_confidence">
            {{ fixture.prediction.prediction_confidence | titlecase }} Confidence
          </div>
        </div>

        <!-- Probability Indicators -->
        <div class="probabilities">
          <app-probability-indicator
            [probability]="fixture.prediction.home_win_probability"
            [label]="fixture.homeTeam + ' Win'"
            [confidence]="fixture.prediction.prediction_confidence">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.prediction.draw_probability"
            [label]="'Draw'"
            [confidence]="fixture.prediction.prediction_confidence">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.prediction.away_win_probability"
            [label]="fixture.awayTeam + ' Win'"
            [confidence]="fixture.prediction.prediction_confidence">
          </app-probability-indicator>
        </div>

        <!-- Prediction Metadata -->
        <div class="prediction-metadata">
          <div class="last-updated">
            Updated {{ getTimeSinceUpdate() }}
          </div>
          <div class="form-period">
            Based on last {{ fixture.prediction.form_period_used }} matches
          </div>
        </div>

        <!-- Expandable Details (Mobile) -->
        <button
          class="toggle-details mobile-only"
          (click)="toggleDetails()"
          [attr.aria-expanded]="showDetails">
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </button>

        <div class="prediction-details" [ngClass]="{ 'expanded': showDetails }">
          <div class="detail-row">
            <span class="label">Most Likely Outcome:</span>
            <span class="value">{{ getMostLikelyOutcome() }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Prediction Strength:</span>
            <span class="value">{{ getPredictionStrength() }}</span>
          </div>
        </div>
      </div>

      <ng-template #noPrediction>
        <div class="no-prediction" [attr.data-testid]="'no-prediction-' + fixture.id">
          <div class="icon">⚠️</div>
          <div class="message">
            <span *ngIf="fixture.status === 'postponed'">Match postponed</span>
            <span *ngIf="fixture.status === 'cancelled'">Match cancelled</span>
            <span *ngIf="fixture.status === 'scheduled'">Prediction unavailable</span>
          </div>
          <div class="reason" *ngIf="fixture.status === 'scheduled'">
            Insufficient historical data
          </div>
        </div>
      </ng-template>

      <!-- Action Buttons -->
      <div class="actions" *ngIf="fixture.prediction">
        <button
          class="refresh-btn"
          (click)="onRefreshPrediction()"
          [disabled]="refreshing"
          [attr.data-testid]="'refresh-' + fixture.id">
          {{ refreshing ? 'Refreshing...' : 'Refresh Prediction' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .match-prediction-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .match-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .teams {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .team {
      flex: 1;
      text-align: center;
    }

    .team.home {
      text-align: left;
    }

    .team.away {
      text-align: right;
    }

    .team-name {
      font-weight: 600;
      font-size: 1.125rem;
      color: #111827;
      display: block;
    }

    .home-indicator {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
      margin-top: 0.25rem;
    }

    .vs {
      font-weight: 500;
      color: #6b7280;
      margin: 0 1rem;
    }

    .match-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .prediction-section {
      margin-top: 1rem;
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
      color: #111827;
    }

    .confidence-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .confidence-badge.high {
      background-color: #d1fae5;
      color: #065f46;
    }

    .confidence-badge.medium {
      background-color: #fef3c7;
      color: #92400e;
    }

    .confidence-badge.low {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .probabilities {
      margin-bottom: 1rem;
    }

    .prediction-metadata {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .toggle-details {
      display: none;
      width: 100%;
      padding: 0.5rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.25rem;
      color: #374151;
      font-size: 0.875rem;
      cursor: pointer;
      margin-bottom: 0.75rem;
    }

    .prediction-details {
      display: block;
      opacity: 1;
      max-height: none;
      overflow: visible;
      transition: all 0.3s ease;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.875rem;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      color: #6b7280;
    }

    .detail-row .value {
      font-weight: 500;
      color: #111827;
    }

    .no-prediction {
      text-align: center;
      padding: 2rem 1rem;
      background-color: #fef3c7;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }

    .no-prediction .icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-prediction .message {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 0.25rem;
    }

    .no-prediction .reason {
      font-size: 0.875rem;
      color: #d97706;
    }

    .actions {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #f3f4f6;
      display: flex;
      justify-content: center;
    }

    .refresh-btn {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .refresh-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    /* Mobile Styles */
    @media (max-width: 640px) {
      .match-prediction-card {
        padding: 1rem;
      }

      .teams {
        flex-direction: column;
        gap: 0.5rem;
      }

      .team {
        text-align: center !important;
      }

      .vs {
        margin: 0;
        order: 1;
      }

      .match-details {
        flex-direction: column;
        gap: 0.25rem;
        text-align: center;
      }

      .prediction-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .prediction-metadata {
        flex-direction: column;
        gap: 0.25rem;
      }

      .toggle-details.mobile-only {
        display: block;
      }

      .prediction-details {
        display: none;
        opacity: 0;
        max-height: 0;
        overflow: hidden;
      }

      .prediction-details.expanded {
        display: block;
        opacity: 1;
        max-height: 500px;
        overflow: visible;
      }
    }
  `]
})
export class MatchPredictionComponent {
  @Input() fixture!: FixtureWithPrediction;
  @Input() refreshing: boolean = false;
  @Output() refreshPrediction = new EventEmitter<string>();
  @Output() predictionClicked = new EventEmitter<{
    matchId: string;
    predictionConfidence: string;
    action: string;
  }>();

  showDetails = false;

  formatKickoff(): string {
    const date = new Date(this.fixture.kickoff);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeSinceUpdate(): string {
    if (!this.fixture.prediction?.last_calculated) return 'Unknown';

    const now = new Date();
    const updated = new Date(this.fixture.prediction.last_calculated);
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    }
  }

  getMostLikelyOutcome(): string {
    if (!this.fixture.prediction) return 'Unknown';

    const { home_win_probability, draw_probability, away_win_probability } = this.fixture.prediction;
    const maxProb = Math.max(home_win_probability, draw_probability, away_win_probability);

    if (maxProb === home_win_probability) {
      return `${this.fixture.homeTeam} Win (${Math.round(maxProb * 100)}%)`;
    } else if (maxProb === away_win_probability) {
      return `${this.fixture.awayTeam} Win (${Math.round(maxProb * 100)}%)`;
    } else {
      return `Draw (${Math.round(maxProb * 100)}%)`;
    }
  }

  getPredictionStrength(): string {
    if (!this.fixture.prediction) return 'Unknown';

    const { home_win_probability, draw_probability, away_win_probability } = this.fixture.prediction;
    const maxProb = Math.max(home_win_probability, draw_probability, away_win_probability);

    if (maxProb > 0.6) return 'Strong';
    if (maxProb > 0.45) return 'Moderate';
    return 'Weak';
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;

    if (this.fixture.prediction) {
      this.predictionClicked.emit({
        matchId: this.fixture.id,
        predictionConfidence: this.fixture.prediction.prediction_confidence,
        action: this.showDetails ? 'expand_details' : 'collapse_details'
      });
    }
  }

  onRefreshPrediction(): void {
    this.refreshPrediction.emit(this.fixture.id);

    if (this.fixture.prediction) {
      this.predictionClicked.emit({
        matchId: this.fixture.id,
        predictionConfidence: this.fixture.prediction.prediction_confidence,
        action: 'refresh_requested'
      });
    }
  }
}