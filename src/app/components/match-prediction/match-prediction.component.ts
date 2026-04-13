import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';
import { Fixture } from '../../models/fixture.interface';

@Component({
  selector: 'app-match-prediction',
  standalone: true,
  imports: [CommonModule, ProbabilityIndicatorComponent],
  template: `
    <div class="match-prediction-card" [class.no-predictions]="!hasPredictions">
      <!-- Match Header -->
      <div class="match-header">
        <div class="teams">
          <div class="team home-team">
            <span class="team-name">{{ fixture.homeTeam.name }}</span>
          </div>
          <div class="vs">vs</div>
          <div class="team away-team">
            <span class="team-name">{{ fixture.awayTeam.name }}</span>
          </div>
        </div>
        <div class="match-time">
          {{ fixture.kickoffTime | date:'EEE, MMM d, HH:mm' }}
        </div>
      </div>

      <!-- Predictions Section -->
      <div class="predictions-section" *ngIf="hasPredictions">
        <div class="predictions-header">
          <h4>Win Probabilities</h4>
          <div class="confidence-indicator">
            <span
              class="confidence-badge"
              [class.high]="fixture.predictionConfidence === 'high'"
              [class.medium]="fixture.predictionConfidence === 'medium'"
              [class.low]="fixture.predictionConfidence === 'low'">
              {{ fixture.predictionConfidence }} confidence
            </span>
          </div>
        </div>

        <div class="probabilities" *ngIf="!showDetailedView()">
          <div class="probability-summary">
            <div class="team-prob">
              <span class="team-name-short">{{ getShortTeamName(fixture.homeTeam.name) }}</span>
              <span class="prob-percentage">{{ (fixture.homeWinProbability! * 100) | number:'1.0-0' }}%</span>
            </div>
            <div class="draw-prob">
              <span>Draw</span>
              <span class="prob-percentage">{{ (fixture.drawProbability! * 100) | number:'1.0-0' }}%</span>
            </div>
            <div class="team-prob">
              <span class="team-name-short">{{ getShortTeamName(fixture.awayTeam.name) }}</span>
              <span class="prob-percentage">{{ (fixture.awayWinProbability! * 100) | number:'1.0-0' }}%</span>
            </div>
          </div>
        </div>

        <!-- Detailed View (Progressive Disclosure) -->
        <div class="detailed-probabilities" *ngIf="showDetailedView()">
          <app-probability-indicator
            [probability]="fixture.homeWinProbability!"
            [label]="fixture.homeTeam.name + ' Win'">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.drawProbability!"
            label="Draw">
          </app-probability-indicator>

          <app-probability-indicator
            [probability]="fixture.awayWinProbability!"
            [label]="fixture.awayTeam.name + ' Win'">
          </app-probability-indicator>
        </div>

        <div class="prediction-metadata">
          <span class="last-updated" *ngIf="fixture.lastCalculated">
            Updated {{ getTimeAgo(fixture.lastCalculated) }}
          </span>
          <button
            type="button"
            class="details-toggle"
            (click)="toggleDetailedView()"
            *ngIf="hasPredictions">
            {{ showDetailedView() ? 'Less' : 'More' }} details
          </button>
        </div>
      </div>

      <!-- No Predictions Message -->
      <div class="no-predictions-message" *ngIf="!hasPredictions">
        <span class="message">Prediction unavailable</span>
        <span class="reason">Insufficient historical data</span>
      </div>

      <!-- Status Messages -->
      <div class="status-message" *ngIf="fixture.status !== 'scheduled'">
        <span class="status" [class]="fixture.status">
          {{ getStatusText(fixture.status) }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .match-prediction-card {
      background: white;
      border: 1px solid var(--gray-200, #e5e5e5);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .match-prediction-card.no-predictions {
      background-color: #fafafa;
    }

    .match-header {
      margin-bottom: 1rem;
    }

    .teams {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }

    .team {
      flex: 1;
      text-align: center;
    }

    .team-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--gray-900, #111);
    }

    .vs {
      margin: 0 1rem;
      font-size: 0.875rem;
      color: var(--gray-500, #666);
    }

    .match-time {
      text-align: center;
      font-size: 0.875rem;
      color: var(--gray-600, #555);
    }

    .predictions-section {
      border-top: 1px solid var(--gray-200, #e5e5e5);
      padding-top: 1rem;
    }

    .predictions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .predictions-header h4 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--gray-700, #555);
    }

    .confidence-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .confidence-badge.high {
      background-color: #dcfce7;
      color: #166534;
    }

    .confidence-badge.medium {
      background-color: #fef3c7;
      color: #92400e;
    }

    .confidence-badge.low {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .probability-summary {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .team-prob, .draw-prob {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      padding: 0.5rem;
      background-color: var(--gray-50, #f9f9f9);
      border-radius: 6px;
    }

    .team-name-short {
      font-size: 0.75rem;
      color: var(--gray-600, #555);
      margin-bottom: 0.25rem;
    }

    .prob-percentage {
      font-weight: 600;
      font-size: 1rem;
      color: var(--gray-900, #111);
    }

    .detailed-probabilities {
      margin-top: 0.5rem;
    }

    .prediction-metadata {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--gray-100, #f5f5f5);
    }

    .last-updated {
      font-size: 0.75rem;
      color: var(--gray-500, #666);
    }

    .details-toggle {
      background: none;
      border: 1px solid var(--gray-300, #d1d5db);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--gray-600, #555);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .details-toggle:hover {
      background-color: var(--gray-50, #f9f9f9);
      border-color: var(--gray-400, #9ca3af);
    }

    .no-predictions-message {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--gray-500, #666);
    }

    .no-predictions-message .message {
      display: block;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .no-predictions-message .reason {
      font-size: 0.875rem;
    }

    .status-message {
      text-align: center;
      margin-top: 1rem;
      padding: 0.5rem;
      border-radius: 4px;
      background-color: var(--gray-100, #f5f5f5);
    }

    .status.postponed {
      color: #dc2626;
    }

    .status.cancelled {
      color: #dc2626;
      font-weight: 600;
    }

    /* Mobile Optimizations */
    @media screen and (max-width: 768px) {
      .match-prediction-card {
        padding: 0.75rem;
      }

      .teams {
        flex-direction: column;
        gap: 0.5rem;
      }

      .vs {
        margin: 0;
        order: 1;
      }

      .team-name {
        font-size: 0.9rem;
      }

      .probability-summary {
        flex-direction: column;
        gap: 0.5rem;
      }

      .team-prob, .draw-prob {
        flex-direction: row;
        justify-content: space-between;
      }

      .detailed-probabilities [hidden] {
        display: none !important;
      }
    }
  `]
})
export class MatchPredictionComponent implements OnInit {
  @Input() fixture!: Fixture;

  private detailedView = signal(false);

  ngOnInit() {
    // Auto-expand detailed view on larger screens
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      this.detailedView.set(true);
    }
  }

  get hasPredictions(): boolean {
    return !!(this.fixture.homeWinProbability &&
              this.fixture.drawProbability &&
              this.fixture.awayWinProbability);
  }

  showDetailedView(): boolean {
    return this.detailedView();
  }

  toggleDetailedView(): void {
    this.detailedView.set(!this.detailedView());
  }

  getShortTeamName(fullName: string): string {
    const words = fullName.split(' ');
    if (words.length === 1) return fullName;

    // Handle common cases
    if (fullName.includes('Manchester')) return words[1]; // City/United
    if (fullName.includes('Tottenham')) return 'Spurs';
    if (words.length > 1) return words[words.length - 1]; // Last word

    return fullName;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'less than 1 hour ago';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'postponed': return 'Postponed';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return status;
    }
  }
}