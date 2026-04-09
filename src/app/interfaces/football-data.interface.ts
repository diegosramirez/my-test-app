export interface FootballData {
  id: string;
  competition: string;
  season: string;
  matchday: number;
  matches: Match[];
  lastUpdated: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  status: MatchStatus;
  utcDate: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  crest: string;
}

export interface Score {
  fullTime: {
    home: number | null;
    away: number | null;
  };
  halfTime: {
    home: number | null;
    away: number | null;
  };
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: number;
  retryAfter?: number;
}