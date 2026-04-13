import { Injectable } from '@angular/core';
import { Observable, of, delay, forkJoin, map, switchMap } from 'rxjs';
import { Fixture, Team } from '../models/fixture.model';
import { FormDataService } from './form-data.service';
import { PredictionEngineService } from './prediction-engine.service';

@Injectable({
  providedIn: 'root'
})
export class FixtureService {
  constructor(
    private formDataService: FormDataService,
    private predictionEngine: PredictionEngineService
  ) {}

  getUpcomingFixturesWithPredictions(): Observable<Fixture[]> {
    // First get upcoming fixtures
    return this.getUpcomingFixtures().pipe(
      // Then add predictions to each fixture
      switchMap(fixtures => {
        const fixturesWithPredictions = fixtures.map(fixture => {
          if (fixture.status !== 'scheduled') {
            return of(fixture); // No predictions for non-scheduled matches
          }

          // Get form data for both teams
          const homeForm$ = this.formDataService.getTeamForm(fixture.home_team.id, 10);
          const awayForm$ = this.formDataService.getTeamForm(fixture.away_team.id, 10);

          return forkJoin([homeForm$, awayForm$]).pipe(
            map(([homeForm, awayForm]) => {
              const prediction = this.predictionEngine.calculatePrediction(fixture, homeForm, awayForm);
              return { ...fixture, prediction: prediction || undefined };
            })
          );
        });

        // Convert array of observables to single observable
        return forkJoin(fixturesWithPredictions);
      }),
      delay(Math.random() * 300 + 100) // Simulate network delay
    );
  }

  getUpcomingFixtures(): Observable<Fixture[]> {
    const mockFixtures = this.generateMockUpcomingFixtures();
    return of(mockFixtures).pipe(delay(200));
  }

  triggerPredictionRecalculation(): Observable<void> {
    this.predictionEngine.recalculateAllPredictions();
    return of(void 0).pipe(delay(100));
  }

  private generateMockUpcomingFixtures(): Fixture[] {
    const teams: Team[] = [
      { id: 1, name: 'Arsenal' },
      { id: 2, name: 'Liverpool' },
      { id: 3, name: 'Manchester City' },
      { id: 4, name: 'Chelsea' },
      { id: 5, name: 'Manchester United' },
      { id: 6, name: 'Tottenham' },
      { id: 7, name: 'Newcastle' },
      { id: 8, name: 'Brighton' }
    ];

    const fixtures: Fixture[] = [];
    const today = new Date();

    // Generate 8 upcoming fixtures over the next 4 weeks
    for (let i = 0; i < 8; i++) {
      const fixtureDate = new Date(today);
      fixtureDate.setDate(today.getDate() + (i * 3) + Math.random() * 2); // Every 3-5 days

      // Random team pairing (avoiding duplicates)
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const homeTeam = shuffledTeams[i % teams.length];
      const awayTeam = shuffledTeams[(i + 1) % teams.length];

      // Occasionally add postponed/cancelled matches for testing
      let status: 'scheduled' | 'postponed' | 'cancelled' = 'scheduled';
      if (Math.random() < 0.1) { // 10% chance of postponed
        status = 'postponed';
      } else if (Math.random() < 0.05) { // 5% chance of cancelled
        status = 'cancelled';
      }

      fixtures.push({
        id: i + 1,
        home_team: homeTeam,
        away_team: awayTeam,
        date: fixtureDate,
        venue: `${homeTeam.name} Stadium`,
        status
      });
    }

    return fixtures.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}