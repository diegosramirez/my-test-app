import { Injectable, signal, computed } from '@angular/core';

export interface HistoryEntry {
  action: '+1' | '-1' | 'reset';
  timestamp: Date;
  resultingValue: number;
}

@Injectable({ providedIn: 'root' })
export class CounterService {
  readonly count = signal<number>(0);
  readonly history = signal<HistoryEntry[]>([]);

  increment(): void {
    const newValue = this.count() + 1;
    this.count.set(newValue);
    this.history.update(h => [...h, { action: '+1', timestamp: new Date(), resultingValue: newValue }]);
    console.log('counter_incremented', { newValue, action: '+1' });
  }

  decrement(): void {
    const newValue = this.count() - 1;
    this.count.set(newValue);
    this.history.update(h => [...h, { action: '-1', timestamp: new Date(), resultingValue: newValue }]);
    console.log('counter_decremented', { newValue, action: '-1' });
  }

  reset(): void {
    const previousValue = this.count();
    this.count.set(0);
    this.history.update(h => [...h, { action: 'reset', timestamp: new Date(), resultingValue: 0 }]);
    console.log('counter_reset', { previousValue, action: 'reset' });
  }
}
