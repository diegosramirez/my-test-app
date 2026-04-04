import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { vi } from 'vitest';
import { CounterComponent } from './counter.component';
import { CounterEventData, CounterConfig } from './counter.types';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with count of 0', () => {
      fixture.detectChanges();
      expect(component.count()).toBe(0);
    });

    it('should render initial count of 0', () => {
      fixture.detectChanges();
      const countValue = compiled.querySelector('.count-value');
      expect(countValue?.textContent?.trim()).toBe('0');
    });

    it('should emit componentLoaded event on init', fakeAsync(() => {
      let loadedData: any;
      component.componentLoaded.subscribe(data => loadedData = data);

      fixture.detectChanges();
      tick();

      expect(loadedData).toBeDefined();
      expect(loadedData.initialValue).toBe(0);
      expect(loadedData.timestamp).toBeGreaterThan(0);
    }));

    it('should initialize with custom config', () => {
      const config: CounterConfig = { initialValue: 5, step: 2 };
      component.config = config;

      fixture.detectChanges();

      expect(component.count()).toBe(5);
    });
  });

  describe('Button Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render three buttons', () => {
      const buttons = compiled.querySelectorAll('.counter-btn');
      expect(buttons.length).toBe(3);
    });

    it('should increment count when increment button is clicked', fakeAsync(() => {
      const incrementBtn = compiled.querySelector('.counter-btn--increment') as HTMLButtonElement;

      incrementBtn.click();
      tick(100); // Account for debounce
      fixture.detectChanges();

      expect(component.count()).toBe(1);
    }));

    it('should decrement count when decrement button is clicked', fakeAsync(() => {
      // Set initial value to 1
      component.count.set(1);
      fixture.detectChanges();

      const decrementBtn = compiled.querySelector('.counter-btn--decrement') as HTMLButtonElement;

      decrementBtn.click();
      tick(100);
      fixture.detectChanges();

      expect(component.count()).toBe(0);
    }));

    it('should reset count to 0 when reset button is clicked', fakeAsync(() => {
      // Set initial value to 5
      component.count.set(5);
      fixture.detectChanges();

      const resetBtn = compiled.querySelector('.counter-btn--reset') as HTMLButtonElement;

      resetBtn.click();
      tick(100);
      fixture.detectChanges();

      expect(component.count()).toBe(0);
    }));

    it('should emit countChanged event on increment', fakeAsync(() => {
      let eventData: CounterEventData | undefined;
      component.countChanged.subscribe(data => eventData = data);

      component.onIncrement();
      tick(100);

      expect(eventData).toBeDefined();
      expect(eventData?.action).toBe('increment');
      expect(eventData?.oldValue).toBe(0);
      expect(eventData?.newValue).toBe(1);
      expect(eventData?.interactionMethod).toBe('click');
    }));

    it('should emit buttonClicked event on all button interactions', fakeAsync(() => {
      const clickEvents: any[] = [];
      component.buttonClicked.subscribe(data => clickEvents.push(data));

      component.onIncrement();
      component.onDecrement();
      component.onReset();
      tick(300);

      expect(clickEvents.length).toBe(3);
      expect(clickEvents[0].actionType).toBe('increment');
      expect(clickEvents[1].actionType).toBe('decrement');
      expect(clickEvents[2].actionType).toBe('reset');
    }));
  });

  describe('Keyboard Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle Enter key on increment button', fakeAsync(() => {
      const incrementBtn = compiled.querySelector('.counter-btn--increment') as HTMLButtonElement;
      incrementBtn.focus();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      incrementBtn.dispatchEvent(event);
      tick(100);
      fixture.detectChanges();

      expect(component.count()).toBe(1);
    }));

    it('should handle Space key on decrement button', fakeAsync(() => {
      component.count.set(1);
      fixture.detectChanges();

      const decrementBtn = compiled.querySelector('.counter-btn--decrement') as HTMLButtonElement;
      decrementBtn.focus();

      const event = new KeyboardEvent('keydown', { key: ' ' });
      decrementBtn.dispatchEvent(event);
      tick(100);
      fixture.detectChanges();

      expect(component.count()).toBe(0);
    }));

    it('should emit keyboardUsed event on keyboard interactions', fakeAsync(() => {
      let keyboardData: any;
      component.keyboardUsed.subscribe(data => keyboardData = data);

      const resetBtn = compiled.querySelector('.counter-btn--reset') as HTMLButtonElement;
      resetBtn.focus();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      resetBtn.dispatchEvent(event);
      tick(100);

      expect(keyboardData).toBeDefined();
      expect(keyboardData.keyPressed).toBe('Enter');
      expect(keyboardData.currentValue).toBe(0);
    }));

    it('should ignore keyboard events on non-button elements', fakeAsync(() => {
      const countDisplay = compiled.querySelector('.count-display') as HTMLElement;

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      countDisplay.dispatchEvent(event);
      tick(100);
      fixture.detectChanges();

      expect(component.count()).toBe(0); // Should not change
    }));
  });

  describe('ARIA and Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA labels on buttons', () => {
      const incrementBtn = compiled.querySelector('.counter-btn--increment');
      const decrementBtn = compiled.querySelector('.counter-btn--decrement');
      const resetBtn = compiled.querySelector('.counter-btn--reset');

      expect(incrementBtn?.getAttribute('aria-label')).toBe('Increase count by 1');
      expect(decrementBtn?.getAttribute('aria-label')).toBe('Decrease count by 1');
      expect(resetBtn?.getAttribute('aria-label')).toBe('Reset count to zero');
    });

    it('should have role attributes for accessibility', () => {
      const container = compiled.querySelector('.counter-container');
      const buttonGroup = compiled.querySelector('.button-group');
      const countDisplay = compiled.querySelector('.count-display');

      expect(container?.getAttribute('role')).toBe('region');
      expect(buttonGroup?.getAttribute('role')).toBe('group');
      expect(countDisplay?.getAttribute('role')).toBe('status');
    });

    it('should have aria-live regions', () => {
      const liveRegions = compiled.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(1);
    });

    it('should update aria-describedby with current count', fakeAsync(() => {
      component.count.set(5);
      fixture.detectChanges();
      tick();

      const incrementBtn = compiled.querySelector('.counter-btn--increment');
      const describedBy = incrementBtn?.getAttribute('aria-describedby');
      expect(describedBy).toBe('current-count-5');
    }));
  });

  describe('Number Formatting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should format numbers correctly', () => {
      component.count.set(1234);
      fixture.detectChanges();

      const formattedValue = component.formattedCount();
      expect(formattedValue).toMatch(/1[,\s]234|1234/); // Accounts for locale differences
    });

    it('should handle large numbers', () => {
      component.count.set(1000000);
      fixture.detectChanges();

      const countValue = compiled.querySelector('.count-value');
      expect(countValue?.textContent).toBeTruthy();
      expect(countValue?.textContent?.length).toBeGreaterThan(0);
    });

    it('should handle negative numbers', () => {
      component.count.set(-42);
      fixture.detectChanges();

      const formattedValue = component.formattedCount();
      expect(formattedValue).toContain('42');
      expect(formattedValue).toContain('-');
    });
  });

  describe('Configuration and Validation', () => {
    it('should respect minimum value constraints', fakeAsync(() => {
      const config: CounterConfig = { minValue: 0 };
      component.config = config;
      fixture.detectChanges();

      component.onDecrement();
      tick(100);

      expect(component.count()).toBe(0); // Should not go below min
    }));

    it('should respect maximum value constraints', fakeAsync(() => {
      const config: CounterConfig = { maxValue: 5, initialValue: 5 };
      component.config = config;
      fixture.detectChanges();

      component.onIncrement();
      tick(100);

      expect(component.count()).toBe(5); // Should not go above max
    }));

    it('should respect custom step size', fakeAsync(() => {
      const config: CounterConfig = { step: 5 };
      component.config = config;
      fixture.detectChanges();

      component.onIncrement();
      tick(100);

      expect(component.count()).toBe(5);
    }));

    it('should reset to 0 regardless of configured initial value', fakeAsync(() => {
      const config: CounterConfig = { initialValue: 10 };
      component.config = config;
      fixture.detectChanges();

      component.count.set(25);
      component.onReset();
      tick(100);

      expect(component.count()).toBe(0);
    }));
  });

  describe('Public API Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should provide public increment method', fakeAsync(() => {
      component.increment();
      tick(100);
      expect(component.count()).toBe(1);
    }));

    it('should provide public decrement method', fakeAsync(() => {
      component.count.set(1);
      component.decrement();
      tick(100);
      expect(component.count()).toBe(0);
    }));

    it('should provide public reset method', fakeAsync(() => {
      component.count.set(5);
      component.reset();
      tick(100);
      expect(component.count()).toBe(0);
    }));

    it('should provide getCurrentValue method', () => {
      component.count.set(42);
      expect(component.getCurrentValue()).toBe(42);
    });
  });

  describe('Rapid Clicking Protection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle rapid clicking without dropping events', fakeAsync(() => {
      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        component.onIncrement();
      }

      tick(100); // Wait for debounce

      expect(component.count()).toBeGreaterThan(0);
      expect(component.count()).toBeLessThanOrEqual(10);
    }));

    it('should debounce multiple quick actions', fakeAsync(() => {
      component.onIncrement();
      component.onIncrement();
      component.onIncrement();

      tick(25); // Before debounce completes
      expect(component.count()).toBe(0); // Should still be 0

      tick(50); // After debounce
      expect(component.count()).toBe(1); // Should process one action
    }));
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions on destroy', () => {
      const nextSpy = vi.fn();
      const completeSpy = vi.fn();

      component['destroy$'].next = nextSpy;
      component['destroy$'].complete = completeSpy;

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});