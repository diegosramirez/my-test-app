import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Fixture, TeamForm, PredictionResponse } from '../models/prediction.interface';

@Injectable({
  providedIn: 'root'
})
export class FixtureService {
  constructor() {}

  /**
   * GET /api/fixtures/upcoming-with-predictions
   * Returns upcoming Premier League fixtures with embedded prediction data
   */
  getUpcomingFixturesWithPredictions(): Observable<Fixture[]> {
    // Mock upcoming Premier League fixtures
    const mockFixtures: Fixture[] = [
      {
        id: 'fixture-1',
        home_team: 'Manchester City',
        away_team: 'Arsenal',
        home_team_id: 'team-mci',
        away_team_id: 'team-ars',
        kick_off: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'scheduled',
        venue: 'Etihad Stadium'
      },
      {
        id: 'fixture-2',
        home_team: 'Liverpool',
        away_team: 'Chelsea',
        home_team_id: 'team-liv',
        away_team_id: 'team-che',
        kick_off: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'scheduled',
        venue: 'Anfield'
      },
      {
        id: 'fixture-3',
        home_team: 'Tottenham',
        away_team: 'Manchester United',
        home_team_id: 'team-tot',
        away_team_id: 'team-mun',
        kick_off: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        status: 'scheduled',
        venue: 'Tottenham Hotspur Stadium'
      },
      {
        id: 'fixture-4',
        home_team: 'Brighton',
        away_team: 'Newcastle',
        home_team_id: 'team-bri',
        away_team_id: 'team-new',
        kick_off: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'scheduled',
        venue: 'Amex Stadium'
      },
      {
        id: 'fixture-5',
        home_team: 'West Ham',
        away_team: 'Everton',
        home_team_id: 'team-whu',
        away_team_id: 'team-eve',
        kick_off: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        status: 'postponed',
        venue: 'London Stadium'
      }
    ];

    return of(mockFixtures).pipe(
      delay(300), // Simulate network delay
      map(fixtures => fixtures.map(fixture => ({
        ...fixture,
        prediction: this.generateMockPrediction(fixture.id)
      })))
    );
  }

  /**
   * GET /api/teams/{id}/form
   * Returns team form data for the last 5-10 matches
   */
  getTeamForm(teamId: string): Observable<TeamForm> {
    const mockFormData: TeamForm = {
      team_id: teamId,
      recent_matches: this.generateMockRecentMatches(),
      points_per_game: 1.5 + Math.random() * 1.5,
      goals_scored_avg: 1.2 + Math.random() * 0.8,
      goals_conceded_avg: 0.8 + Math.random() * 0.8,
      home_record: {
        wins: Math.floor(Math.random() * 5) + 2,
        draws: Math.floor(Math.random() * 3) + 1,
        losses: Math.floor(Math.random() * 3),
        goals_scored: Math.floor(Math.random() * 10) + 5,
        goals_conceded: Math.floor(Math.random() * 8) + 2
      },
      away_record: {
        wins: Math.floor(Math.random() * 4) + 1,
        draws: Math.floor(Math.random() * 3) + 1,
        losses: Math.floor(Math.random() * 4) + 1,
        goals_scored: Math.floor(Math.random() * 8) + 3,
        goals_conceded: Math.floor(Math.random() * 9) + 3
      }
    };

    return of(mockFormData).pipe(delay(100));
  }

  /**
   * POST /api/predictions/calculate
   * Trigger manual recalculation of predictions
   */
  triggerPredictionRecalculation(fixtureIds: string[]): Observable<PredictionResponse[]> {
    const responses: PredictionResponse[] = fixtureIds.map(id => ({
      fixture_id: id,
      prediction: this.generateMockPrediction(id),
      calculation_time_ms: Math.floor(Math.random() * 100) + 80
    }));

    return of(responses).pipe(delay(200));
  }

  private generateMockPrediction(fixtureId: string) {
    // Generate consistent but varied predictions based on fixture ID
    const seed = this.hashCode(fixtureId) / 1000000;
    const random = Math.abs(seed % 1);

    let home = 0.25 + random * 0.45;
    let away = 0.15 + (1 - random) * 0.45;
    let draw = 1.0 - home - away;

    // Ensure minimum probabilities
    home = Math.max(0.08, home);
    away = Math.max(0.08, away);
    draw = Math.max(0.15, draw);

    // Normalize
    const total = home + draw + away;
    home = home / total;
    draw = draw / total;
    away = away / total;

    // Handle postponed matches
    if (fixtureId === 'fixture-5') {
      return {
        home_win_probability: 0,
        draw_probability: 0,
        away_win_probability: 0,
        prediction_confidence: 'unavailable' as const,
        last_calculated: new Date(),
        form_period_used: 0
      };
    }

    return {
      home_win_probability: Math.round(home * 1000) / 1000,
      draw_probability: Math.round(draw * 1000) / 1000,
      away_win_probability: Math.round(away * 1000) / 1000,
      prediction_confidence: home > 0.55 || away > 0.55 ? 'high' as const :
                           home > 0.4 || away > 0.4 ? 'medium' as const : 'low' as const,
      last_calculated: new Date(Date.now() - Math.floor(random * 4 * 60 * 60 * 1000)), // Random time in last 4 hours
      form_period_used: Math.floor(5 + random * 5) // 5-10 matches
    };
  }

  private generateMockRecentMatches() {
    const results = ['win', 'draw', 'loss'] as const;
    const matches = [];
    const numMatches = Math.floor(Math.random() * 6) + 5; // 5-10 matches

    for (let i = 0; i < numMatches; i++) {
      matches.push({
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000), // Weekly matches going back
        opponent: `Team ${i + 1}`,
        is_home: Math.random() > 0.5,
        result: results[Math.floor(Math.random() * 3)],
        goals_scored: Math.floor(Math.random() * 4),
        goals_conceded: Math.floor(Math.random() * 3)
      });
    }

    return matches;
  }

  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}