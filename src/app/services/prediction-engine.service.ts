import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { FormDataService } from './form-data.service';
import {
  MatchPrediction,
  TeamForm,
  FixtureWithPrediction,
  PredictionCalculationRequest,
  PredictionCalculationResponse
} from '../models/prediction.model';

@Injectable({
  providedIn: 'root'
})
export class PredictionEngineService {
  private predictionCache = new Map<string, MatchPrediction>();
  private cacheTimestamps = new Map<string, number>();
  private readonly CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(private formDataService: FormDataService) {}

  /**
   * Calculate prediction for a single fixture
   */
  calculatePrediction(request: PredictionCalculationRequest): Observable<PredictionCalculationResponse> {
    const startTime = Date.now();
    const cacheKey = `${request.homeTeamId}-${request.awayTeamId}`;

    // Check cache unless forced recalculation
    if (!request.recalculate && this.isPredictionCacheValid(cacheKey)) {
      const cachedPrediction = this.predictionCache.get(cacheKey);
      if (cachedPrediction) {
        return of({
          prediction: cachedPrediction,
          success: true,
          calculationTime: Date.now() - startTime
        });
      }
    }

    // Get form data for both teams
    return combineLatest([
      this.formDataService.getTeamForm(request.homeTeamId),
      this.formDataService.getTeamForm(request.awayTeamId)
    ]).pipe(
      map(([homeForm, awayForm]) => {
        if (!homeForm || !awayForm) {
          return {
            prediction: this.getDefaultPrediction(),
            success: false,
            message: 'Insufficient form data available',
            calculationTime: Date.now() - startTime
          };
        }

        const prediction = this.calculateMatchPrediction(homeForm, awayForm);
        this.cachePrediction(cacheKey, prediction);

        return {
          prediction,
          success: true,
          calculationTime: Date.now() - startTime
        };
      })
    );
  }

  /**
   * Calculate predictions for multiple fixtures
   */
  calculateMultiplePredictions(fixtures: { homeTeamId: string; awayTeamId: string; id: string }[]): Observable<Map<string, MatchPrediction>> {
    const teamIds = new Set<string>();
    fixtures.forEach(fixture => {
      teamIds.add(fixture.homeTeamId);
      teamIds.add(fixture.awayTeamId);
    });

    return this.formDataService.getMultipleTeamForms(Array.from(teamIds)).pipe(
      map(teamForms => {
        const predictions = new Map<string, MatchPrediction>();

        fixtures.forEach(fixture => {
          const homeForm = teamForms.get(fixture.homeTeamId);
          const awayForm = teamForms.get(fixture.awayTeamId);

          if (homeForm && awayForm) {
            const prediction = this.calculateMatchPrediction(homeForm, awayForm);
            predictions.set(fixture.id, prediction);
            this.cachePrediction(`${fixture.homeTeamId}-${fixture.awayTeamId}`, prediction);
          }
        });

        return predictions;
      })
    );
  }

  /**
   * Get cached prediction if available and valid
   */
  getCachedPrediction(homeTeamId: string, awayTeamId: string): MatchPrediction | null {
    const cacheKey = `${homeTeamId}-${awayTeamId}`;

    if (this.isPredictionCacheValid(cacheKey)) {
      return this.predictionCache.get(cacheKey) || null;
    }

    return null;
  }

  /**
   * Clear prediction cache
   */
  clearPredictionCache(): void {
    this.predictionCache.clear();
    this.cacheTimestamps.clear();
  }

  private calculateMatchPrediction(homeForm: TeamForm, awayForm: TeamForm): MatchPrediction {
    // Use home/away specific form ratings for more accurate predictions
    const homeAdvantage = 5; // 5 point home advantage
    const adjustedHomeRating = homeForm.homeFormRating + homeAdvantage;
    const adjustedAwayRating = awayForm.awayFormRating;

    // Calculate base probabilities using form difference
    const formDifference = adjustedHomeRating - adjustedAwayRating;
    const totalRating = adjustedHomeRating + adjustedAwayRating;

    // Base calculations using sigmoid-like function for realistic probabilities
    let homeWinProb = 0.33; // Base probability
    let drawProb = 0.34; // Base probability
    let awayWinProb = 0.33; // Base probability

    if (totalRating > 0) {
      // Adjust probabilities based on form difference
      const formFactor = Math.tanh(formDifference / 50); // Normalize between -1 and 1

      homeWinProb = 0.33 + (formFactor * 0.25); // Can range from 0.08 to 0.58
      awayWinProb = 0.33 - (formFactor * 0.25); // Can range from 0.08 to 0.58
      drawProb = 1 - homeWinProb - awayWinProb;

      // Ensure probabilities are within realistic bounds
      homeWinProb = Math.max(0.05, Math.min(0.80, homeWinProb));
      awayWinProb = Math.max(0.05, Math.min(0.80, awayWinProb));
      drawProb = Math.max(0.10, 1 - homeWinProb - awayWinProb);

      // Normalize to ensure they sum to 1
      const total = homeWinProb + drawProb + awayWinProb;
      homeWinProb /= total;
      drawProb /= total;
      awayWinProb /= total;
    }

    // Determine confidence based on form data quality and probability spread
    const confidence = this.calculateConfidence(homeForm, awayForm, homeWinProb, awayWinProb);

    // Determine number of matches used (minimum of both teams' recent matches)
    const formPeriodUsed = Math.min(
      homeForm.recentMatches.length,
      awayForm.recentMatches.length,
      10 // Maximum 10 matches
    );

    return {
      home_win_probability: Math.round(homeWinProb * 1000) / 1000, // Round to 3 decimal places
      draw_probability: Math.round(drawProb * 1000) / 1000,
      away_win_probability: Math.round(awayWinProb * 1000) / 1000,
      prediction_confidence: confidence,
      last_calculated: new Date().toISOString(),
      form_period_used: formPeriodUsed
    };
  }

  private calculateConfidence(
    homeForm: TeamForm,
    awayForm: TeamForm,
    homeWinProb: number,
    awayWinProb: number
  ): 'high' | 'medium' | 'low' {
    // Data quality factors
    const minMatches = Math.min(homeForm.recentMatches.length, awayForm.recentMatches.length);
    const dataQuality = minMatches >= 8 ? 'high' : minMatches >= 5 ? 'medium' : 'low';

    // Probability spread (how decisive the prediction is)
    const maxProb = Math.max(homeWinProb, awayWinProb);
    const probabilitySpread = maxProb > 0.6 ? 'high' : maxProb > 0.45 ? 'medium' : 'low';

    // Combine factors to determine overall confidence
    if (dataQuality === 'high' && probabilitySpread === 'high') return 'high';
    if (dataQuality === 'low' || probabilitySpread === 'low') return 'low';
    return 'medium';
  }

  private getDefaultPrediction(): MatchPrediction {
    return {
      home_win_probability: 0.33,
      draw_probability: 0.34,
      away_win_probability: 0.33,
      prediction_confidence: 'low',
      last_calculated: new Date().toISOString(),
      form_period_used: 0
    };
  }

  private isPredictionCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;

    return (Date.now() - timestamp) < this.CACHE_DURATION_MS;
  }

  private cachePrediction(cacheKey: string, prediction: MatchPrediction): void {
    this.predictionCache.set(cacheKey, prediction);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }
}