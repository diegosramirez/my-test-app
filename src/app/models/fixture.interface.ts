export interface Team {
  id: number;
  name: string;
  logo?: string;
}

export interface Fixture {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  kickoffTime: Date;
  status: 'scheduled' | 'postponed' | 'cancelled' | 'completed';
  homeScore?: number;
  awayScore?: number;
  // Prediction fields
  homeWinProbability?: number; // 0.0-1.0 decimal
  drawProbability?: number; // 0.0-1.0 decimal
  awayWinProbability?: number; // 0.0-1.0 decimal
  predictionConfidence?: string; // high, medium, low
  lastCalculated?: Date;
  formPeriodUsed?: number; // number of matches used for calculation
}

export interface TeamForm {
  teamId: number;
  matches: FormMatch[];
  winPercentage: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface FormMatch {
  id: number;
  date: Date;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  result: 'win' | 'draw' | 'loss'; // result from perspective of the team in question
}

export interface PredictionResult {
  fixtureId: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  confidence: string;
  formPeriodUsed: number;
  calculatedAt: Date;
}