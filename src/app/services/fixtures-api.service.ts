import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FixtureWithPrediction, MatchPrediction, TeamForm } from '../models/prediction.model';

interface FixturesApiResponse {
  fixtures: FixtureWithPrediction[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

interface TeamFormApiResponse {
  team_form: TeamForm;
  success: boolean;
  message?: string;
}

interface PredictionCalculationApiResponse {
  prediction: MatchPrediction;
  success: boolean;
  message?: string;
  calculation_time_ms: number;
}

@Injectable({
  providedIn: 'root'
})
export class FixturesApiService {
  private readonly BASE_URL = '/api'; // In production, this would be the actual API URL
  private mockFixtures: FixtureWithPrediction[] = [];

  constructor() {
    this.initializeMockData();
  }

  /**
   * GET /api/fixtures/upcoming-with-predictions
   * Returns upcoming Premier League fixtures with embedded prediction data
   */
  getUpcomingFixturesWithPredictions(params?: {
    limit?: number;
    offset?: number;
    date_from?: string;
    date_to?: string;
  }): Observable<FixturesApiResponse> {
    // Simulate API delay
    return of(null).pipe(
      delay(Math.random() * 1000 + 500), // 500-1500ms delay
      switchMap(() => {
        // Simulate occasional API failures
        if (Math.random() < 0.05) { // 5% failure rate
          return throwError(() => new Error('API service temporarily unavailable'));
        }

        const limit = params?.limit || 10;
        const offset = params?.offset || 0;
        const total = this.mockFixtures.length;

        let filteredFixtures = this.mockFixtures;

        // Apply date filters if provided
        if (params?.date_from) {
          const fromDate = new Date(params.date_from);
          filteredFixtures = filteredFixtures.filter(f => new Date(f.kickoff) >= fromDate);
        }

        if (params?.date_to) {
          const toDate = new Date(params.date_to);
          filteredFixtures = filteredFixtures.filter(f => new Date(f.kickoff) <= toDate);
        }

        // Apply pagination
        const paginatedFixtures = filteredFixtures.slice(offset, offset + limit);

        return of({
          fixtures: paginatedFixtures,
          total: filteredFixtures.length,
          page: Math.floor(offset / limit) + 1,
          limit,
          has_more: (offset + limit) < filteredFixtures.length
        });
      })
    );
  }

  /**
   * GET /api/teams/{id}/form
   * Returns team form data for the specified team
   */
  getTeamForm(teamId: string): Observable<TeamFormApiResponse> {
    return of(null).pipe(
      delay(Math.random() * 300 + 100), // 100-400ms delay
      switchMap(() => {
        const mockTeamForm = this.generateMockTeamForm(teamId);

        if (!mockTeamForm) {
          return of({
            team_form: {} as TeamForm,
            success: false,
            message: `Team form data not found for team: ${teamId}`
          });
        }

        return of({
          team_form: mockTeamForm,
          success: true,
          message: undefined
        });
      })
    );
  }

  /**
   * POST /api/predictions/calculate
   * Triggers manual recalculation of predictions for specified fixtures
   */
  calculatePredictions(request: {
    fixture_ids?: string[];
    team_ids?: string[];
    recalculate_all?: boolean;
  }): Observable<PredictionCalculationApiResponse> {
    return of(null).pipe(
      delay(Math.random() * 2000 + 500), // 500-2500ms delay for calculation
      switchMap(() => {
        // Simulate calculation process
        const calculationTimeMs = Math.random() * 2000 + 300;

        // Generate a sample prediction for response
        const samplePrediction: MatchPrediction = {
          home_win_probability: Math.random() * 0.4 + 0.3, // 0.3-0.7
          draw_probability: Math.random() * 0.3 + 0.2, // 0.2-0.5
          away_win_probability: 0, // Will be calculated
          prediction_confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
          last_calculated: new Date().toISOString(),
          form_period_used: Math.floor(Math.random() * 6) + 5 // 5-10 matches
        };

        // Calculate away probability to ensure they sum to 1
        samplePrediction.away_win_probability = 1 - samplePrediction.home_win_probability - samplePrediction.draw_probability;

        // Ensure all probabilities are positive
        if (samplePrediction.away_win_probability < 0.05) {
          const adjustment = 0.05 - samplePrediction.away_win_probability;
          samplePrediction.away_win_probability = 0.05;
          samplePrediction.home_win_probability -= adjustment / 2;
          samplePrediction.draw_probability -= adjustment / 2;
        }

        // Round to 3 decimal places
        samplePrediction.home_win_probability = Math.round(samplePrediction.home_win_probability * 1000) / 1000;
        samplePrediction.draw_probability = Math.round(samplePrediction.draw_probability * 1000) / 1000;
        samplePrediction.away_win_probability = Math.round(samplePrediction.away_win_probability * 1000) / 1000;

        return of({
          prediction: samplePrediction,
          success: true,
          calculation_time_ms: calculationTimeMs
        });
      })
    );
  }

  /**
   * Helper method to refresh mock data (simulates data updates)
   */
  refreshMockData(): void {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const teams = [
      { id: 'arsenal', name: 'Arsenal' },
      { id: 'chelsea', name: 'Chelsea' },
      { id: 'liverpool', name: 'Liverpool' },
      { id: 'manchester-city', name: 'Manchester City' },
      { id: 'manchester-united', name: 'Manchester United' },
      { id: 'tottenham', name: 'Tottenham' },
      { id: 'newcastle', name: 'Newcastle United' },
      { id: 'brighton', name: 'Brighton & Hove Albion' },
      { id: 'aston-villa', name: 'Aston Villa' },
      { id: 'west-ham', name: 'West Ham United' },
      { id: 'crystal-palace', name: 'Crystal Palace' },
      { id: 'fulham', name: 'Fulham' },
      { id: 'brentford', name: 'Brentford' },
      { id: 'wolves', name: 'Wolverhampton Wanderers' },
      { id: 'everton', name: 'Everton' }
    ];

    this.mockFixtures = [];
    const fixturesCount = 8; // Generate 8 upcoming fixtures

    for (let i = 0; i < fixturesCount; i++) {
      const homeTeam = teams[Math.floor(Math.random() * teams.length)];
      let awayTeam = teams[Math.floor(Math.random() * teams.length)];

      // Ensure different teams
      while (awayTeam.id === homeTeam.id) {
        awayTeam = teams[Math.floor(Math.random() * teams.length)];
      }

      // Generate kickoff times (next 2 weeks)
      const kickoffDate = new Date();
      kickoffDate.setDate(kickoffDate.getDate() + i + 1);
      kickoffDate.setHours(15 + (i % 3), 0, 0, 0); // Vary kickoff times

      // Determine status (most scheduled, some postponed/cancelled)
      let status: 'scheduled' | 'postponed' | 'cancelled' = 'scheduled';
      if (Math.random() < 0.05) status = 'postponed';
      if (Math.random() < 0.02) status = 'cancelled';

      // Generate prediction (only for scheduled matches)
      let prediction: MatchPrediction | undefined;
      if (status === 'scheduled' && Math.random() > 0.1) { // 90% have predictions
        prediction = this.generateMockPrediction();
      }

      this.mockFixtures.push({
        id: `fixture-${Date.now()}-${i}`,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoff: kickoffDate.toISOString(),
        venue: `${homeTeam.name.split(' ')[0]} Stadium`,
        status,
        prediction
      });
    }

    // Sort by kickoff time
    this.mockFixtures.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }

  private generateMockTeamForm(teamId: string): TeamForm | null {
    const premierLeagueTeams = [
      'arsenal', 'chelsea', 'liverpool', 'manchester-city', 'manchester-united',
      'tottenham', 'newcastle', 'brighton', 'aston-villa', 'west-ham',
      'crystal-palace', 'fulham', 'brentford', 'wolves', 'everton'
    ];

    if (!premierLeagueTeams.includes(teamId)) {
      return null;
    }

    // Generate recent matches (last 8 games)
    const recentMatches = [];
    for (let i = 0; i < 8; i++) {
      const result = Math.random() > 0.6 ? 'win' : Math.random() > 0.5 ? 'draw' : 'loss';
      const isHome = Math.random() > 0.5;

      let goalsFor = Math.floor(Math.random() * 4);
      let goalsAgainst = Math.floor(Math.random() * 3);

      // Adjust goals to match result
      if (result === 'win') {
        goalsAgainst = Math.min(goalsAgainst, goalsFor - 1);
      } else if (result === 'loss') {
        goalsFor = Math.min(goalsFor, goalsAgainst - 1);
      } else {
        goalsAgainst = goalsFor;
      }

      recentMatches.push({
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        opponent: `Opponent ${i + 1}`,
        isHome,
        result: result as 'win' | 'draw' | 'loss',
        goalsFor,
        goalsAgainst,
        points: result === 'win' ? 3 : result === 'draw' ? 1 : 0
      });
    }

    // Calculate form ratings
    const totalPoints = recentMatches.reduce((sum, match) => sum + match.points, 0);
    const formRating = Math.round((totalPoints / (recentMatches.length * 3)) * 100);

    const homeMatches = recentMatches.filter(match => match.isHome);
    const awayMatches = recentMatches.filter(match => !match.isHome);

    const homePoints = homeMatches.reduce((sum, match) => sum + match.points, 0);
    const awayPoints = awayMatches.reduce((sum, match) => sum + match.points, 0);

    const homeFormRating = homeMatches.length > 0 ? Math.round((homePoints / (homeMatches.length * 3)) * 100) : formRating;
    const awayFormRating = awayMatches.length > 0 ? Math.round((awayPoints / (awayMatches.length * 3)) * 100) : formRating;

    return {
      teamId,
      teamName: this.formatTeamName(teamId),
      recentMatches,
      formRating,
      homeFormRating,
      awayFormRating
    };
  }

  private generateMockPrediction(): MatchPrediction {
    let homeWin = Math.random() * 0.5 + 0.2; // 0.2-0.7
    let draw = Math.random() * 0.4 + 0.15; // 0.15-0.55
    let awayWin = 1 - homeWin - draw;

    // Ensure all probabilities are reasonable
    if (awayWin < 0.05) {
      const adjustment = 0.05 - awayWin;
      awayWin = 0.05;
      homeWin -= adjustment / 2;
      draw -= adjustment / 2;
    }

    // Round to 3 decimal places
    homeWin = Math.round(homeWin * 1000) / 1000;
    draw = Math.round(draw * 1000) / 1000;
    awayWin = Math.round(awayWin * 1000) / 1000;

    // Determine confidence
    const maxProb = Math.max(homeWin, draw, awayWin);
    const confidence = maxProb > 0.5 ? 'high' : maxProb > 0.4 ? 'medium' : 'low';

    return {
      home_win_probability: homeWin,
      draw_probability: draw,
      away_win_probability: awayWin,
      prediction_confidence: confidence,
      last_calculated: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString(), // Within last 2 hours
      form_period_used: Math.floor(Math.random() * 6) + 5 // 5-10 matches
    };
  }

  private formatTeamName(teamId: string): string {
    return teamId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}