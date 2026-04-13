import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { TeamForm, FormMatch, Team } from '../models/fixture.model';

@Injectable({
  providedIn: 'root'
})
export class FormDataService {
  private mockTeams: Team[] = [
    { id: 1, name: 'Arsenal' },
    { id: 2, name: 'Liverpool' },
    { id: 3, name: 'Manchester City' },
    { id: 4, name: 'Chelsea' },
    { id: 5, name: 'Manchester United' },
    { id: 6, name: 'Tottenham' },
    { id: 7, name: 'Newcastle' },
    { id: 8, name: 'Brighton' }
  ];

  constructor() {}

  getTeamForm(teamId: number, matchCount: number = 10): Observable<TeamForm> {
    // Simulate API delay
    const formData = this.generateMockForm(teamId, matchCount);
    return of(formData).pipe(delay(Math.random() * 500 + 200)); // 200-700ms delay
  }

  private generateMockForm(teamId: number, matchCount: number): TeamForm {
    const team = this.mockTeams.find(t => t.id === teamId);
    if (!team) {
      throw new Error(`Team with id ${teamId} not found`);
    }

    const matches: FormMatch[] = [];
    const today = new Date();

    // Generate realistic form based on team strength
    const teamStrength = this.getTeamStrength(teamId);

    for (let i = 0; i < matchCount; i++) {
      const matchDate = new Date(today);
      matchDate.setDate(today.getDate() - (i * 7) - Math.random() * 3); // Roughly weekly matches

      const opponent = this.getRandomOpponent(teamId);
      const isHome = Math.random() > 0.5;

      // Calculate result based on team strength and home advantage
      let winProbability = teamStrength;
      if (isHome) winProbability += 0.15; // Home advantage

      const rand = Math.random();
      let result: 'win' | 'draw' | 'loss';
      let goalsFor: number;
      let goalsAgainst: number;

      if (rand < winProbability) {
        result = 'win';
        goalsFor = Math.floor(Math.random() * 3) + 1; // 1-3 goals
        goalsAgainst = Math.floor(Math.random() * 2); // 0-1 goals
      } else if (rand < winProbability + 0.25) {
        result = 'draw';
        const goals = Math.floor(Math.random() * 3) + 1; // 1-3 goals each
        goalsFor = goals;
        goalsAgainst = goals;
      } else {
        result = 'loss';
        goalsFor = Math.floor(Math.random() * 2); // 0-1 goals
        goalsAgainst = Math.floor(Math.random() * 3) + 1; // 1-3 goals
      }

      matches.push({
        id: i + 1,
        date: matchDate,
        opponent,
        home_away: isHome ? 'home' : 'away',
        result,
        goals_for: goalsFor,
        goals_against: goalsAgainst
      });
    }

    return {
      team_id: teamId,
      matches: matches.sort((a, b) => b.date.getTime() - a.date.getTime()), // Most recent first
      form_period: matchCount,
      last_updated: new Date()
    };
  }

  private getTeamStrength(teamId: number): number {
    // Mock team strengths (probability of winning)
    const strengths: { [key: number]: number } = {
      1: 0.65, // Arsenal
      2: 0.70, // Liverpool
      3: 0.75, // Manchester City
      4: 0.55, // Chelsea
      5: 0.50, // Manchester United
      6: 0.45, // Tottenham
      7: 0.55, // Newcastle
      8: 0.40  // Brighton
    };

    return strengths[teamId] || 0.35; // Default for unknown teams
  }

  private getRandomOpponent(excludeTeamId: number): Team {
    const availableTeams = this.mockTeams.filter(t => t.id !== excludeTeamId);
    return availableTeams[Math.floor(Math.random() * availableTeams.length)];
  }

  getAllTeams(): Observable<Team[]> {
    return of([...this.mockTeams]).pipe(delay(100));
  }
}