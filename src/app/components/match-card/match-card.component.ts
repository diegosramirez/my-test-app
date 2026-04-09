import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../models/match.interface';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="match-card">
      <div class="match-header">
        <span class="match-date">{{ formatMatchDate(match.matchDate) }}</span>
        <span class="venue">{{ match.venue }}</span>
      </div>

      <div class="match-content">
        <div class="team home-team">
          <div class="team-logo" *ngIf="match.homeTeam.logoUrl">
            <img [src]="match.homeTeam.logoUrl" [alt]="match.homeTeam.name + ' logo'" />
          </div>
          <div class="team-info">
            <span
              class="team-name"
              [title]="match.homeTeam.name"
              [class.truncated]="isTeamNameLong(match.homeTeam.name)">
              {{ truncateTeamName(match.homeTeam.name) }}
            </span>
          </div>
        </div>

        <div class="score-section">
          <div class="score" *ngIf="!loadingScores">
            <span class="home-score">{{ match.homeScore }}</span>
            <span class="score-separator">-</span>
            <span class="away-score">{{ match.awayScore }}</span>
          </div>
          <div class="score loading-score" *ngIf="loadingScores">
            <span class="score-placeholder">-</span>
            <span class="score-separator">-</span>
            <span class="score-placeholder">-</span>
          </div>
          <div class="status" *ngIf="!loadingScores">{{ match.status === 'completed' ? 'FT' : match.status }}</div>
          <div class="status loading-status" *ngIf="loadingScores">
            <div class="status-spinner"></div>
          </div>
        </div>

        <div class="team away-team">
          <div class="team-info">
            <span
              class="team-name"
              [title]="match.awayTeam.name"
              [class.truncated]="isTeamNameLong(match.awayTeam.name)">
              {{ truncateTeamName(match.awayTeam.name) }}
            </span>
          </div>
          <div class="team-logo" *ngIf="match.awayTeam.logoUrl">
            <img [src]="match.awayTeam.logoUrl" [alt]="match.awayTeam.name + ' logo'" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .match-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border: 1px solid #e9ecef;
    }

    .match-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #666;
    }

    .match-date {
      font-weight: 500;
    }

    .venue {
      font-style: italic;
    }

    .match-content {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1rem;
      align-items: center;
    }

    .team {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .home-team {
      justify-content: flex-start;
    }

    .away-team {
      justify-content: flex-end;
      flex-direction: row-reverse;
    }

    .team-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .team-info {
      flex: 1;
      min-width: 0;
    }

    .team-name {
      font-weight: 600;
      font-size: 1rem;
      color: #2c3e50;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: help;
    }

    .team-name.truncated {
      max-width: 120px;
    }

    .score-section {
      text-align: center;
      padding: 0 0.5rem;
    }

    .score {
      font-size: 1.75rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .home-score, .away-score {
      display: inline-block;
      min-width: 2ch;
    }

    .score-separator {
      margin: 0 0.5rem;
      color: #666;
    }

    .status {
      font-size: 0.75rem;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading-score .score-placeholder {
      color: #ccc;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-spinner {
      width: 12px;
      height: 12px;
      border: 1px solid #f3f3f3;
      border-top: 1px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      .match-card {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .match-header {
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
        text-align: center;
      }

      .match-content {
        gap: 0.75rem;
      }

      .team-logo {
        width: 28px;
        height: 28px;
      }

      .team-name {
        font-size: 0.9rem;
      }

      .team-name.truncated {
        max-width: 100px;
      }

      .score {
        font-size: 1.5rem;
      }

      .venue {
        font-size: 0.8rem;
      }
    }

    /* Very small screens */
    @media (max-width: 320px) {
      .team-name.truncated {
        max-width: 80px;
      }

      .match-content {
        gap: 0.5rem;
      }
    }
  `]
})
export class MatchCardComponent {
  @Input() match!: Match;
  @Input() loadingScores: boolean = false;

  formatMatchDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();

      // Ensure timezone-aware comparison by using UTC
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const utcNow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const diffMs = utcNow.getTime() - utcDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        // Use timezone-aware formatting with explicit timezone handling
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          timeZone: 'Europe/London' // Premier League timezone
        });
      }
    } catch {
      return 'Unknown date';
    }
  }

  truncateTeamName(name: string): string {
    if (name.length <= 15) {
      return name;
    }
    return name.substring(0, 15) + '...';
  }

  isTeamNameLong(name: string): boolean {
    return name.length > 15;
  }
}