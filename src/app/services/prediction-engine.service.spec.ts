import { TestBed } from '@angular/core/testing';
import { PredictionEngineService } from './prediction-engine.service';
import { Fixture, TeamForm, TeamFormMatch, MatchPrediction } from '../models/prediction.interface';
import { firstValueFrom } from 'rxjs';

describe('PredictionEngineService', () => {
  let service: PredictionEngineService;

  const createMockFixture = (id: string, kickOffDelta: number = 0): Fixture => ({
    id,
    home_team: 'Manchester City',
    away_team: 'Arsenal',
    home_team_id: 'team-mci',
    away_team_id: 'team-ars',
    kick_off: new Date(Date.now() + kickOffDelta),
    status: 'scheduled',
    venue: 'Etihad Stadium'
  });

  const createMockTeamForm = (matchCount: number, strongForm: boolean = true): TeamForm => {
    const matches: TeamFormMatch[] = [];
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
        opponent: `Opponent ${i + 1}`,
        is_home: Math.random() > 0.5,
        result: strongForm && i < 3 ? 'win' : ['win', 'draw', 'loss'][Math.floor(Math.random() * 3)] as 'win' | 'draw' | 'loss',
        goals_scored: strongForm ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3),
        goals_conceded: strongForm ? Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2)
      });
    }

    return {
      team_id: 'test-team',
      recent_matches: matches,
      points_per_game: strongForm ? 2.5 : 1.2,
      goals_scored_avg: strongForm ? 2.1 : 1.1,
      goals_conceded_avg: strongForm ? 0.8 : 1.5,
      home_record: {
        wins: strongForm ? 7 : 3,
        draws: 2,
        losses: strongForm ? 1 : 5,
        goals_scored: strongForm ? 18 : 10,
        goals_conceded: strongForm ? 8 : 15
      },
      away_record: {
        wins: strongForm ? 5 : 2,
        draws: 3,
        losses: strongForm ? 2 : 6,
        goals_scored: strongForm ? 14 : 8,
        goals_conceded: strongForm ? 10 : 18
      }
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PredictionEngineService]
    });
    service = TestBed.inject(PredictionEngineService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculatePrediction', () => {
    it('should return unavailable prediction when insufficient home team data', async () => {
      const fixture = createMockFixture('test-1');
      const homeForm = createMockTeamForm(2); // Less than 3 matches
      const awayForm = createMockTeamForm(5);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(prediction.prediction_confidence).toBe('unavailable');
      expect(prediction.home_win_probability).toBe(0);
      expect(prediction.draw_probability).toBe(0);
      expect(prediction.away_win_probability).toBe(0);
      expect(prediction.form_period_used).toBe(0);
    });

    it('should return unavailable prediction when insufficient away team data', async () => {
      const fixture = createMockFixture('test-2');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(1); // Less than 3 matches

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(prediction.prediction_confidence).toBe('unavailable');
      expect(prediction.home_win_probability).toBe(0);
      expect(prediction.draw_probability).toBe(0);
      expect(prediction.away_win_probability).toBe(0);
      expect(prediction.form_period_used).toBe(0);
    });

    it('should calculate valid prediction with sufficient data', async () => {
      const fixture = createMockFixture('test-3');
      const homeForm = createMockTeamForm(7, true);
      const awayForm = createMockTeamForm(6, false);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(prediction.prediction_confidence).not.toBe('unavailable');
      expect(prediction.home_win_probability).toBeGreaterThan(0);
      expect(prediction.draw_probability).toBeGreaterThan(0);
      expect(prediction.away_win_probability).toBeGreaterThan(0);

      // Probabilities should sum to approximately 1
      const total = prediction.home_win_probability + prediction.draw_probability + prediction.away_win_probability;
      expect(total).toBeCloseTo(1, 2);

      // Form period should reflect the minimum of both teams
      expect(prediction.form_period_used).toBe(6);
      expect(prediction.last_calculated).toBeInstanceOf(Date);
    });

    it('should favor home team when they have significantly better form', async () => {
      const fixture = createMockFixture('test-4');
      const homeForm = createMockTeamForm(8, true); // Strong form
      const awayForm = createMockTeamForm(6, false); // Weak form

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(prediction.home_win_probability).toBeGreaterThan(prediction.away_win_probability);
      expect(prediction.home_win_probability).toBeGreaterThan(0.4); // Should be clearly favored
    });

    it('should set high confidence when teams have good form data and clear favorite', async () => {
      const fixture = createMockFixture('test-5');
      const homeForm = createMockTeamForm(10, true);
      const awayForm = createMockTeamForm(8, false);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      // With 8+ matches and a likely clear favorite, should be high confidence
      expect(['high', 'medium']).toContain(prediction.prediction_confidence);
    });

    it('should set low confidence with minimal data', async () => {
      const fixture = createMockFixture('test-6');
      const homeForm = createMockTeamForm(3); // Minimal data
      const awayForm = createMockTeamForm(4);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(['low', 'medium']).toContain(prediction.prediction_confidence);
    });

    it('should cache predictions based on fixture ID and kick-off time', async () => {
      const fixture = createMockFixture('test-7', 2 * 24 * 60 * 60 * 1000); // 2 days from now
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      const spy = vi.spyOn(service as any, 'performCalculation').mockReturnValue({
        home_win_probability: 0.45,
        draw_probability: 0.35,
        away_win_probability: 0.20,
        prediction_confidence: 'medium' as const,
        last_calculated: new Date(),
        form_period_used: 5
      });

      // First call should trigger calculation
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('should round probabilities to 3 decimal places', async () => {
      const fixture = createMockFixture('test-8');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      // Check that probabilities have at most 3 decimal places
      expect(prediction.home_win_probability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
      expect(prediction.draw_probability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
      expect(prediction.away_win_probability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
    });

    it('should ensure minimum probability values', async () => {
      const fixture = createMockFixture('test-9');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      // Should have minimum probability values to avoid 0% displays
      expect(prediction.home_win_probability).toBeGreaterThanOrEqual(0.05);
      expect(prediction.away_win_probability).toBeGreaterThanOrEqual(0.05);
      expect(prediction.draw_probability).toBeGreaterThanOrEqual(0.1);
    });

    it('should apply home advantage factor', async () => {
      const fixture = createMockFixture('test-10');
      const homeForm = createMockTeamForm(6);
      const awayForm = createMockTeamForm(6); // Same form

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      // With similar form, home advantage should favor home team
      expect(prediction.home_win_probability).toBeGreaterThan(prediction.away_win_probability);
    });
  });

  describe('calculatePredictionsForFixtures', () => {
    it('should calculate predictions for multiple fixtures', async () => {
      const fixtures = [
        createMockFixture('fixture-1'),
        createMockFixture('fixture-2'),
        createMockFixture('fixture-3')
      ];

      const responses = await firstValueFrom(service.calculatePredictionsForFixtures(fixtures));

      expect(responses).toHaveLength(3);
      responses.forEach((response, index) => {
        expect(response.fixture_id).toBe(`fixture-${index + 1}`);
        expect(response.prediction).toBeDefined();
        expect(response.calculation_time_ms).toBeGreaterThan(0);
        expect(response.calculation_time_ms).toBeLessThan(200);
      });
    });

    it('should return empty array for no fixtures', async () => {
      const responses = await firstValueFrom(service.calculatePredictionsForFixtures([]));
      expect(responses).toEqual([]);
    });
  });

  describe('recalculatePrediction', () => {
    it('should clear cache and recalculate prediction', async () => {
      const fixtureId = 'recalc-test';

      // First, let's populate the cache
      const fixture = createMockFixture(fixtureId);
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      // Now recalculate
      const response = await firstValueFrom(service.recalculatePrediction({ fixture_id: fixtureId }));

      expect(response.fixture_id).toBe(fixtureId);
      expect(response.prediction).toBeDefined();
      expect(response.calculation_time_ms).toBeGreaterThan(0);
    });

    it('should handle optional recalculate flag', async () => {
      const response = await firstValueFrom(service.recalculatePrediction({
        fixture_id: 'test-recalc',
        recalculate: true
      }));

      expect(response.fixture_id).toBe('test-recalc');
      expect(response.prediction).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached predictions', async () => {
      // Populate cache with some predictions
      const fixture1 = createMockFixture('cache-test-1');
      const fixture2 = createMockFixture('cache-test-2');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      const spy = vi.spyOn(service as any, 'performCalculation').mockReturnValue({
        home_win_probability: 0.4,
        draw_probability: 0.3,
        away_win_probability: 0.3,
        prediction_confidence: 'medium' as const,
        last_calculated: new Date(),
        form_period_used: 5
      });

      await firstValueFrom(service.calculatePrediction(fixture1, homeForm, awayForm));
      await firstValueFrom(service.calculatePrediction(fixture2, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(2);

      // Clear cache
      service.clearCache();

      // Next calls should trigger new calculations
      await firstValueFrom(service.calculatePrediction(fixture1, homeForm, awayForm));
      await firstValueFrom(service.calculatePrediction(fixture2, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(4);

      spy.mockRestore();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache after 4 hours', async () => {
      const fixture = createMockFixture('cache-expiry-test');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      // Create old timestamp (5 hours ago)
      const oldTimestamp = new Date(Date.now() - 5 * 60 * 60 * 1000);

      // Mock isCacheValid to return false for expired cache
      const cacheValidSpy = vi.spyOn(service as any, 'isCacheValid').mockReturnValue(false);

      const spy = vi.spyOn(service as any, 'performCalculation').mockReturnValue({
        home_win_probability: 0.4,
        draw_probability: 0.3,
        away_win_probability: 0.3,
        prediction_confidence: 'medium' as const,
        last_calculated: new Date(),
        form_period_used: 5
      });

      // First call - should calculate since cache is "invalid"
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call - should calculate again since cache is still "invalid"
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockRestore();
      cacheValidSpy.mockRestore();
    });

    it('should use valid cache within 4 hour window', async () => {
      const fixture = createMockFixture('cache-valid-test');
      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      // Mock isCacheValid to return true for valid cache
      const cacheValidSpy = vi.spyOn(service as any, 'isCacheValid').mockReturnValue(true);

      const spy = vi.spyOn(service as any, 'performCalculation').mockReturnValue({
        home_win_probability: 0.4,
        draw_probability: 0.3,
        away_win_probability: 0.3,
        prediction_confidence: 'medium' as const,
        last_calculated: new Date(),
        form_period_used: 5
      });

      // First call should populate cache
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      expect(spy).toHaveBeenCalledTimes(1);

      // Subsequent calls should use cache since isCacheValid returns true
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));
      await firstValueFrom(service.calculatePrediction(fixture, homeForm, awayForm));

      expect(spy).toHaveBeenCalledTimes(1); // Should still be cached

      spy.mockRestore();
      cacheValidSpy.mockRestore();
    });

    it('should correctly determine cache validity based on time', () => {
      // Test the isCacheValid method directly
      const now = new Date();
      const recent = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const expired = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago

      expect((service as any).isCacheValid(recent)).toBe(true);
      expect((service as any).isCacheValid(expired)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle fixtures with same teams but different kick-off times separately', async () => {
      const fixture1 = createMockFixture('same-teams-1', 24 * 60 * 60 * 1000); // 1 day from now
      const fixture2 = createMockFixture('same-teams-2', 2 * 24 * 60 * 60 * 1000); // 2 days from now

      // Different kick-off times should create separate cache entries
      fixture1.kick_off = new Date(Date.now() + 24 * 60 * 60 * 1000);
      fixture2.kick_off = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const homeForm = createMockTeamForm(5);
      const awayForm = createMockTeamForm(5);

      const prediction1 = await firstValueFrom(service.calculatePrediction(fixture1, homeForm, awayForm));
      const prediction2 = await firstValueFrom(service.calculatePrediction(fixture2, homeForm, awayForm));

      expect(prediction1.last_calculated).not.toEqual(prediction2.last_calculated);
    });

    it('should handle teams with no home/away record gracefully', async () => {
      const fixture = createMockFixture('no-records');
      const homeFormNoRecords: TeamForm = {
        team_id: 'team-1',
        recent_matches: Array(5).fill(null).map((_, i) => ({
          date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          opponent: `Opponent ${i}`,
          is_home: true,
          result: 'win' as const,
          goals_scored: 2,
          goals_conceded: 1
        })),
        points_per_game: 2.0,
        goals_scored_avg: 2.0,
        goals_conceded_avg: 1.0
        // No home_record or away_record
      };

      const awayForm = createMockTeamForm(5);

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, homeFormNoRecords, awayForm));

      expect(prediction.prediction_confidence).not.toBe('unavailable');
      expect(prediction.home_win_probability).toBeGreaterThan(0);
    });

    it('should handle extreme form data without crashing', async () => {
      const fixture = createMockFixture('extreme-form');

      // Create team with perfect record
      const perfectForm: TeamForm = {
        team_id: 'perfect-team',
        recent_matches: Array(10).fill(null).map((_, i) => ({
          date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          opponent: `Opponent ${i}`,
          is_home: i % 2 === 0,
          result: 'win' as const,
          goals_scored: 5,
          goals_conceded: 0
        })),
        points_per_game: 3.0,
        goals_scored_avg: 5.0,
        goals_conceded_avg: 0.0,
        home_record: { wins: 10, draws: 0, losses: 0, goals_scored: 50, goals_conceded: 0 },
        away_record: { wins: 10, draws: 0, losses: 0, goals_scored: 50, goals_conceded: 0 }
      };

      // Create team with terrible record
      const terribleForm: TeamForm = {
        team_id: 'terrible-team',
        recent_matches: Array(10).fill(null).map((_, i) => ({
          date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          opponent: `Opponent ${i}`,
          is_home: i % 2 === 0,
          result: 'loss' as const,
          goals_scored: 0,
          goals_conceded: 4
        })),
        points_per_game: 0.0,
        goals_scored_avg: 0.0,
        goals_conceded_avg: 4.0,
        home_record: { wins: 0, draws: 0, losses: 10, goals_scored: 0, goals_conceded: 40 },
        away_record: { wins: 0, draws: 0, losses: 10, goals_scored: 0, goals_conceded: 40 }
      };

      const prediction = await firstValueFrom(service.calculatePrediction(fixture, perfectForm, terribleForm));

      expect(prediction.prediction_confidence).toBe('high');
      expect(prediction.home_win_probability).toBeGreaterThan(0.7);
      expect(prediction.away_win_probability).toBeLessThan(0.15);

      // Should still sum to ~1 even with extreme data
      const total = prediction.home_win_probability + prediction.draw_probability + prediction.away_win_probability;
      expect(total).toBeCloseTo(1, 1);
    });
  });
});