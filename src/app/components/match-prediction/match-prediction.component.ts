import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Fixture } from '../../models/prediction.interface';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';

@Component({
  selector: 'app-match-prediction',
  standalone: true,
  imports: [CommonModule, ProbabilityIndicatorComponent],
  templateUrl: './match-prediction.component.html',
  styleUrl: './match-prediction.component.css'
})
export class MatchPredictionComponent {
  @Input() fixture!: Fixture;
  @Input() showDetails: boolean = false;
  @Output() predictionClicked = new EventEmitter<{
    match_id: string;
    prediction_confidence: string;
    user_action: string;
  }>();

  get formattedKickOff(): string {
    return this.fixture.kick_off.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get timeUntilKickOff(): string {
    const now = new Date();
    const diff = this.fixture.kick_off.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `In ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'Starting soon';
    }
  }

  get lastUpdatedText(): string {
    if (!this.fixture.prediction || this.fixture.prediction.prediction_confidence === 'unavailable') {
      return 'Prediction unavailable';
    }

    const now = new Date();
    const lastCalc = this.fixture.prediction.last_calculated;
    const diffHours = Math.floor((now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Updated less than 1 hour ago';
    } else if (diffHours === 1) {
      return 'Updated 1 hour ago';
    } else {
      return `Updated ${diffHours} hours ago`;
    }
  }

  get statusDisplayText(): string {
    switch (this.fixture.status) {
      case 'scheduled': return '';
      case 'postponed': return 'Postponed';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return '';
    }
  }

  get mostLikelyOutcome(): { outcome: 'home' | 'draw' | 'away'; probability: number } {
    if (!this.fixture.prediction || this.fixture.prediction.prediction_confidence === 'unavailable') {
      return { outcome: 'home', probability: 0 };
    }

    const { home_win_probability, draw_probability, away_win_probability } = this.fixture.prediction;

    if (home_win_probability >= draw_probability && home_win_probability >= away_win_probability) {
      return { outcome: 'home', probability: home_win_probability };
    } else if (away_win_probability >= draw_probability) {
      return { outcome: 'away', probability: away_win_probability };
    } else {
      return { outcome: 'draw', probability: draw_probability };
    }
  }

  get isCloseMatch(): boolean {
    if (!this.fixture.prediction || this.fixture.prediction.prediction_confidence === 'unavailable') {
      return false;
    }

    const max = Math.max(
      this.fixture.prediction.home_win_probability,
      this.fixture.prediction.draw_probability,
      this.fixture.prediction.away_win_probability
    );

    return max <= 0.55; // Close match if no outcome > 55%
  }

  get matchCardClass(): string {
    const classes = ['match-card'];

    if (this.fixture.status !== 'scheduled') {
      classes.push('match-card--disrupted');
    } else if (this.isCloseMatch) {
      classes.push('match-card--close');
    } else {
      classes.push('match-card--clear-favorite');
    }

    return classes.join(' ');
  }

  onPredictionClick(action: string): void {
    if (!this.fixture.prediction) return;

    this.predictionClicked.emit({
      match_id: this.fixture.id,
      prediction_confidence: this.fixture.prediction.prediction_confidence,
      user_action: action
    });
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
    this.onPredictionClick('toggle_details');
  }
}