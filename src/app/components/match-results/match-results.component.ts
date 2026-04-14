import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../services/football-data.service';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-results.component.html',
  styleUrl: './match-results.component.css'
})
export class MatchResultsComponent {
  @Input() matches: Match[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;

  formatMatchDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getMatchResult(match: Match): string {
    if (match.homeScore > match.awayScore) {
      return 'home-win';
    } else if (match.awayScore > match.homeScore) {
      return 'away-win';
    }
    return 'draw';
  }
}