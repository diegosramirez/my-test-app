import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { TeamForm, MatchResult } from '../models/prediction.model';

@Injectable({
  providedIn: 'root'
})
export class FormDataService {
  private teamFormsCache = new Map<string, TeamForm>();
  private cacheTimestamps = new Map<string, number>();
  private readonly CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get team form data for a specific team
   */
  getTeamForm(teamId: string): Observable<TeamForm | null> {
    // Check cache first
    if (this.isCacheValid(teamId)) {
      const cachedForm = this.teamFormsCache.get(teamId);
      return of(cachedForm || null);
    }

    // In a real app, this would fetch from API
    // For now, return mock data or null if no data available
    const mockForm = this.generateMockTeamForm(teamId);
    if (mockForm) {
      this.cacheTeamForm(teamId, mockForm);
      return of(mockForm);
    }

    return of(null);
  }

  /**
   * Get form data for multiple teams
   */
  getMultipleTeamForms(teamIds: string[]): Observable<Map<string, TeamForm>> {
    const formsMap = new Map<string, TeamForm>();

    teamIds.forEach(teamId => {
      if (this.isCacheValid(teamId)) {
        const cachedForm = this.teamFormsCache.get(teamId);
        if (cachedForm) {
          formsMap.set(teamId, cachedForm);
        }
      } else {
        const mockForm = this.generateMockTeamForm(teamId);
        if (mockForm) {
          this.cacheTeamForm(teamId, mockForm);
          formsMap.set(teamId, mockForm);
        }
      }
    });

    return of(formsMap);
  }

  /**
   * Clear cache for a specific team
   */
  clearTeamCache(teamId: string): void {
    this.teamFormsCache.delete(teamId);
    this.cacheTimestamps.delete(teamId);
  }

  /**
   * Clear all cached form data
   */
  clearAllCache(): void {
    this.teamFormsCache.clear();
    this.cacheTimestamps.clear();
  }

  private isCacheValid(teamId: string): boolean {
    const timestamp = this.cacheTimestamps.get(teamId);
    if (!timestamp) return false;

    return (Date.now() - timestamp) < this.CACHE_DURATION_MS;
  }

  private cacheTeamForm(teamId: string, form: TeamForm): void {
    this.teamFormsCache.set(teamId, form);
    this.cacheTimestamps.set(teamId, Date.now());
  }

  private generateMockTeamForm(teamId: string): TeamForm | null {
    // Premier League teams mock data
    const premierLeagueTeams = [
      'arsenal', 'chelsea', 'liverpool', 'manchester-city', 'manchester-united',
      'tottenham', 'newcastle', 'brighton', 'aston-villa', 'west-ham',
      'crystal-palace', 'fulham', 'brentford', 'wolves', 'everton',
      'nottingham-forest', 'bournemouth', 'luton', 'burnley', 'sheffield-united'
    ];

    if (!premierLeagueTeams.includes(teamId)) {
      return null;
    }

    const recentMatches = this.generateMockMatches();
    const formRating = this.calculateFormRating(recentMatches);
    const homeFormRating = this.calculateHomeFormRating(recentMatches);
    const awayFormRating = this.calculateAwayFormRating(recentMatches);

    return {
      teamId,
      teamName: this.formatTeamName(teamId),
      recentMatches,
      formRating,
      homeFormRating,
      awayFormRating
    };
  }

  private generateMockMatches(): MatchResult[] {
    const results: ('win' | 'draw' | 'loss')[] = ['win', 'draw', 'loss'];
    const matches: MatchResult[] = [];

    for (let i = 0; i < 8; i++) {
      const result = results[Math.floor(Math.random() * results.length)];
      const isHome = Math.random() > 0.5;
      const goalsFor = Math.floor(Math.random() * 4);
      const goalsAgainst = result === 'win' ? Math.floor(Math.random() * goalsFor) :
                          result === 'loss' ? goalsFor + Math.floor(Math.random() * 3) + 1 :
                          goalsFor;

      matches.push({
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        opponent: `Team ${i + 1}`,
        isHome,
        result,
        goalsFor,
        goalsAgainst,
        points: result === 'win' ? 3 : result === 'draw' ? 1 : 0
      });
    }

    return matches;
  }

  private calculateFormRating(matches: MatchResult[]): number {
    if (matches.length === 0) return 50;

    const totalPoints = matches.reduce((sum, match) => sum + match.points, 0);
    const maxPossiblePoints = matches.length * 3;
    return Math.round((totalPoints / maxPossiblePoints) * 100);
  }

  private calculateHomeFormRating(matches: MatchResult[]): number {
    const homeMatches = matches.filter(match => match.isHome);
    return this.calculateFormRating(homeMatches);
  }

  private calculateAwayFormRating(matches: MatchResult[]): number {
    const awayMatches = matches.filter(match => !match.isHome);
    return this.calculateFormRating(awayMatches);
  }

  private formatTeamName(teamId: string): string {
    return teamId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private initializeMockData(): void {
    // Pre-populate cache with some common teams for demo
    const commonTeams = ['arsenal', 'chelsea', 'liverpool', 'manchester-city'];

    commonTeams.forEach(teamId => {
      const mockForm = this.generateMockTeamForm(teamId);
      if (mockForm) {
        this.cacheTeamForm(teamId, mockForm);
      }
    });
  }
}