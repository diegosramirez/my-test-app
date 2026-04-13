export interface MatchPrediction {
  home_win_probability: number; // 0.0 - 1.0
  draw_probability: number; // 0.0 - 1.0
  away_win_probability: number; // 0.0 - 1.0
  prediction_confidence: 'high' | 'medium' | 'low' | 'unavailable';
  last_calculated: Date;
  form_period_used: number; // Number of matches used for calculation (5-10)
}

export interface TeamForm {
  team_id: string;
  recent_matches: TeamFormMatch[];
  points_per_game: number;
  goals_scored_avg: number;
  goals_conceded_avg: number;
  home_record?: TeamRecord;
  away_record?: TeamRecord;
}

export interface TeamFormMatch {
  date: Date;
  opponent: string;
  is_home: boolean;
  result: 'win' | 'draw' | 'loss';
  goals_scored: number;
  goals_conceded: number;
}

export interface TeamRecord {
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
}

export interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_team_id: string;
  away_team_id: string;
  kick_off: Date;
  status: 'scheduled' | 'postponed' | 'cancelled' | 'completed';
  venue: string;
  prediction?: MatchPrediction;
}

export interface PredictionRequest {
  fixture_id: string;
  recalculate?: boolean;
}

export interface PredictionResponse {
  fixture_id: string;
  prediction: MatchPrediction;
  calculation_time_ms: number;
}