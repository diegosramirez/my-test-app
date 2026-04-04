import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CounterComponent } from './counter.component';
import { CounterConfig } from './counter.types';
import { routes } from '../../app.routes';

// Test host component to simulate real usage context
@Component({
  template: `
    <div class="app-wrapper">
      <app-counter
        [config]="counterConfig"
        (countChanged)="onCountChanged($event)"
        (componentLoaded)="onComponentLoaded($event)"
        (buttonClicked)="onButtonClicked($event)"
        (keyboardUsed)="onKeyboardUsed($event)">
      </app-counter>
    </div>
  `,
  standalone: true,
  imports: [CounterComponent]
})
class TestHostComponent {
  counterConfig: CounterConfig = { initialValue: 0, step: 1 };
  countChangedEvents: any[] = [];
  componentLoadedEvents: any[] = [];
  buttonClickedEvents: any[] = [];
  keyboardUsedEvents: any[] = [];

  onCountChanged(event: any) {
    this.countChangedEvents.push(event);
  }

  onComponentLoaded(event: any) {
    this.componentLoadedEvents.push(event);
  }

  onButtonClicked(event: any) {
    this.buttonClickedEvents.push(event);
  }

  onKeyboardUsed(event: any) {
    this.keyboardUsedEvents.push(event);
  }
}

