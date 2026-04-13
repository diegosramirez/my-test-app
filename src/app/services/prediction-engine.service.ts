import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  MatchPrediction,
  TeamForm,
  Fixture,
  PredictionRequest,
  PredictionResponse
} from '../models/prediction.interface';

@Injectable({
  providedIn: 'root'
})
export class PredictionEngineService {
  private predictionCache = new Map<string, { prediction: MatchPrediction; cachedAt: Date }>();
  private readonly CACHE_DURATION_HOURS = 4;

  constructor() {}

  /**
   * Calculate win probabilities for a fixture based on team form
   */
  calculatePrediction(fixture: Fixture, homeForm: TeamForm, awayForm: TeamForm): Observable<MatchPrediction> {
    const cacheKey = `${fixture.id}_${fixture.kick_off.getTime()}`;
    const cached = this.predictionCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && this.isCacheValid(cached.cachedAt)) {
      return of(cached.prediction);
    }

    // Check if we have sufficient data
    if (homeForm.recent_matches.length < 3 || awayForm.recent_matches.length < 3) {
      const unavailablePrediction: MatchPrediction = {
        home_win_probability: 0,
        draw_probability: 0,
        away_win_probability: 0,
        prediction_confidence: 'unavailable',
        last_calculated: new Date(),
        form_period_used: 0
      };
      return of(unavailablePrediction);
    }

    // Simulate calculation delay to match real-world API behavior
    return of(null).pipe(
      delay(100),
      map(() => {
        const prediction = this.performCalculation(homeForm, awayForm);

        // Cache the result
        this.predictionCache.set(cacheKey, {
          prediction,
          cachedAt: new Date()
        });

        return prediction;
      })
    );
  }

  /**
   * Get predictions for multiple fixtures
   */
  calculatePredictionsForFixtures(fixtures: Fixture[]): Observable<PredictionResponse[]> {
    // Mock implementation - in real app, this would call backend API
    return of(fixtures).pipe(
      delay(200),
      map(fixtureList =>
        fixtureList.map(fixture => ({
          fixture_id: fixture.id,
          prediction: this.mockCalculateForFixture(fixture),
          calculation_time_ms: Math.floor(Math.random() * 100) + 50
        }))
      )
    );
  }

  /**
   * Trigger manual recalculation for a specific fixture
   */
  recalculatePrediction(request: PredictionRequest): Observable<PredictionResponse> {
    // Clear cache for this fixture
    const cacheKeys = Array.from(this.predictionCache.keys()).filter(key =>
      key.startsWith(request.fixture_id)
    );
    cacheKeys.forEach(key => this.predictionCache.delete(key));

    // Mock recalculation
    return of({
      fixture_id: request.fixture_id,
      prediction: this.mockCalculateForFixture({ id: request.fixture_id } as Fixture),
      calculation_time_ms: Math.floor(Math.random() * 200) + 100
    }).pipe(delay(150));
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.predictionCache.clear();
  }

  private performCalculation(homeForm: TeamForm, awayForm: TeamForm): MatchPrediction {
    // Calculate form scores
    const homeFormScore = this.calculateFormScore(homeForm, true);
    const awayFormScore = this.calculateFormScore(awayForm, false);

    // Calculate goal difference factors
    const homeAttackStrength = homeForm.goals_scored_avg;
    const homeDefenseStrength = 2.0 - homeForm.goals_conceded_avg; // Inverse for defense
    const awayAttackStrength = awayForm.goals_scored_avg;
    const awayDefenseStrength = 2.0 - awayForm.goals_conceded_avg;

    // Home advantage factor
    const homeAdvantage = 0.1;

    // Calculate raw probabilities
    let homeWinRaw = (homeFormScore + homeAdvantage + (homeAttackStrength / awayDefenseStrength)) / 3;
    let awayWinRaw = (awayFormScore + (awayAttackStrength / homeDefenseStrength)) / 3;

    // Normalize to ensure probabilities sum to ~1.0
    const totalRaw = homeWinRaw + awayWinRaw + 0.3; // Base draw probability
    const homeWin = Math.max(0.05, Math.min(0.85, homeWinRaw / totalRaw));
    const awayWin = Math.max(0.05, Math.min(0.85, awayWinRaw / totalRaw));
    const draw = Math.max(0.1, 1.0 - homeWin - awayWin);

    // Determine confidence level
    const maxProbability = Math.max(homeWin, draw, awayWin);
    const confidence = this.calculateConfidence(maxProbability, homeForm, awayForm);

    return {
      home_win_probability: Math.round(homeWin * 1000) / 1000,
      draw_probability: Math.round(draw * 1000) / 1000,
      away_win_probability: Math.round(awayWin * 1000) / 1000,
      prediction_confidence: confidence,
      last_calculated: new Date(),
      form_period_used: Math.min(homeForm.recent_matches.length, awayForm.recent_matches.length)
    };
  }

  private calculateFormScore(teamForm: TeamForm, isHome: boolean): number {
    let score = teamForm.points_per_game / 3; // Convert to 0-1 scale

    // Adjust for home/away record if available
    const record = isHome ? teamForm.home_record : teamForm.away_record;
    if (record) {
      const totalGames = record.wins + record.draws + record.losses;
      if (totalGames > 0) {
        const recordScore = (record.wins * 3 + record.draws) / (totalGames * 3);
        score = (score + recordScore) / 2; // Average with overall form
      }
    }

    // Goal difference factor
    const goalDiff = teamForm.goals_scored_avg - teamForm.goals_conceded_avg;
    const goalFactor = Math.max(0, Math.min(1, (goalDiff + 3) / 6)); // Normalize goal diff

    return (score + goalFactor) / 2;
  }

  private calculateConfidence(maxProbability: number, homeForm: TeamForm, awayForm: TeamForm): 'high' | 'medium' | 'low' {
    const formDataQuality = Math.min(homeForm.recent_matches.length, awayForm.recent_matches.length);

    if (formDataQuality >= 8 && maxProbability > 0.6) {
      return 'high';
    } else if (formDataQuality >= 5 && maxProbability > 0.45) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private mockCalculateForFixture(fixture: Fixture): MatchPrediction {
    // Mock calculation for demonstration
    const random = Math.random();
    let home = 0.3 + random * 0.4;
    let away = 0.2 + random * 0.4;
    let draw = 1.0 - home - away;

    // Normalize
    const total = home + draw + away;
    home = home / total;
    draw = draw / total;
    away = away / total;

    return {
      home_win_probability: Math.round(home * 1000) / 1000,
      draw_probability: Math.round(draw * 1000) / 1000,
      away_win_probability: Math.round(away * 1000) / 1000,
      prediction_confidence: home > 0.5 || away > 0.5 ? 'high' : draw > 0.4 ? 'medium' : 'low',
      last_calculated: new Date(),
      form_period_used: 7
    };
  }

  private isCacheValid(cachedAt: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
    return diffHours < this.CACHE_DURATION_HOURS;
  }
}