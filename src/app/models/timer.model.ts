export enum TimerState {
  STOPPED = 'STOPPED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}

export interface Lap {
  lapNumber: number;
  absoluteTime: number;
  splitTime: number;
  timestamp: number;
}