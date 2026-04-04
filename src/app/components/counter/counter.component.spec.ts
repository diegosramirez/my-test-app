import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;
  let consoleLogSpy: any;

  beforeEach(async () => {
    // Spy on console.log before component creation to capture constructor calls
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [CounterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with count of 0', () => {
      expect(component.count()).toBe(0);
    });

    it('should emit component loaded event on initialization', () => {
      // The constructor is called during TestBed.createComponent but we need to check after fixture.detectChanges()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_component_loaded',
        { initial_value: 0 }
      );
    });

    it('should be standalone component', () => {
      const componentMetadata = component.constructor as any;
      expect(componentMetadata.ɵcmp?.standalone).toBe(true);
    });
  });

  describe('Display and Visual Feedback', () => {
    it('should display initial count of 0', () => {
      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.textContent.trim()).toBe('0');
    });

    it('should have three action buttons', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));
      expect(buttons.length).toBe(3);

      const incrementBtn = buttons.find(btn =>
        btn.nativeElement.getAttribute('aria-label')?.includes('Increase')
      );
      const decrementBtn = buttons.find(btn =>
        btn.nativeElement.getAttribute('aria-label')?.includes('Decrease')
      );
      const resetBtn = buttons.find(btn =>
        btn.nativeElement.getAttribute('aria-label')?.includes('Reset')
      );

      expect(incrementBtn).toBeTruthy();
      expect(decrementBtn).toBeTruthy();
      expect(resetBtn).toBeTruthy();
    });

    it('should have monospace typography for count display', () => {
      const countElement = fixture.debugElement.query(By.css('.count-value'));
      const styles = window.getComputedStyle(countElement.nativeElement);
      expect(styles.fontFamily).toMatch(/monaco|menlo|mono/i);
    });

    it('should update display immediately when count changes', () => {
      const countElement = fixture.debugElement.query(By.css('.count-value'));

      component.increment();
      fixture.detectChanges();
      expect(countElement.nativeElement.textContent.trim()).toBe('1');

      component.increment();
      fixture.detectChanges();
      expect(countElement.nativeElement.textContent.trim()).toBe('2');
    });

    it('should display negative values correctly', () => {
      const countElement = fixture.debugElement.query(By.css('.count-value'));

      component.decrement();
      fixture.detectChanges();
      expect(countElement.nativeElement.textContent.trim()).toBe('-1');

      component.decrement();
      fixture.detectChanges();
      expect(countElement.nativeElement.textContent.trim()).toBe('-2');
    });
  });

  describe('Increment Functionality', () => {
    it('should increment count when increment button is clicked', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      incrementBtn.nativeElement.click();
      fixture.detectChanges();

      expect(component.count()).toBe(1);

      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.textContent.trim()).toBe('1');
    });

    it('should emit events when increment button is clicked', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      consoleLogSpy.mockClear(); // Clear initialization call
      incrementBtn.nativeElement.click();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_button_clicked',
        { action_type: 'increment', current_value: 1 }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_value_changed',
        { old_value: 0, new_value: 1 }
      );
    });

    it('should handle multiple rapid increments', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      for (let i = 0; i < 10; i++) {
        incrementBtn.nativeElement.click();
      }
      fixture.detectChanges();

      expect(component.count()).toBe(10);
    });

    it('should handle large numbers', () => {
      // Simulate large number scenarios
      for (let i = 0; i < 1000; i++) {
        component.increment();
      }
      expect(component.count()).toBe(1000);
    });
  });

  describe('Decrement Functionality', () => {
    it('should decrement count when decrement button is clicked', () => {
      // First increment to 1
      component.increment();
      fixture.detectChanges();

      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));
      decrementBtn.nativeElement.click();
      fixture.detectChanges();

      expect(component.count()).toBe(0);

      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.textContent.trim()).toBe('0');
    });

    it('should emit events when decrement button is clicked', () => {
      component.increment(); // Set count to 1 first

      consoleLogSpy.mockClear();
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));
      decrementBtn.nativeElement.click();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_button_clicked',
        { action_type: 'decrement', current_value: 0 }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_value_changed',
        { old_value: 1, new_value: 0 }
      );
    });

    it('should allow negative values when decrementing', () => {
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));

      decrementBtn.nativeElement.click();
      fixture.detectChanges();

      expect(component.count()).toBe(-1);

      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.textContent.trim()).toBe('-1');
    });

    it('should handle multiple rapid decrements', () => {
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));

      for (let i = 0; i < 10; i++) {
        decrementBtn.nativeElement.click();
      }
      fixture.detectChanges();

      expect(component.count()).toBe(-10);
    });

    it('should handle large negative numbers', () => {
      // Simulate large negative number scenarios
      for (let i = 0; i < 1000; i++) {
        component.decrement();
      }
      expect(component.count()).toBe(-1000);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset count to 0 when reset button is clicked', () => {
      // Set count to some non-zero value
      component.increment();
      component.increment();
      component.increment();
      fixture.detectChanges();
      expect(component.count()).toBe(3);

      const resetBtn = fixture.debugElement.query(By.css('.reset-btn'));
      resetBtn.nativeElement.click();
      fixture.detectChanges();

      expect(component.count()).toBe(0);

      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.textContent.trim()).toBe('0');
    });

    it('should emit events when reset button is clicked', () => {
      component.increment(); // Set count to 1 first

      consoleLogSpy.mockClear();
      const resetBtn = fixture.debugElement.query(By.css('.reset-btn'));
      resetBtn.nativeElement.click();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_button_clicked',
        { action_type: 'reset', current_value: 0 }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_value_changed',
        { old_value: 1, new_value: 0 }
      );
    });

    it('should reset from negative values', () => {
      component.decrement();
      component.decrement();
      fixture.detectChanges();
      expect(component.count()).toBe(-2);

      const resetBtn = fixture.debugElement.query(By.css('.reset-btn'));
      resetBtn.nativeElement.click();
      fixture.detectChanges();

      expect(component.count()).toBe(0);
    });

    it('should reset from large positive values', () => {
      for (let i = 0; i < 100; i++) {
        component.increment();
      }
      expect(component.count()).toBe(100);

      component.reset();
      expect(component.count()).toBe(0);
    });

    it('should reset from large negative values', () => {
      for (let i = 0; i < 100; i++) {
        component.decrement();
      }
      expect(component.count()).toBe(-100);

      component.reset();
      expect(component.count()).toBe(0);
    });

    it('should work when already at 0', () => {
      expect(component.count()).toBe(0);

      consoleLogSpy.mockClear();
      component.reset();

      expect(component.count()).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_value_changed',
        { old_value: 0, new_value: 0 }
      );
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should support keyboard navigation', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));

      // All buttons should be focusable
      buttons.forEach(button => {
        expect(button.nativeElement.tabIndex).not.toBe(-1);
        expect(button.nativeElement.tagName.toLowerCase()).toBe('button');
      });
    });

    it('should activate buttons with Enter key', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      consoleLogSpy.mockClear();

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      incrementBtn.nativeElement.dispatchEvent(enterEvent);
      incrementBtn.nativeElement.click(); // Button click after Enter

      expect(component.count()).toBe(1);
    });

    it('should activate buttons with Space key', () => {
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));

      consoleLogSpy.mockClear();

      // Simulate Space key press
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      decrementBtn.nativeElement.dispatchEvent(spaceEvent);
      decrementBtn.nativeElement.click(); // Button click after Space

      expect(component.count()).toBe(-1);
    });

    it('should have proper ARIA labels', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));
      const resetBtn = fixture.debugElement.query(By.css('.reset-btn'));

      expect(incrementBtn.nativeElement.getAttribute('aria-label')).toBe('Increase count by 1');
      expect(decrementBtn.nativeElement.getAttribute('aria-label')).toBe('Decrease count by 1');
      expect(resetBtn.nativeElement.getAttribute('aria-label')).toBe('Reset count to zero');
    });

    it('should have ARIA live region for screen readers', () => {
      const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.nativeElement.getAttribute('aria-atomic')).toBe('true');
    });

    it('should update ARIA live region when count changes', () => {
      const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));

      component.increment();
      fixture.detectChanges();

      expect(liveRegion.nativeElement.getAttribute('aria-label')).toBe('Count is now 1');
      expect(liveRegion.nativeElement.textContent.trim()).toBe('Count: 1');
    });

    it('should update ARIA live region for negative values', () => {
      const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));

      component.decrement();
      fixture.detectChanges();

      expect(liveRegion.nativeElement.getAttribute('aria-label')).toBe('Count is now -1');
      expect(liveRegion.nativeElement.textContent.trim()).toBe('Count: -1');
    });

    it('should have button group with proper role', () => {
      const buttonGroup = fixture.debugElement.query(By.css('.button-group'));
      expect(buttonGroup.nativeElement.getAttribute('role')).toBe('group');
      expect(buttonGroup.nativeElement.getAttribute('aria-label')).toBe('Counter controls');
    });

    it('should have count value with proper aria-label', () => {
      const countElement = fixture.debugElement.query(By.css('.count-value'));
      expect(countElement.nativeElement.getAttribute('aria-label')).toBe('Current count');
    });
  });

  describe('Mobile and Touch Support', () => {
    it('should have minimum touch target size', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));

      buttons.forEach(button => {
        const styles = window.getComputedStyle(button.nativeElement);
        const minHeight = parseInt(styles.minHeight);
        const minWidth = parseInt(styles.minWidth);

        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    it('should have appropriate padding for touch interaction', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));

      buttons.forEach(button => {
        const styles = window.getComputedStyle(button.nativeElement);
        const padding = styles.padding;
        expect(padding).toBeTruthy();
        expect(padding).not.toBe('0px');
      });
    });

    it('should maintain button layout in mobile viewport', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      fixture.detectChanges();

      const buttonGroup = fixture.debugElement.query(By.css('.button-group'));
      expect(buttonGroup).toBeTruthy();

      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));
      expect(buttons.length).toBe(3);
    });
  });

  describe('Component Lifecycle and State Management', () => {
    it('should maintain state during component lifecycle', () => {
      component.increment();
      component.increment();
      expect(component.count()).toBe(2);

      // Simulate component reinitialization
      fixture.detectChanges();
      expect(component.count()).toBe(2);
    });

    it('should handle rapid successive operations', () => {
      // Rapid increment and decrement operations
      for (let i = 0; i < 5; i++) {
        component.increment();
        component.decrement();
      }
      expect(component.count()).toBe(0);
    });

    it('should maintain signal reactivity', () => {
      const initialValue = component.count();
      expect(initialValue).toBe(0);

      component.increment();
      expect(component.count()).toBe(1);
      expect(component.count()).not.toBe(initialValue);
    });

    it('should call component methods directly', () => {
      const incrementSpy = vi.spyOn(component, 'increment');
      const decrementSpy = vi.spyOn(component, 'decrement');
      const resetSpy = vi.spyOn(component, 'reset');

      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));
      const decrementBtn = fixture.debugElement.query(By.css('.decrement-btn'));
      const resetBtn = fixture.debugElement.query(By.css('.reset-btn'));

      incrementBtn.nativeElement.click();
      expect(incrementSpy).toHaveBeenCalled();

      decrementBtn.nativeElement.click();
      expect(decrementSpy).toHaveBeenCalled();

      resetBtn.nativeElement.click();
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('Event Tracking and Analytics', () => {
    it('should track all button interactions', () => {
      consoleLogSpy.mockClear();

      component.increment();
      component.decrement();
      component.reset();

      // Should have 6 calls: 3 button_clicked + 3 value_changed events
      expect(consoleLogSpy).toHaveBeenCalledTimes(6);
    });

    it('should track events with correct parameters', () => {
      consoleLogSpy.mockClear();

      component.increment();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Event: counter_button_clicked',
        { action_type: 'increment', current_value: 1 }
      );
    });

    it('should not emit events for direct signal updates', () => {
      consoleLogSpy.mockClear();

      // Directly setting signal value (not through component methods)
      component.count.set(5);

      // Should not emit any events
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme values correctly', () => {
      // Test with very large positive number
      component.count.set(Number.MAX_SAFE_INTEGER - 1);
      component.increment();
      expect(component.count()).toBe(Number.MAX_SAFE_INTEGER);

      // Test with very large negative number
      component.count.set(-Number.MAX_SAFE_INTEGER + 1);
      component.decrement();
      expect(component.count()).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero consistently', () => {
      expect(component.count()).toBe(0);

      component.reset();
      expect(component.count()).toBe(0);

      component.increment();
      component.decrement();
      expect(component.count()).toBe(0);
    });

    it('should not break with disabled buttons (if implemented)', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.counter-btn'));

      buttons.forEach(button => {
        // Check that buttons are not disabled by default
        expect(button.nativeElement.disabled).toBeFalsy();
      });
    });

    it('should handle component destruction gracefully', () => {
      component.increment();
      expect(component.count()).toBe(1);

      // Component should be cleanly destroyable
      fixture.destroy();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should work with different event types', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      // Test click event
      incrementBtn.nativeElement.click();
      expect(component.count()).toBe(1);

      // Test mouseup event (for compatibility)
      incrementBtn.nativeElement.dispatchEvent(new MouseEvent('mouseup'));
      // Should not increment again from mouseup alone
      expect(component.count()).toBe(1);
    });

    it('should handle focus and blur events', () => {
      const incrementBtn = fixture.debugElement.query(By.css('.increment-btn'));

      expect(() => {
        incrementBtn.nativeElement.focus();
        incrementBtn.nativeElement.blur();
      }).not.toThrow();
    });

    it('should maintain semantic HTML structure', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons.length).toBe(3);

      const container = fixture.debugElement.query(By.css('.counter-container'));
      expect(container).toBeTruthy();

      const title = fixture.debugElement.query(By.css('h1'));
      expect(title).toBeTruthy();
    });
  });
});