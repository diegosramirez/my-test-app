import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryEntry } from './counter.model';
import { TrackingService } from '../../services/tracking.service';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.css']
})
export class CounterComponent {
  counter = 0;
  history: HistoryEntry[] = [];

  private tracking = inject(TrackingService);

  increment(): void {
    const prev = this.counter;
    this.counter += 1;
    this.history.unshift({ action: '+1', resultingValue: this.counter, timestamp: new Date() });
    this.tracking.track({ eventName: 'counter_increment', previousValue: prev, newValue: this.counter });
  }

  decrement(): void {
    const prev = this.counter;
    this.counter -= 1;
    this.history.unshift({ action: '-1', resultingValue: this.counter, timestamp: new Date() });
    this.tracking.track({ eventName: 'counter_decrement', previousValue: prev, newValue: this.counter });
  }

  reset(): void {
    const prev = this.counter;
    this.counter = 0;
    this.history.unshift({ action: 'reset', resultingValue: 0, timestamp: new Date() });
    this.tracking.track({ eventName: 'counter_reset', previousValue: prev, newValue: 0 });
  }
}
