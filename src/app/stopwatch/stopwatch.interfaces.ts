export interface StopwatchState {
  elapsedMs: number;
  isRunning: boolean;
  startTime: number | null;
  laps: LapTime[];
}

export interface LapTime {
  id: number;
  timeMs: number;
  displayTime: string;
}