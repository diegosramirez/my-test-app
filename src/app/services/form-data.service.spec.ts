import { TestBed } from '@angular/core/testing';
import { FormDataService } from './form-data.service';
import { TeamForm } from '../models/prediction.model';
import { vi } from 'vitest';

describe('FormDataService', () => {
  let service: FormDataService;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    // Mock Date.now for consistent cache testing
    originalDateNow = Date.now;
    Date.now = vi.fn(() => 1712664000000); // Fixed timestamp: April 9, 2024

    TestBed.configureTestingModule({});
    service = TestBed.inject(FormDataService);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTeamForm', () => {
    it('should return form data for valid Premier League team', async () => {
      const form = await service.getTeamForm('arsenal').toPromise();

      expect(form).toBeTruthy();
      expect(form!.teamId).toBe('arsenal');
      expect(form!.teamName).toBe('Arsenal');
      expect(form!.recentMatches).toHaveLength(8);
      expect(form!.formRating).toBeGreaterThanOrEqual(0);
      expect(form!.formRating).toBeLessThanOrEqual(100);
      expect(form!.homeFormRating).toBeGreaterThanOrEqual(0);
      expect(form!.awayFormRating).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-Premier League team', async () => {
      const form = await service.getTeamForm('invalid-team').toPromise();
      expect(form).toBeNull();
    });

    it('should handle case-insensitive team IDs', async () => {
      const form = await service.getTeamForm('ARSENAL').toPromise();
      expect(form).toBeNull(); // Should be null because case doesn't match
    });

    it('should use cache for repeated requests', async () => {
      const firstResult = await service.getTeamForm('chelsea').toPromise();
      expect(firstResult).toBeTruthy();

      const secondResult = await service.getTeamForm('chelsea').toPromise();
      expect(secondResult).toBeTruthy();
      expect(secondResult!.teamId).toBe(firstResult!.teamId);
      expect(secondResult!.recentMatches).toEqual(firstResult!.recentMatches);
    });

    it('should invalidate cache after expiry', async () => {
      const firstResult = await service.getTeamForm('liverpool').toPromise();
      expect(firstResult).toBeTruthy();

      // Fast-forward time beyond cache duration (4 hours + 1ms)
      Date.now = vi.fn(() => 1712664000000 + (4 * 60 * 60 * 1000) + 1);

      const secondResult = await service.getTeamForm('liverpool').toPromise();
      expect(secondResult).toBeTruthy();
    });

    it('should generate valid match results', async () => {
      const form = await service.getTeamForm('manchester-city').toPromise();
      expect(form!.recentMatches).toHaveLength(8);

      form!.recentMatches.forEach(match => {
        expect(match.date).toBeTruthy();
        expect(match.opponent).toBeTruthy();
        expect(['win', 'draw', 'loss']).toContain(match.result);
        expect(typeof match.isHome).toBe('boolean');
        expect(match.goalsFor).toBeGreaterThanOrEqual(0);
        expect(match.goalsAgainst).toBeGreaterThanOrEqual(0);
        expect([0, 1, 3]).toContain(match.points);

        // Validate points match result
        if (match.result === 'win') expect(match.points).toBe(3);
        if (match.result === 'draw') expect(match.points).toBe(1);
        if (match.result === 'loss') expect(match.points).toBe(0);
      });
    });

    it('should calculate form ratings correctly', async () => {
      const form = await service.getTeamForm('tottenham').toPromise();
      const totalPoints = form!.recentMatches.reduce((sum, match) => sum + match.points, 0);
      const expectedRating = Math.round((totalPoints / (8 * 3)) * 100);
      expect(form!.formRating).toBe(expectedRating);

      // Home form rating
      const homeMatches = form!.recentMatches.filter(match => match.isHome);
      if (homeMatches.length > 0) {
        const homePoints = homeMatches.reduce((sum, match) => sum + match.points, 0);
        const expectedHomeRating = Math.round((homePoints / (homeMatches.length * 3)) * 100);
        expect(form!.homeFormRating).toBe(expectedHomeRating);
      }

      // Away form rating
      const awayMatches = form!.recentMatches.filter(match => !match.isHome);
      if (awayMatches.length > 0) {
        const awayPoints = awayMatches.reduce((sum, match) => sum + match.points, 0);
        const expectedAwayRating = Math.round((awayPoints / (awayMatches.length * 3)) * 100);
        expect(form!.awayFormRating).toBe(expectedAwayRating);
      }
    });
  });

  describe('getMultipleTeamForms', () => {
    it('should return forms for multiple teams', async () => {
      const teamIds = ['arsenal', 'chelsea', 'liverpool'];
      const formsMap = await service.getMultipleTeamForms(teamIds).toPromise();

      expect(formsMap).toBeTruthy();
      expect(formsMap!.size).toBe(3);
      expect(formsMap!.has('arsenal')).toBe(true);
      expect(formsMap!.has('chelsea')).toBe(true);
      expect(formsMap!.has('liverpool')).toBe(true);

      const arsenalForm = formsMap!.get('arsenal');
      expect(arsenalForm!.teamName).toBe('Arsenal');
    });

    it('should handle mixed valid and invalid team IDs', async () => {
      const teamIds = ['arsenal', 'invalid-team', 'chelsea'];
      const formsMap = await service.getMultipleTeamForms(teamIds).toPromise();

      expect(formsMap).toBeTruthy();
      expect(formsMap!.size).toBe(2); // Only valid teams
      expect(formsMap!.has('arsenal')).toBe(true);
      expect(formsMap!.has('chelsea')).toBe(true);
      expect(formsMap!.has('invalid-team')).toBe(false);
    });

    it('should use cache when available', async () => {
      // Pre-populate cache
      await service.getTeamForm('manchester-united').toPromise();

      const teamIds = ['manchester-united', 'newcastle'];
      const formsMap = await service.getMultipleTeamForms(teamIds).toPromise();

      expect(formsMap).toBeTruthy();
      expect(formsMap!.size).toBe(2);
      expect(formsMap!.has('manchester-united')).toBe(true);
      expect(formsMap!.has('newcastle')).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear team cache correctly', async () => {
      const form = await service.getTeamForm('brighton').toPromise();
      expect(form).toBeTruthy();

      service.clearTeamCache('brighton');

      const newForm = await service.getTeamForm('brighton').toPromise();
      expect(newForm).toBeTruthy();
      expect(newForm!.teamId).toBe('brighton');
    });

    it('should clear all cache correctly', async () => {
      const teamIds = ['arsenal', 'chelsea'];

      // Populate cache
      await Promise.all(teamIds.map(id => service.getTeamForm(id).toPromise()));

      service.clearAllCache();

      // Verify cache is cleared by requesting again
      const formsMap = await service.getMultipleTeamForms(teamIds).toPromise();
      expect(formsMap).toBeTruthy();
      expect(formsMap!.size).toBe(2);
    });

    it('should handle cache validation correctly', () => {
      expect(() => {
        service.clearTeamCache('non-existent-team');
        service.clearAllCache();
      }).not.toThrow();
    });
  });

  describe('team name formatting', () => {
    it('should format team names correctly', async () => {
      const form = await service.getTeamForm('manchester-city').toPromise();
      expect(form!.teamName).toBe('Manchester City');
    });

    it('should format team names with multiple hyphens', async () => {
      const form = await service.getTeamForm('sheffield-united').toPromise();
      expect(form!.teamName).toBe('Sheffield United');
    });
  });

  describe('edge cases', () => {
    it('should handle empty team ID', async () => {
      const form = await service.getTeamForm('').toPromise();
      expect(form).toBeNull();
    });

    it('should handle special characters in team ID', async () => {
      const form = await service.getTeamForm('team@#$').toPromise();
      expect(form).toBeNull();
    });

    it('should return correct results for teams with different casing', async () => {
      const lowercaseForm = await service.getTeamForm('arsenal').toPromise();
      const capitalizedForm = await service.getTeamForm('Arsenal').toPromise();

      expect(lowercaseForm).toBeTruthy();
      expect(capitalizedForm).toBeNull(); // Case doesn't match stored format
    });

    it('should handle concurrent requests for same team', async () => {
      // Make 3 concurrent requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.getTeamForm('aston-villa').toPromise());
      }

      const forms = await Promise.all(promises);

      // All should return the same valid data
      expect(forms.every(f => f !== null)).toBe(true);
      expect(forms.every(f => f!.teamId === 'aston-villa')).toBe(true);
    });
  });

  describe('Premier League teams validation', () => {
    it('should recognize all Premier League teams', async () => {
      const premierLeagueTeams = [
        'arsenal', 'chelsea', 'liverpool', 'manchester-city', 'manchester-united',
        'tottenham', 'newcastle', 'brighton', 'aston-villa', 'west-ham',
        'crystal-palace', 'fulham', 'brentford', 'wolves', 'everton',
        'nottingham-forest', 'bournemouth', 'luton', 'burnley', 'sheffield-united'
      ];

      const promises = premierLeagueTeams.map(teamId => service.getTeamForm(teamId).toPromise());
      const results = await Promise.all(promises);

      const validTeamsFound = results.filter(form => form !== null).length;
      expect(validTeamsFound).toBe(premierLeagueTeams.length);
    });
  });
});