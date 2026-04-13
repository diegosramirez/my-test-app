import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Fixture, Prediction, TeamForm, FormMatch } from '../models/fixture.model';

@Injectable({
  providedIn: 'root'
})
export class PredictionEngineService {
  private readonly CACHE_DURATION_HOURS = 4;
  private cachedPredictions = new Map<number, { prediction: Prediction; timestamp: Date }>();

  constructor() {}

  calculatePrediction(fixture: Fixture, homeForm: TeamForm, awayForm: TeamForm): Prediction | null {
    // Check cache first
    const cachedResult = this.getCachedPrediction(fixture.id);
    if (cachedResult) {
      return cachedResult;
    }

    // Ensure sufficient data
    if (homeForm.matches.length < 3 || awayForm.matches.length < 3) {
      return null; // Insufficient data for prediction
    }

    const homeStrength = this.calculateTeamStrength(homeForm.matches);
    const awayStrength = this.calculateTeamStrength(awayForm.matches);

    // Apply home advantage (historically ~55% home win rate in Premier League)
    const homeAdvantage = 0.15;
    const adjustedHomeStrength = homeStrength + homeAdvantage;

    // Calculate raw probabilities
    const totalStrength = adjustedHomeStrength + awayStrength + 1; // +1 for draw baseline
    const homeWinProb = Math.max(0, Math.min(1, adjustedHomeStrength / totalStrength));
    const awayWinProb = Math.max(0, Math.min(1, awayStrength / totalStrength));
    const drawProb = Math.max(0, Math.min(1, 1 - homeWinProb - awayWinProb));

    // Normalize to ensure probabilities sum to 1
    const total = homeWinProb + drawProb + awayWinProb;
    const normalizedHomeWin = homeWinProb / total;
    const normalizedDraw = drawProb / total;
    const normalizedAwayWin = awayWinProb / total;

    // Calculate confidence based on form consistency and data quality
    const confidence = this.calculateConfidence(homeForm, awayForm);

    const prediction: Prediction = {
      home_win_probability: Math.round(normalizedHomeWin * 100) / 100,
      draw_probability: Math.round(normalizedDraw * 100) / 100,
      away_win_probability: Math.round(normalizedAwayWin * 100) / 100,
      prediction_confidence: confidence,
      last_calculated: new Date(),
      form_period_used: Math.min(homeForm.form_period, awayForm.form_period)
    };

    // Cache the result
    this.cachePrediction(fixture.id, prediction);

    return prediction;
  }

  private calculateTeamStrength(matches: FormMatch[]): number {
    let points = 0;
    let totalMatches = matches.length;

    // Weight recent matches more heavily (exponential decay)
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const weight = Math.pow(0.9, i); // Recent matches weighted higher

      if (match.result === 'win') {
        points += 3 * weight;
      } else if (match.result === 'draw') {
        points += 1 * weight;
      }
      // Loss = 0 points
    }

    // Average points per game, normalized
    const avgPoints = totalMatches > 0 ? points / totalMatches : 0;
    return avgPoints / 3; // Normalize to 0-1 scale
  }

  private calculateConfidence(homeForm: TeamForm, awayForm: TeamForm): string {
    const homeConsistency = this.calculateFormConsistency(homeForm.matches);
    const awayConsistency = this.calculateFormConsistency(awayForm.matches);
    const avgConsistency = (homeConsistency + awayConsistency) / 2;

    const dataQuality = Math.min(homeForm.form_period, awayForm.form_period);

    // High confidence: consistent form + sufficient data (8+ matches)
    if (avgConsistency > 0.7 && dataQuality >= 8) {
      return 'high';
    }
    // Low confidence: inconsistent form or insufficient data
    else if (avgConsistency < 0.4 || dataQuality < 5) {
      return 'low';
    }
    // Medium confidence: everything else
    else {
      return 'medium';
    }
  }

  private calculateFormConsistency(matches: FormMatch[]): number {
    if (matches.length <= 1) return 0;

    let consecutiveResults = 1;
    let maxConsecutive = 1;

    for (let i = 1; i < matches.length; i++) {
      if (matches[i].result === matches[i-1].result) {
        consecutiveResults++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, consecutiveResults);
        consecutiveResults = 1;
      }
    }
    maxConsecutive = Math.max(maxConsecutive, consecutiveResults);

    return maxConsecutive / matches.length;
  }

  private getCachedPrediction(fixtureId: number): Prediction | null {
    const cached = this.cachedPredictions.get(fixtureId);
    if (!cached) return null;

    const hoursSinceCalculated = (Date.now() - cached.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCalculated > this.CACHE_DURATION_HOURS) {
      this.cachedPredictions.delete(fixtureId);
      return null;
    }

    return cached.prediction;
  }

  private cachePrediction(fixtureId: number, prediction: Prediction): void {
    this.cachedPredictions.set(fixtureId, {
      prediction,
      timestamp: new Date()
    });
  }

  recalculateAllPredictions(): void {
    this.cachedPredictions.clear();
  }
}