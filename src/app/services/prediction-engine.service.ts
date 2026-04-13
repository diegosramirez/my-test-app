import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, BehaviorSubject, of } from 'rxjs';
import { FormDataService } from './form-data.service';
import { Fixture, TeamForm, PredictionResult } from '../models/fixture.interface';

interface CachedPrediction {
  prediction: PredictionResult;
  expiresAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PredictionEngineService {
  private readonly CACHE_DURATION_HOURS = 4;
  private readonly MIN_MATCHES_REQUIRED = 5;
  private readonly DEFAULT_FORM_PERIOD = 10;

  private predictionCache = new Map<number, CachedPrediction>();
  private lastRefresh = new BehaviorSubject<Date>(new Date());

  constructor(private formDataService: FormDataService) {}

  calculatePredictions(fixtures: Fixture[]): Observable<Fixture[]> {
    const calculationPromises = fixtures.map(fixture => {
      // Check cache first
      const cached = this.getCachedPrediction(fixture.id);
      if (cached) {
        return of(this.applyPredictionToFixture(fixture, cached));
      }

      // Calculate new prediction
      return this.calculateSinglePrediction(fixture);
    });

    return forkJoin(calculationPromises);
  }

  calculateSinglePrediction(fixture: Fixture): Observable<Fixture> {
    if (fixture.status !== 'scheduled') {
      return of(fixture);
    }

    return forkJoin({
      homeForm: this.formDataService.getTeamForm(fixture.homeTeam.id, this.DEFAULT_FORM_PERIOD),
      awayForm: this.formDataService.getTeamForm(fixture.awayTeam.id, this.DEFAULT_FORM_PERIOD)
    }).pipe(
      map(({ homeForm, awayForm }) => {
        // Check if we have sufficient data
        const minMatches = Math.min(homeForm.matches.length, awayForm.matches.length);
        if (minMatches < this.MIN_MATCHES_REQUIRED) {
          return fixture; // Return without predictions
        }

        const prediction = this.computePrediction(homeForm, awayForm, fixture.id, minMatches);
        this.cachePrediction(fixture.id, prediction);

        return this.applyPredictionToFixture(fixture, prediction);
      })
    );
  }

  private computePrediction(homeForm: TeamForm, awayForm: TeamForm, fixtureId: number, formPeriodUsed: number): PredictionResult {
    // Simple algorithm based on recent form
    const homeFormScore = this.calculateFormScore(homeForm);
    const awayFormScore = this.calculateFormScore(awayForm);

    // Home advantage factor
    const homeAdvantage = 0.1;
    const adjustedHomeScore = homeFormScore + homeAdvantage;

    // Calculate base probabilities
    const totalScore = adjustedHomeScore + awayFormScore;
    let homeWinProb = adjustedHomeScore / totalScore;
    let awayWinProb = awayFormScore / totalScore;

    // Add draw probability (inversely related to the gap between teams)
    const formGap = Math.abs(homeFormScore - awayFormScore);
    const drawProbBase = Math.max(0.15, 0.35 - (formGap * 0.5));

    // Normalize probabilities to sum to 1.0
    const remainingProb = 1.0 - drawProbBase;
    homeWinProb = homeWinProb * remainingProb;
    awayWinProb = awayWinProb * remainingProb;

    // Determine confidence level
    const maxProb = Math.max(homeWinProb, drawProbBase, awayWinProb);
    let confidence: string;
    if (maxProb > 0.6) confidence = 'high';
    else if (maxProb > 0.45) confidence = 'medium';
    else confidence = 'low';

    return {
      fixtureId,
      homeWinProbability: Math.round(homeWinProb * 1000) / 1000, // 3 decimal places
      drawProbability: Math.round(drawProbBase * 1000) / 1000,
      awayWinProbability: Math.round(awayWinProb * 1000) / 1000,
      confidence,
      formPeriodUsed,
      calculatedAt: new Date()
    };
  }

  private calculateFormScore(teamForm: TeamForm): number {
    // Weighted scoring: recent matches matter more
    let totalScore = 0;
    let totalWeight = 0;

    teamForm.matches.forEach((match, index) => {
      const weight = Math.pow(0.9, index); // Recent matches weighted more heavily
      let matchScore = 0;

      if (match.result === 'win') matchScore = 1.0;
      else if (match.result === 'draw') matchScore = 0.5;
      else matchScore = 0.0;

      // Goal difference factor
      const isHome = match.homeTeam.id === teamForm.teamId;
      const goalDiff = isHome ? (match.homeScore - match.awayScore) : (match.awayScore - match.homeScore);
      const goalFactor = Math.min(0.2, goalDiff * 0.05); // Max 0.2 bonus
      matchScore += goalFactor;

      totalScore += matchScore * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private getCachedPrediction(fixtureId: number): PredictionResult | null {
    const cached = this.predictionCache.get(fixtureId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.prediction;
    }
    this.predictionCache.delete(fixtureId);
    return null;
  }

  private cachePrediction(fixtureId: number, prediction: PredictionResult): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS);

    this.predictionCache.set(fixtureId, {
      prediction,
      expiresAt
    });
  }

  private applyPredictionToFixture(fixture: Fixture, prediction: PredictionResult): Fixture {
    return {
      ...fixture,
      homeWinProbability: prediction.homeWinProbability,
      drawProbability: prediction.drawProbability,
      awayWinProbability: prediction.awayWinProbability,
      predictionConfidence: prediction.confidence,
      lastCalculated: prediction.calculatedAt,
      formPeriodUsed: prediction.formPeriodUsed
    };
  }

  // Manual recalculation capability
  refreshPredictions(fixtures: Fixture[]): Observable<Fixture[]> {
    // Clear cache for these fixtures
    fixtures.forEach(fixture => this.predictionCache.delete(fixture.id));
    this.lastRefresh.next(new Date());

    return this.calculatePredictions(fixtures);
  }

  getLastRefreshTime(): Observable<Date> {
    return this.lastRefresh.asObservable();
  }

  clearCache(): void {
    this.predictionCache.clear();
  }
}