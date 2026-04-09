import { Team } from './team.interface';

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  matchDate: string; // ISO string format
  venue: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  finishTime?: string; // ISO string format for actual finish time
}

export interface MatchesResponse {
  matches: Match[];
  lastUpdated: string; // ISO string format
}