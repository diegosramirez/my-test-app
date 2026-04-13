import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TeamForm, FormMatch, Team } from '../models/fixture.interface';

@Injectable({
  providedIn: 'root'
})
export class FormDataService {

  // Mock data for demonstration - in real app this would come from API
  private mockTeams: Team[] = [
    { id: 1, name: 'Manchester City' },
    { id: 2, name: 'Liverpool' },
    { id: 3, name: 'Chelsea' },
    { id: 4, name: 'Arsenal' },
    { id: 5, name: 'Tottenham' },
    { id: 6, name: 'Manchester United' }
  ];

  private generateMockFormMatches(teamId: number, count: number = 10): FormMatch[] {
    const matches: FormMatch[] = [];
    const team = this.mockTeams.find(t => t.id === teamId);

    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }

    for (let i = 0; i < count; i++) {
      const opponent = this.mockTeams.find(t => t.id !== teamId);

      if (!opponent) {
        throw new Error(`No valid opponent found for team ${teamId}`);
      }
      const isHome = Math.random() > 0.5;
      const homeScore = Math.floor(Math.random() * 4);
      const awayScore = Math.floor(Math.random() * 4);

      let result: 'win' | 'draw' | 'loss';
      if (isHome) {
        if (homeScore > awayScore) result = 'win';
        else if (homeScore === awayScore) result = 'draw';
        else result = 'loss';
      } else {
        if (awayScore > homeScore) result = 'win';
        else if (homeScore === awayScore) result = 'draw';
        else result = 'loss';
      }

      matches.push({
        id: i + 1,
        date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)), // weeks ago
        homeTeam: isHome ? team : opponent,
        awayTeam: isHome ? opponent : team,
        homeScore,
        awayScore,
        result
      });
    }

    return matches.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getTeamForm(teamId: number, matchCount: number = 10): Observable<TeamForm> {
    const matches = this.generateMockFormMatches(teamId, matchCount);

    const wins = matches.filter(m => m.result === 'win').length;
    const draws = matches.filter(m => m.result === 'draw').length;

    const winPercentage = wins / matches.length;
    const points = (wins * 3) + draws;

    const goalsFor = matches.reduce((total, match) => {
      const isHome = match.homeTeam.id === teamId;
      return total + (isHome ? match.homeScore : match.awayScore);
    }, 0);

    const goalsAgainst = matches.reduce((total, match) => {
      const isHome = match.homeTeam.id === teamId;
      return total + (isHome ? match.awayScore : match.homeScore);
    }, 0);

    const teamForm: TeamForm = {
      teamId,
      matches,
      winPercentage,
      points,
      goalsFor,
      goalsAgainst
    };

    return of(teamForm);
  }

  getMultipleTeamForms(teamIds: number[], matchCount: number = 10): Observable<TeamForm[]> {
    const forms = teamIds.map(id => this.generateTeamFormSync(id, matchCount));
    return of(forms);
  }

  private generateTeamFormSync(teamId: number, matchCount: number): TeamForm {
    const matches = this.generateMockFormMatches(teamId, matchCount);

    const wins = matches.filter(m => m.result === 'win').length;
    const draws = matches.filter(m => m.result === 'draw').length;

    const winPercentage = wins / matches.length;
    const points = (wins * 3) + draws;

    const goalsFor = matches.reduce((total, match) => {
      const isHome = match.homeTeam.id === teamId;
      return total + (isHome ? match.homeScore : match.awayScore);
    }, 0);

    const goalsAgainst = matches.reduce((total, match) => {
      const isHome = match.homeTeam.id === teamId;
      return total + (isHome ? match.awayScore : match.homeScore);
    }, 0);

    return {
      teamId,
      matches,
      winPercentage,
      points,
      goalsFor,
      goalsAgainst
    };
  }
}