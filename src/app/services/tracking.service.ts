import { Injectable } from '@angular/core';
import { CounterTrackingEvent } from '../features/counter/counter.model';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  track(event: CounterTrackingEvent): void {
    console.debug('[tracking]', event.eventName, event);
  }
}
