import { Injectable } from '@angular/core';
import { ToggleEvent } from './toggle.types';

@Injectable({
  providedIn: 'root'
})
export class EventTrackingService {
  private events: ToggleEvent[] = [];

  trackEvent(event: Omit<ToggleEvent, 'timestamp'>): void {
    const trackingEvent: ToggleEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(trackingEvent);

    // In a real application, this would send to analytics service
    console.log('Toggle Event:', trackingEvent);
  }

  trackToggleInit(componentId: string, initialState: boolean): void {
    this.trackEvent({
      component_id: componentId,
      event_type: 'init',
      payload: { initial_state: initialState }
    });
  }

  trackToggleStateChange(componentId: string, newState: boolean, triggerType: 'user' | 'programmatic'): void {
    this.trackEvent({
      component_id: componentId,
      event_type: 'state_changed',
      payload: { new_state: newState, trigger_type: triggerType }
    });
  }

  trackAnimationComplete(componentId: string, durationMs: number): void {
    this.trackEvent({
      component_id: componentId,
      event_type: 'animation_complete',
      payload: { duration_ms: durationMs }
    });
  }

  trackKeyboardUsed(componentId: string, keyPressed: string): void {
    this.trackEvent({
      component_id: componentId,
      event_type: 'keyboard_used',
      payload: { key_pressed: keyPressed }
    });
  }

  getEvents(): ToggleEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}