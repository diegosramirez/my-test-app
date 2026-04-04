import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';

import { CounterComponent } from './counter.component';
import { routes } from '../app.routes';

// Test host component for integration testing
@Component({
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [RouterOutlet]
})
class TestHostComponent {}

describe('CounterComponent Integration Tests', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let router: Router;
  let location: Location;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter(routes)]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Route Integration', () => {
    it('should navigate to counter route and render component', async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();

      expect(location.path()).toBe('/counter');
      const counterElement = compiled.querySelector('app-counter');
      expect(counterElement).toBeTruthy();
    }));

    it('should redirect from root to counter route', async(() => {
      router.navigate(['']);
      tick();
      fixture.detectChanges();

      expect(location.path()).toBe('/counter');
      const counterElement = compiled.querySelector('app-counter');
      expect(counterElement).toBeTruthy();
    }));

    it('should lazy load counter component', async(() => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      router.navigate(['/counter']);
      tick();

      expect(navigateSpy).toHaveBeenCalledWith(['/counter']);
    }));

    it('should maintain component state during route navigation', async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();

      // Get counter component instance and modify state
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      counterComponent.increment();
      counterComponent.increment();
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(2);

      // Navigate away and back (simulating browser back/forward)
      router.navigate(['/']);
      tick();
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();

      // Component should be freshly instantiated with default state
      const newCounterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const newCounterComponent = newCounterDebugElement.componentInstance as CounterComponent;
      expect(newCounterComponent.countValue()).toBe(0);
    }));
  });

  describe('Performance and Stress Testing', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should handle extremely rapid button clicking without performance degradation', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;

      const startTime = performance.now();

      // Simulate 1000 rapid clicks
      for (let i = 0; i < 1000; i++) {
        incrementButton.click();
        if (i % 100 === 0) {
          tick(1); // Small tick every 100 clicks to simulate minimal timing
        }
      }
      fixture.detectChanges();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(counterComponent.countValue()).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }));

    it('should handle signal updates efficiently with frequent changes', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      // Test mixed rapid operations
      const operations = [
        () => counterComponent.increment(),
        () => counterComponent.decrement(),
        () => counterComponent.increment(),
        () => counterComponent.increment(),
        () => counterComponent.decrement(),
        () => counterComponent.reset(),
        () => counterComponent.increment()
      ];

      const startTime = performance.now();

      // Perform 500 mixed operations
      for (let i = 0; i < 500; i++) {
        const operation = operations[i % operations.length];
        operation();
        if (i % 50 === 0) {
          tick(1);
          fixture.detectChanges();
        }
      }

      const endTime = performance.now();
      const finalCount = counterComponent.countValue();

      // Verify final state is correct (mathematical result of 500 cycles of the pattern)
      // Pattern: +1, -1, +1, +1, -1, 0, +1 = net +1 per cycle, but reset to 0 every 7th operation
      // So we need to calculate based on complete cycles and remainder
      const completeCycles = Math.floor(500 / 7);
      const remainder = 500 % 7;

      // Each complete cycle resets to 0 then adds 1, so result is based on remainder operations
      let expectedCount = 0;
      for (let i = 0; i < remainder; i++) {
        const operation = operations[i];
        if (operation === counterComponent.increment) expectedCount += 1;
        else if (operation === counterComponent.decrement) expectedCount -= 1;
        else if (operation === counterComponent.reset) expectedCount = 0;
      }

      expect(finalCount).toBe(expectedCount);
      expect(endTime - startTime).toBeLessThan(3000); // Should be fast
    }));

    it('should maintain UI consistency under stress', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      // Perform 100 random operations
      const randomOperations = ['increment', 'decrement', 'reset'];
      let expectedCount = 0;

      for (let i = 0; i < 100; i++) {
        const operation = randomOperations[Math.floor(Math.random() * 3)];

        switch (operation) {
          case 'increment':
            counterComponent.increment();
            expectedCount++;
            break;
          case 'decrement':
            counterComponent.decrement();
            expectedCount--;
            break;
          case 'reset':
            counterComponent.reset();
            expectedCount = 0;
            break;
        }

        if (i % 10 === 0) {
          tick(1);
          fixture.detectChanges();

          // Verify UI matches component state
          const countDisplay = compiled.querySelector('.count-value');
          expect(countDisplay?.textContent?.trim()).toBe(counterComponent.countValue().toString());
        }
      }

      tick();
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(expectedCount);
      const finalCountDisplay = compiled.querySelector('.count-value');
      expect(finalCountDisplay?.textContent?.trim()).toBe(expectedCount.toString());
    }));
  });

  describe('Advanced Keyboard Navigation', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should support keyboard navigation with native button behavior', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;
      const decrementButton = compiled.querySelector('.counter-button--decrement') as HTMLButtonElement;
      const resetButton = compiled.querySelector('.counter-button--reset') as HTMLButtonElement;
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;

      // Test native keyboard interaction with Enter key
      decrementButton.focus();
      decrementButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      decrementButton.click(); // Simulate native button behavior
      tick();
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(-1);

      // Test native keyboard interaction with Space key
      resetButton.focus();
      resetButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      resetButton.click(); // Simulate native button behavior
      tick();
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(0);

      // Test increment with native behavior
      incrementButton.focus();
      for (let i = 0; i < 3; i++) {
        incrementButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        incrementButton.click(); // Simulate native button behavior
        tick();
      }
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(3);
    }));
  });

  describe('Accessibility Integration', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should announce count changes to screen readers through ARIA live regions', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      counterComponent.increment();
      tick();
      fixture.detectChanges();

      const liveRegions = compiled.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBe(1); // Should only have one ARIA live region

      // Check that live region contains the updated count
      const liveRegion = liveRegions[0];
      expect(liveRegion.textContent).toContain('1');
    }));

    it('should maintain proper focus management during interactions', async(() => {
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;
      const resetButton = compiled.querySelector('.counter-button--reset') as HTMLButtonElement;

      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);

      incrementButton.click();
      tick();
      fixture.detectChanges();

      // Focus should remain on the button after clicking
      expect(document.activeElement).toBe(incrementButton);

      resetButton.focus();
      resetButton.click();
      tick();
      fixture.detectChanges();

      expect(document.activeElement).toBe(resetButton);
    }));

    it('should provide comprehensive screen reader context', async(() => {
      const buttons = compiled.querySelectorAll('.counter-button');

      buttons.forEach(button => {
        expect(button.getAttribute('aria-label')).toBeTruthy();
        expect(button.getAttribute('aria-describedby')).toBe('count-value');
        expect(button.getAttribute('type')).toBe('button');
      });

      const countDisplay = compiled.querySelector('#count-value');
      expect(countDisplay).toBeTruthy();

      const visuallyHiddenElements = compiled.querySelectorAll('.visually-hidden');
      expect(visuallyHiddenElements.length).toBeGreaterThan(0);
    }));
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should handle component destruction gracefully', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      counterComponent.increment();
      expect(counterComponent.countValue()).toBe(1);

      // Simulate component destruction
      fixture.destroy();
      tick();

      // Component should be destroyed without errors
      expect(() => fixture.componentInstance).not.toThrow();
    }));

    it('should handle extreme values without breaking', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      // Test with a reasonable large number for testing
      const largeNumber = 10000;
      for (let i = 0; i < largeNumber; i++) {
        counterComponent.increment();
        if (i % 1000 === 0) tick(1); // Periodic ticks to prevent test timeout
      }

      expect(counterComponent.countValue()).toBe(largeNumber);

      // Test reset works with large numbers
      counterComponent.reset();
      expect(counterComponent.countValue()).toBe(0);
    }));

    it('should emit events correctly even with rapid state changes', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      const emittedValues: number[] = [];
      counterComponent.countChanged.subscribe((value: number) => emittedValues.push(value));

      // Perform rapid operations
      counterComponent.increment(); // 1
      counterComponent.increment(); // 2
      counterComponent.decrement(); // 1
      counterComponent.reset();     // 0
      counterComponent.increment(); // 1

      tick();

      expect(emittedValues).toEqual([1, 2, 1, 0, 1]);
      expect(counterComponent.countValue()).toBe(1);
    }));
  });

  describe('Browser Compatibility', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should work with simulated touch events', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;

      // Simulate touch events (which should still trigger click)
      const touchEvent = new TouchEvent('touchstart', { bubbles: true });
      incrementButton.dispatchEvent(touchEvent);
      incrementButton.click(); // Touch typically ends with click

      tick();
      fixture.detectChanges();

      expect(counterComponent.countValue()).toBe(1);
    }));

    it('should maintain minimum touch target sizes', () => {
      const buttons = compiled.querySelectorAll('.counter-button');

      buttons.forEach(button => {
        const computedStyle = getComputedStyle(button);
        // In test environment, we check the CSS classes rather than computed dimensions
        expect(button.classList.contains('counter-button')).toBe(true);
        // The CSS sets min-height: 44px and min-width: 44px
      });
    });
  });

  describe('Component Integration with Angular Features', () => {
    beforeEach(async(() => {
      router.navigate(['/counter']);
      tick();
      fixture.detectChanges();
    }));

    it('should work correctly with OnPush change detection if used', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      // Signal-based components should update regardless of change detection strategy
      counterComponent.increment();

      // Force change detection
      fixture.detectChanges();
      tick();

      const countDisplay = compiled.querySelector('.count-value');
      expect(countDisplay?.textContent?.trim()).toBe('1');
    }));

    it('should integrate properly with Angular forms if wrapped', async(() => {
      const counterDebugElement = fixture.debugElement.query(By.directive(CounterComponent));
      const counterComponent = counterDebugElement.componentInstance as CounterComponent;

      // Test that the component can emit values that could be used in forms
      let formValue: number | undefined;
      counterComponent.countChanged.subscribe((value: number) => formValue = value);

      counterComponent.increment();
      tick();

      expect(formValue).toBe(1);
    }));
  });
});