export interface HistoryEntry {
  action: '+1' | '-1' | 'reset';
  resultingValue: number;
  timestamp: Date;
}

export interface CounterTrackingEvent {
  eventName: 'counter_increment' | 'counter_decrement' | 'counter_reset';
  previousValue: number;
  newValue: number;
}
