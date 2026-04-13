import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PredictionEngineService } from './prediction-engine.service';
import { Fixture, TeamForm, FormMatch } from '../models/fixture.model';

describe('PredictionEngineService', () => {
  let service: PredictionEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictionEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculatePrediction', () => {
    it('should return null for insufficient home team data', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      const homeForm: TeamForm = {
        team_id: 1,
        matches: [], // No matches
        form_period: 0,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(5),
        form_period: 5,
        last_updated: new Date()
      };

      const result = service.calculatePrediction(fixture, homeForm, awayForm);
      expect(result).toBeNull();
    });

    it('should return null for insufficient away team data', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      const homeForm: TeamForm = {
        team_id: 1,
        matches: createMockMatches(5),
        form_period: 5,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(2), // Insufficient
        form_period: 2,
        last_updated: new Date()
      };

      const result = service.calculatePrediction(fixture, homeForm, awayForm);
      expect(result).toBeNull();
    });

    it('should calculate valid prediction with sufficient data', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      const homeForm: TeamForm = {
        team_id: 1,
        matches: createMockMatches(8, 'strong'), // Strong form
        form_period: 8,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(7, 'weak'), // Weak form
        form_period: 7,
        last_updated: new Date()
      };

      const result = service.calculatePrediction(fixture, homeForm, awayForm);

      expect(result).not.toBeNull();
      expect(result!.home_win_probability).toBeGreaterThan(0);
      expect(result!.draw_probability).toBeGreaterThan(0);
      expect(result!.away_win_probability).toBeGreaterThan(0);
      expect(result!.home_win_probability + result!.draw_probability + result!.away_win_probability).toBeCloseTo(1, 2);
      expect(['high', 'medium', 'low']).toContain(result!.prediction_confidence);
      expect(result!.form_period_used).toBe(7); // Minimum of the two
    });

    it('should favor home team with home advantage', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      // Equal form for both teams
      const homeForm: TeamForm = {
        team_id: 1,
        matches: createMockMatches(5, 'average'),
        form_period: 5,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(5, 'average'),
        form_period: 5,
        last_updated: new Date()
      };

      const result = service.calculatePrediction(fixture, homeForm, awayForm);

      expect(result).not.toBeNull();
      // Home team should have higher probability due to home advantage
      expect(result!.home_win_probability).toBeGreaterThan(result!.away_win_probability);
    });

    it('should use cached prediction when available', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      const homeForm: TeamForm = {
        team_id: 1,
        matches: createMockMatches(5, 'strong'),
        form_period: 5,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(5, 'weak'),
        form_period: 5,
        last_updated: new Date()
      };

      // First calculation
      const firstResult = service.calculatePrediction(fixture, homeForm, awayForm);
      // Second calculation should return cached result
      const secondResult = service.calculatePrediction(fixture, homeForm, awayForm);

      expect(firstResult).toEqual(secondResult);
    });
  });

  describe('recalculateAllPredictions', () => {
    it('should clear cache when called', () => {
      const fixture: Fixture = {
        id: 1,
        home_team: { id: 1, name: 'Arsenal' },
        away_team: { id: 2, name: 'Liverpool' },
        date: new Date(),
        status: 'scheduled'
      };

      const homeForm: TeamForm = {
        team_id: 1,
        matches: createMockMatches(5, 'strong'),
        form_period: 5,
        last_updated: new Date()
      };

      const awayForm: TeamForm = {
        team_id: 2,
        matches: createMockMatches(5, 'weak'),
        form_period: 5,
        last_updated: new Date()
      };

      // Calculate and cache prediction
      const firstResult = service.calculatePrediction(fixture, homeForm, awayForm);

      // Clear cache
      service.recalculateAllPredictions();

      // Calculate again - should be fresh calculation
      const secondResult = service.calculatePrediction(fixture, homeForm, awayForm);

      expect(firstResult).not.toBeNull();
      expect(secondResult).not.toBeNull();
      // Results might be slightly different due to fresh calculation
      expect(firstResult!.home_win_probability).toBeCloseTo(secondResult!.home_win_probability, 1);
    });
  });

  // Helper function to create mock form matches
  function createMockMatches(count: number, quality: 'strong' | 'average' | 'weak' = 'average'): FormMatch[] {
    const matches: FormMatch[] = [];
    const baseDate = new Date();

    for (let i = 0; i < count; i++) {
      const matchDate = new Date(baseDate);
      matchDate.setDate(baseDate.getDate() - (i * 7));

      let result: 'win' | 'draw' | 'loss';

      // Set result distribution based on quality
      const rand = Math.random();
      if (quality === 'strong') {
        result = rand < 0.7 ? 'win' : (rand < 0.9 ? 'draw' : 'loss');
      } else if (quality === 'weak') {
        result = rand < 0.2 ? 'win' : (rand < 0.4 ? 'draw' : 'loss');
      } else {
        result = rand < 0.4 ? 'win' : (rand < 0.7 ? 'draw' : 'loss');
      }

      matches.push({
        id: i + 1,
        date: matchDate,
        opponent: { id: 10 + i, name: `Team ${i}` },
        home_away: i % 2 === 0 ? 'home' : 'away',
        result,
        goals_for: result === 'win' ? 2 : (result === 'draw' ? 1 : 0),
        goals_against: result === 'loss' ? 2 : (result === 'draw' ? 1 : 0)
      });
    }

    return matches;
  }
});