export interface TeamForm {
  teamId: string;
  teamName: string;
  recentMatches: MatchResult[];
  formRating: number; // 0-100 scale
  homeFormRating: number; // separate rating for home performance
  awayFormRating: number; // separate rating for away performance
}

export interface MatchResult {
  date: string;
  opponent: string;
  isHome: boolean;
  result: 'win' | 'draw' | 'loss';
  goalsFor: number;
  goalsAgainst: number;
  points: number; // 3 for win, 1 for draw, 0 for loss
}

export interface MatchPrediction {
  home_win_probability: number; // 0.0-1.0
  draw_probability: number; // 0.0-1.0
  away_win_probability: number; // 0.0-1.0
  prediction_confidence: 'high' | 'medium' | 'low';
  last_calculated: string; // ISO timestamp
  form_period_used: number; // number of recent matches used
}

export interface FixtureWithPrediction {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string; // ISO timestamp
  venue: string;
  status: 'scheduled' | 'postponed' | 'cancelled';
  prediction?: MatchPrediction;
}

export interface PredictionCalculationRequest {
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  recalculate?: boolean;
}

export interface PredictionCalculationResponse {
  prediction: MatchPrediction;
  success: boolean;
  message?: string;
  calculationTime: number; // milliseconds
}