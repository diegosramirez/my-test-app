import { TestBed } from '@angular/core/testing';
import { EventTrackingService } from './event-tracking.service';
import { ToggleEvent } from './toggle.types';

describe('EventTrackingService', () => {
  let service: EventTrackingService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventTrackingService]
    });
    service = TestBed.inject(EventTrackingService);
    consoleLogSpy = vi.spyOn(console, 'log');
  });

  afterEach(() => {
    service.clearEvents();
  });

  describe('Service Creation and Basic Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with empty events array', () => {
      expect(service.getEvents()).toEqual([]);
    });

    it('should clear events correctly', () => {
      service.trackToggleInit('test-id', true);
      expect(service.getEvents().length).toBe(1);

      service.clearEvents();
      expect(service.getEvents()).toEqual([]);
    });

    it('should return a copy of events array to prevent external modification', () => {
      service.trackToggleInit('test-id', true);
      const events = service.getEvents();
      events.push({} as ToggleEvent);

      // Service internal array should not be affected
      expect(service.getEvents().length).toBe(1);
    });
  });

  describe('Generic trackEvent Method', () => {
    it('should add timestamp to events automatically', () => {
      const beforeTime = Date.now();

      service.trackEvent({
        component_id: 'test-id',
        event_type: 'init',
        payload: { initial_state: true }
      });

      const afterTime = Date.now();
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(events[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve all event properties', () => {
      const eventData = {
        component_id: 'test-component',
        event_type: 'state_changed' as const,
        payload: {
          new_state: true,
          trigger_type: 'user'
        }
      };

      service.trackEvent(eventData);
      const events = service.getEvents();

      expect(events[0].component_id).toBe(eventData.component_id);
      expect(events[0].event_type).toBe(eventData.event_type);
      expect(events[0].payload).toEqual(eventData.payload);
    });

    it('should log events to console', () => {
      const eventData = {
        component_id: 'test-id',
        event_type: 'init' as const,
        payload: { initial_state: false }
      };

      service.trackEvent(eventData);

      expect(consoleLogSpy).toHaveBeenCalledWith('Toggle Event:', expect.objectContaining({
        component_id: 'test-id',
        event_type: 'init',
        payload: { initial_state: false },
        timestamp: expect.any(Number)
      }));
    });
  });

  describe('Toggle Initialization Events', () => {
    it('should track toggle init event with correct structure', () => {
      const componentId = 'toggle-123';
      const initialState = true;

      service.trackToggleInit(componentId, initialState);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'init',
        payload: { initial_state: initialState },
        timestamp: expect.any(Number)
      }));
    });

    it('should track multiple init events from different components', () => {
      service.trackToggleInit('toggle-1', true);
      service.trackToggleInit('toggle-2', false);
      service.trackToggleInit('toggle-3', true);

      const events = service.getEvents();
      expect(events.length).toBe(3);

      expect(events[0].component_id).toBe('toggle-1');
      expect(events[0].payload.initial_state).toBe(true);

      expect(events[1].component_id).toBe('toggle-2');
      expect(events[1].payload.initial_state).toBe(false);

      expect(events[2].component_id).toBe('toggle-3');
      expect(events[2].payload.initial_state).toBe(true);
    });

    it('should handle init event with false initial state', () => {
      service.trackToggleInit('toggle-false', false);
      const events = service.getEvents();

      expect(events[0].payload.initial_state).toBe(false);
    });

    it('should handle init event with special characters in component ID', () => {
      const specialId = 'toggle_with-special.chars@123';
      service.trackToggleInit(specialId, true);
      const events = service.getEvents();

      expect(events[0].component_id).toBe(specialId);
    });
  });

  describe('Toggle State Change Events', () => {
    it('should track state change event with user trigger', () => {
      const componentId = 'toggle-456';
      const newState = true;
      const triggerType = 'user';

      service.trackToggleStateChange(componentId, newState, triggerType);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'state_changed',
        payload: {
          new_state: newState,
          trigger_type: triggerType
        },
        timestamp: expect.any(Number)
      }));
    });

    it('should track state change event with programmatic trigger', () => {
      const componentId = 'toggle-789';
      const newState = false;
      const triggerType = 'programmatic';

      service.trackToggleStateChange(componentId, newState, triggerType);
      const events = service.getEvents();

      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'state_changed',
        payload: {
          new_state: newState,
          trigger_type: triggerType
        }
      }));
    });

    it('should track multiple state changes for same component', () => {
      const componentId = 'toggle-multi';

      service.trackToggleStateChange(componentId, true, 'user');
      service.trackToggleStateChange(componentId, false, 'programmatic');
      service.trackToggleStateChange(componentId, true, 'user');

      const events = service.getEvents();
      expect(events.length).toBe(3);

      expect(events[0].payload.new_state).toBe(true);
      expect(events[0].payload.trigger_type).toBe('user');

      expect(events[1].payload.new_state).toBe(false);
      expect(events[1].payload.trigger_type).toBe('programmatic');

      expect(events[2].payload.new_state).toBe(true);
      expect(events[2].payload.trigger_type).toBe('user');
    });

    it('should maintain chronological order of events', () => {
      const startTime = Date.now();

      service.trackToggleStateChange('toggle-1', true, 'user');
      // Small delay to ensure different timestamps
      setTimeout(() => {
        service.trackToggleStateChange('toggle-1', false, 'user');
      }, 1);

      setTimeout(() => {
        const events = service.getEvents();
        expect(events[0].timestamp).toBeLessThan(events[1].timestamp);
      }, 10);
    });
  });

  describe('Animation Complete Events', () => {
    it('should track animation complete event with correct duration', () => {
      const componentId = 'toggle-anim';
      const durationMs = 250;

      service.trackAnimationComplete(componentId, durationMs);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'animation_complete',
        payload: { duration_ms: durationMs },
        timestamp: expect.any(Number)
      }));
    });

    it('should track animation events with various durations', () => {
      service.trackAnimationComplete('fast-toggle', 150);
      service.trackAnimationComplete('normal-toggle', 300);
      service.trackAnimationComplete('slow-toggle', 450);

      const events = service.getEvents();
      expect(events.length).toBe(3);

      expect(events[0].payload.duration_ms).toBe(150);
      expect(events[1].payload.duration_ms).toBe(300);
      expect(events[2].payload.duration_ms).toBe(450);
    });

    it('should handle zero duration animations', () => {
      service.trackAnimationComplete('instant-toggle', 0);
      const events = service.getEvents();

      expect(events[0].payload.duration_ms).toBe(0);
    });

    it('should handle very long animation durations', () => {
      const longDuration = 5000;
      service.trackAnimationComplete('long-toggle', longDuration);
      const events = service.getEvents();

      expect(events[0].payload.duration_ms).toBe(longDuration);
    });
  });

  describe('Keyboard Usage Events', () => {
    it('should track keyboard event with Space key', () => {
      const componentId = 'toggle-kbd';
      const keyPressed = ' ';

      service.trackKeyboardUsed(componentId, keyPressed);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'keyboard_used',
        payload: { key_pressed: keyPressed },
        timestamp: expect.any(Number)
      }));
    });

    it('should track keyboard event with Enter key', () => {
      const componentId = 'toggle-enter';
      const keyPressed = 'Enter';

      service.trackKeyboardUsed(componentId, keyPressed);
      const events = service.getEvents();

      expect(events[0]).toEqual(expect.objectContaining({
        component_id: componentId,
        event_type: 'keyboard_used',
        payload: { key_pressed: keyPressed }
      }));
    });

    it('should track multiple keyboard interactions', () => {
      const componentId = 'toggle-keys';

      service.trackKeyboardUsed(componentId, ' ');
      service.trackKeyboardUsed(componentId, 'Enter');
      service.trackKeyboardUsed(componentId, ' ');

      const events = service.getEvents();
      expect(events.length).toBe(3);

      expect(events[0].payload.key_pressed).toBe(' ');
      expect(events[1].payload.key_pressed).toBe('Enter');
      expect(events[2].payload.key_pressed).toBe(' ');
    });

    it('should handle special character keys', () => {
      const componentId = 'toggle-special';
      const specialKeys = ['Tab', 'Escape', 'ArrowUp', 'F1'];

      specialKeys.forEach(key => {
        service.trackKeyboardUsed(componentId, key);
      });

      const events = service.getEvents();
      expect(events.length).toBe(specialKeys.length);

      events.forEach((event, index) => {
        expect(event.payload.key_pressed).toBe(specialKeys[index]);
      });
    });
  });

  describe('Event Sequence and Timing Tests', () => {
    it('should track complete toggle lifecycle events in correct order', () => {
      const componentId = 'toggle-lifecycle';

      // Simulate complete toggle interaction
      service.trackToggleInit(componentId, false);
      service.trackKeyboardUsed(componentId, ' ');
      service.trackToggleStateChange(componentId, true, 'user');
      service.trackAnimationComplete(componentId, 280);

      const events = service.getEvents();
      expect(events.length).toBe(4);

      expect(events[0].event_type).toBe('init');
      expect(events[1].event_type).toBe('keyboard_used');
      expect(events[2].event_type).toBe('state_changed');
      expect(events[3].event_type).toBe('animation_complete');

      // All events should have the same component_id
      events.forEach(event => {
        expect(event.component_id).toBe(componentId);
      });
    });

    it('should track events with proper timestamp progression', () => {
      const componentId = 'toggle-timing';
      let previousTimestamp = 0;

      service.trackToggleInit(componentId, false);
      const events1 = service.getEvents();
      expect(events1[0].timestamp).toBeGreaterThan(previousTimestamp);
      previousTimestamp = events1[0].timestamp;

      // Add small delay to ensure different timestamp
      setTimeout(() => {
        service.trackToggleStateChange(componentId, true, 'user');
        const events2 = service.getEvents();
        expect(events2[1].timestamp).toBeGreaterThan(previousTimestamp);
      }, 1);
    });

    it('should handle rapid event firing correctly', () => {
      const componentId = 'toggle-rapid';
      const eventCount = 10;

      // Fire events rapidly
      for (let i = 0; i < eventCount; i++) {
        service.trackToggleStateChange(componentId, i % 2 === 0, 'user');
      }

      const events = service.getEvents();
      expect(events.length).toBe(eventCount);

      // All events should be tracked
      events.forEach((event, index) => {
        expect(event.component_id).toBe(componentId);
        expect(event.event_type).toBe('state_changed');
        expect(event.payload.new_state).toBe(index % 2 === 0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty component IDs', () => {
      service.trackToggleInit('', true);
      const events = service.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].component_id).toBe('');
    });

    it('should handle null/undefined values gracefully in payloads', () => {
      // Test with manual trackEvent call to simulate edge cases
      service.trackEvent({
        component_id: 'test-null',
        event_type: 'init',
        payload: { initial_state: undefined as any }
      });

      const events = service.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].payload.initial_state).toBeUndefined();
    });

    it('should maintain event integrity when events array grows large', () => {
      const largeEventCount = 1000;

      for (let i = 0; i < largeEventCount; i++) {
        service.trackToggleInit(`toggle-${i}`, i % 2 === 0);
      }

      const events = service.getEvents();
      expect(events.length).toBe(largeEventCount);

      // Verify first and last events are correct
      expect(events[0].component_id).toBe('toggle-0');
      expect(events[largeEventCount - 1].component_id).toBe(`toggle-${largeEventCount - 1}`);
    });
  });

  describe('Memory Management and Performance', () => {
    it('should not leak memory when clearing events multiple times', () => {
      // Add events
      service.trackToggleInit('test-1', true);
      service.trackToggleInit('test-2', false);

      // Clear multiple times
      service.clearEvents();
      service.clearEvents();
      service.clearEvents();

      expect(service.getEvents()).toEqual([]);
    });

    it('should handle concurrent event tracking efficiently', () => {
      const startTime = performance.now();
      const eventCount = 100;

      // Simulate concurrent event tracking
      for (let i = 0; i < eventCount; i++) {
        service.trackToggleInit(`concurrent-${i}`, true);
        service.trackToggleStateChange(`concurrent-${i}`, false, 'user');
        service.trackAnimationComplete(`concurrent-${i}`, 300);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(service.getEvents().length).toBe(eventCount * 3);
      // Performance should be reasonable (less than 100ms for 300 events)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Event Structure Validation', () => {
    it('should ensure all required properties are present in init events', () => {
      service.trackToggleInit('validation-test', true);
      const event = service.getEvents()[0];

      expect(event).toHaveProperty('component_id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('payload');
      expect(event.payload).toHaveProperty('initial_state');
    });

    it('should ensure all required properties are present in state change events', () => {
      service.trackToggleStateChange('validation-test', true, 'user');
      const event = service.getEvents()[0];

      expect(event).toHaveProperty('component_id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('payload');
      expect(event.payload).toHaveProperty('new_state');
      expect(event.payload).toHaveProperty('trigger_type');
    });

    it('should ensure all required properties are present in animation events', () => {
      service.trackAnimationComplete('validation-test', 250);
      const event = service.getEvents()[0];

      expect(event).toHaveProperty('component_id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('payload');
      expect(event.payload).toHaveProperty('duration_ms');
    });

    it('should ensure all required properties are present in keyboard events', () => {
      service.trackKeyboardUsed('validation-test', 'Enter');
      const event = service.getEvents()[0];

      expect(event).toHaveProperty('component_id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('payload');
      expect(event.payload).toHaveProperty('key_pressed');
    });
  });
});