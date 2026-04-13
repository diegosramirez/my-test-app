export interface Team {
  id: number;
  name: string;
  logo?: string;
}

export interface Prediction {
  home_win_probability: number; // 0.0-1.0
  draw_probability: number; // 0.0-1.0
  away_win_probability: number; // 0.0-1.0
  prediction_confidence: string; // "high", "medium", "low"
  last_calculated: Date;
  form_period_used: number; // number of matches used (5-10)
}

export interface Fixture {
  id: number;
  home_team: Team;
  away_team: Team;
  date: Date;
  venue?: string;
  status: 'scheduled' | 'postponed' | 'cancelled' | 'live' | 'finished';
  prediction?: Prediction;
}

export interface TeamForm {
  team_id: number;
  matches: FormMatch[];
  form_period: number;
  last_updated: Date;
}

export interface FormMatch {
  id: number;
  date: Date;
  opponent: Team;
  home_away: 'home' | 'away';
  result: 'win' | 'draw' | 'loss';
  goals_for: number;
  goals_against: number;
}