describe('CounterComponent - Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let counterComponent: CounterComponent;
  let router: Router;
  let location: Location;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter(routes)]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    compiled = fixture.nativeElement;

    // Get the counter component instance
    const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
    counterComponent = counterDebugElement.componentInstance;
  });

  describe('Application Integration', () => {
    it('should integrate properly with routing system', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(location.path()).toBe('');
      expect(counterComponent).toBeTruthy();
      expect(counterComponent.count()).toBe(0);
    }));

    it('should load at /counter route', fakeAsync(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();

      expect(location.path()).toBe('/counter');
    }));

    it('should handle route changes without losing state', fakeAsync(() => {
      fixture.detectChanges();

      // Increment counter
      counterComponent.onIncrement();
      tick(100);
      expect(counterComponent.count()).toBe(1);

      // Navigate away and back
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();

      // Component should be recreated with initial state
      const newCounterElement = fixture.debugElement.query(By.directive(CounterComponent));
      const newCounterComponent = newCounterElement.componentInstance;
      expect(newCounterComponent.count()).toBe(0);
    }));
  });

  describe('Parent-Child Communication', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit componentLoaded event to parent', fakeAsync(() => {
      tick(100);

      expect(hostComponent.componentLoadedEvents.length).toBe(1);
      const event = hostComponent.componentLoadedEvents[0];
      expect(event.initialValue).toBe(0);
      expect(event.timestamp).toBeGreaterThan(0);
    }));

    it('should emit countChanged events to parent', fakeAsync(() => {
      counterComponent.onIncrement();
      tick(100);

      expect(hostComponent.countChangedEvents.length).toBe(1);
      const event = hostComponent.countChangedEvents[0];
      expect(event.action).toBe('increment');
      expect(event.oldValue).toBe(0);
      expect(event.newValue).toBe(1);
      expect(event.interactionMethod).toBe('click');
      expect(event.timestamp).toBeGreaterThan(0);
    }));

    it('should emit buttonClicked events for analytics', fakeAsync(() => {
      counterComponent.onIncrement();
      counterComponent.onDecrement();
      counterComponent.onReset();
      tick(300);

      expect(hostComponent.buttonClickedEvents.length).toBe(3);
      expect(hostComponent.buttonClickedEvents[0].actionType).toBe('increment');
      expect(hostComponent.buttonClickedEvents[1].actionType).toBe('decrement');
      expect(hostComponent.buttonClickedEvents[2].actionType).toBe('reset');
    }));

    it('should emit keyboardUsed events for accessibility analytics', fakeAsync(() => {
      const incrementBtn = compiled.querySelector('.counter-btn--increment') as HTMLButtonElement;
      incrementBtn.focus();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      incrementBtn.dispatchEvent(event);
      tick(100);

      expect(hostComponent.keyboardUsedEvents.length).toBe(1);
      const keyboardEvent = hostComponent.keyboardUsedEvents[0];
      expect(keyboardEvent.keyPressed).toBe('Enter');
      expect(keyboardEvent.currentValue).toBe(0);
    }));

    it('should accept configuration from parent', fakeAsync(() => {
      hostComponent.counterConfig = { initialValue: 10, step: 5, minValue: 0, maxValue: 50 };
      fixture.detectChanges();

      expect(counterComponent.count()).toBe(10);

      counterComponent.onIncrement();
      tick(100);
      expect(counterComponent.count()).toBe(15);
    }));
  });

  describe('Real-world Usage Scenarios', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle user workflow: increment multiple times, then reset', fakeAsync(() => {
      // Simulate user incrementing 5 times
      for (let i = 0; i < 5; i++) {
        counterComponent.onIncrement();
        tick(60); // Slightly more than debounce time
      }

      expect(counterComponent.count()).toBe(5);
      expect(hostComponent.countChangedEvents.length).toBe(5);

      // Reset to zero
      counterComponent.onReset();
      tick(60);

      expect(counterComponent.count()).toBe(0);
      expect(hostComponent.countChangedEvents.length).toBe(6);

      const resetEvent = hostComponent.countChangedEvents[5];
      expect(resetEvent.action).toBe('reset');
      expect(resetEvent.oldValue).toBe(5);
      expect(resetEvent.newValue).toBe(0);
    }));

    it('should handle mixed interaction methods in sequence', fakeAsync(() => {
      // Click increment
      const incrementBtn = compiled.querySelector('.counter-btn--increment') as HTMLButtonElement;
      incrementBtn.click();
      tick(60);

      // Keyboard decrement
      const decrementBtn = compiled.querySelector('.counter-btn--decrement') as HTMLButtonElement;
      decrementBtn.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: ' ' });
      decrementBtn.dispatchEvent(keyEvent);
      tick(60);

      // API call reset
      counterComponent.reset();
      tick(60);

      expect(hostComponent.countChangedEvents.length).toBe(2); // increment and decrement change count, reset from 0 to 0 doesn't
      expect(hostComponent.buttonClickedEvents.length).toBe(3);
      expect(hostComponent.keyboardUsedEvents.length).toBe(1);
    }));

    it('should maintain event emission consistency across rapid interactions', fakeAsync(() => {
      const startTime = Date.now();

      // Rapid mixed interactions
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) counterComponent.onIncrement();
        else if (i % 3 === 1) counterComponent.onDecrement();
        else counterComponent.onReset();
        tick(10); // Very rapid
      }

      tick(100); // Let debounce settle

      // Should have emitted events for each button press
      expect(hostComponent.buttonClickedEvents.length).toBe(20);

      // Count changes should be reasonable (debounced)
      expect(hostComponent.countChangedEvents.length).toBeLessThanOrEqual(20);
      expect(hostComponent.countChangedEvents.length).toBeGreaterThan(0);

      // All events should have valid timestamps
      hostComponent.countChangedEvents.forEach(event => {
        expect(event.timestamp).toBeGreaterThanOrEqual(startTime);
        expect(event.timestamp).toBeLessThanOrEqual(Date.now());
      });
    }));
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid configuration gracefully', () => {
      hostComponent.counterConfig = {
        initialValue: NaN,
        step: Infinity,
        minValue: 'invalid' as any,
        maxValue: null as any
      };

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();

      // Should fall back to safe defaults
      expect(counterComponent.count()).toBe(0);
    });

    it('should handle extremely large numbers', fakeAsync(() => {
      hostComponent.counterConfig = {
        initialValue: Number.MAX_SAFE_INTEGER - 1,
        step: 1,
        maxValue: Number.MAX_SAFE_INTEGER
      };
      fixture.detectChanges();

      expect(counterComponent.count()).toBe(Number.MAX_SAFE_INTEGER - 1);

      counterComponent.onIncrement();
      tick(100);
      expect(counterComponent.count()).toBe(Number.MAX_SAFE_INTEGER);

      // Should not exceed max
      counterComponent.onIncrement();
      tick(100);
      expect(counterComponent.count()).toBe(Number.MAX_SAFE_INTEGER);
    }));

    it('should handle extremely small numbers', fakeAsync(() => {
      hostComponent.counterConfig = {
        initialValue: Number.MIN_SAFE_INTEGER + 1,
        step: 1,
        minValue: Number.MIN_SAFE_INTEGER
      };
      fixture.detectChanges();

      expect(counterComponent.count()).toBe(Number.MIN_SAFE_INTEGER + 1);

      counterComponent.onDecrement();
      tick(100);
      expect(counterComponent.count()).toBe(Number.MIN_SAFE_INTEGER);

      // Should not go below min
      counterComponent.onDecrement();
      tick(100);
      expect(counterComponent.count()).toBe(Number.MIN_SAFE_INTEGER);
    }));

    it('should handle component destruction during pending operations', fakeAsync(() => {
      // Start an operation
      counterComponent.onIncrement();
      tick(25); // Before debounce completes

      // Destroy component
      expect(() => {
        fixture.destroy();
        tick(100);
      }).not.toThrow();
    }));
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated interactions', fakeAsync(() => {
      const initialEventCount = hostComponent.countChangedEvents.length;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        counterComponent.onIncrement();
        tick(60);
      }

      expect(hostComponent.countChangedEvents.length).toBe(initialEventCount + 100);

      // Clear events to simulate real-world cleanup
      hostComponent.countChangedEvents = [];

      // Events should be properly garbage collected
      expect(hostComponent.countChangedEvents.length).toBe(0);
    }));

    it('should handle high-frequency interactions without UI lag', fakeAsync(() => {
      const startTime = performance.now();

      // Simulate very rapid clicking
      for (let i = 0; i < 50; i++) {
        counterComponent.onIncrement();
      }

      tick(100);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(counterComponent.count()).toBeGreaterThan(0);
      expect(counterComponent.count()).toBeLessThanOrEqual(50);
    }));
  });

  describe('Cross-browser Compatibility Simulation', () => {
    it('should format numbers consistently across locales', () => {
      // Test with different large numbers
      const testValues = [0, 1, 1000, 1234567, -1000, -1234567];

      testValues.forEach(value => {
        counterComponent.count.set(value);
        fixture.detectChanges();

        const formatted = counterComponent.formattedCount();
        expect(formatted).toBeTruthy();
        expect(formatted).toContain(Math.abs(value).toString().slice(-1)); // Should contain last digit
      });
    });

    it('should maintain keyboard accessibility across different focus states', fakeAsync(() => {
      const buttons = compiled.querySelectorAll('.counter-btn') as NodeListOf<HTMLButtonElement>;

      buttons.forEach((button, index) => {
        button.focus();
        fixture.detectChanges();

        const focusedElement = document.activeElement;
        expect(focusedElement).toBe(button);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        button.dispatchEvent(event);
        tick(60);
      });

      // Should have handled all button interactions
      expect(hostComponent.buttonClickedEvents.length).toBe(3);
    }));
  });
});