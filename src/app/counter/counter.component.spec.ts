import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { vi } from 'vitest';

import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize count to 0', () => {
    expect(component.countValue()).toBe(0);
  });

  it('should display initial count value in template', () => {
    const countDisplay = compiled.querySelector('.count-value');
    expect(countDisplay?.textContent?.trim()).toBe('0');
  });

  describe('Increment functionality', () => {
    it('should increment count when increment button is clicked', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;
      incrementButton.click();
      fixture.detectChanges();

      expect(component.countValue()).toBe(1);
    });

    it('should update display when count is incremented', () => {
      component.increment();
      fixture.detectChanges();

      const countDisplay = compiled.querySelector('.count-value');
      expect(countDisplay?.textContent?.trim()).toBe('1');
    });

    it('should emit countChanged event when incremented', () => {
      vi.spyOn(component.countChanged, 'emit');
      component.increment();

      expect(component.countChanged.emit).toHaveBeenCalledWith(1);
    });

    it('should handle multiple increments correctly', () => {
      component.increment();
      component.increment();
      component.increment();

      expect(component.countValue()).toBe(3);
    });
  });

  describe('Decrement functionality', () => {
    it('should decrement count when decrement button is clicked', () => {
      const decrementButton = compiled.querySelector('.counter-button--decrement') as HTMLButtonElement;
      decrementButton.click();
      fixture.detectChanges();

      expect(component.countValue()).toBe(-1);
    });

    it('should allow negative values', () => {
      component.decrement();
      component.decrement();

      expect(component.countValue()).toBe(-2);
    });

    it('should update display with negative values', () => {
      component.decrement();
      fixture.detectChanges();

      const countDisplay = compiled.querySelector('.count-value');
      expect(countDisplay?.textContent?.trim()).toBe('-1');
    });

    it('should emit countChanged event when decremented', () => {
      vi.spyOn(component.countChanged, 'emit');
      component.decrement();

      expect(component.countChanged.emit).toHaveBeenCalledWith(-1);
    });
  });

  describe('Reset functionality', () => {
    it('should reset count to 0 from positive value', () => {
      component.increment();
      component.increment();
      component.reset();

      expect(component.countValue()).toBe(0);
    });

    it('should reset count to 0 from negative value', () => {
      component.decrement();
      component.decrement();
      component.reset();

      expect(component.countValue()).toBe(0);
    });

    it('should reset count when reset button is clicked', () => {
      component.increment();
      const resetButton = compiled.querySelector('.counter-button--reset') as HTMLButtonElement;
      resetButton.click();
      fixture.detectChanges();

      expect(component.countValue()).toBe(0);
    });

    it('should emit countChanged event when reset', () => {
      component.increment();
      vi.spyOn(component.countChanged, 'emit');
      component.reset();

      expect(component.countChanged.emit).toHaveBeenCalledWith(0);
    });
  });

  describe('Accessibility features', () => {
    it('should have proper ARIA live region', () => {
      const liveRegion = compiled.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });

    it('should have proper ARIA labels on buttons', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment');
      const decrementButton = compiled.querySelector('.counter-button--decrement');
      const resetButton = compiled.querySelector('.counter-button--reset');

      expect(incrementButton?.getAttribute('aria-label')).toBe('Increase count by one');
      expect(decrementButton?.getAttribute('aria-label')).toBe('Decrease count by one');
      expect(resetButton?.getAttribute('aria-label')).toBe('Reset count to zero');
    });

    it('should have proper aria-describedby attributes', () => {
      const buttons = compiled.querySelectorAll('.counter-button');
      buttons.forEach(button => {
        expect(button.getAttribute('aria-describedby')).toBe('count-value');
      });
    });

    it('should have visually hidden text for screen readers', () => {
      const visuallyHidden = compiled.querySelectorAll('.visually-hidden');
      expect(visuallyHidden.length).toBeGreaterThan(0);
    });

    it('should have proper role attributes', () => {
      const container = compiled.querySelector('.counter-container');
      const buttonGroup = compiled.querySelector('.button-group');

      expect(container?.getAttribute('role')).toBe('main');
      expect(buttonGroup?.getAttribute('role')).toBe('group');
    });
  });

  describe('Keyboard navigation', () => {
    it('should have buttons that can be focused for keyboard navigation', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;
      const decrementButton = compiled.querySelector('.counter-button--decrement') as HTMLButtonElement;
      const resetButton = compiled.querySelector('.counter-button--reset') as HTMLButtonElement;

      // Buttons should be focusable
      expect(incrementButton.tabIndex).not.toBe(-1);
      expect(decrementButton.tabIndex).not.toBe(-1);
      expect(resetButton.tabIndex).not.toBe(-1);
    });

    it('should work with simulated keyboard activation', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;

      // Focus the button
      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);

      // Simulate Enter key triggering click (native button behavior)
      incrementButton.click();
      fixture.detectChanges();

      expect(component.countValue()).toBe(1);
    });

    it('should maintain proper button types for native keyboard handling', () => {
      const buttons = compiled.querySelectorAll('.counter-button');

      buttons.forEach(button => {
        expect(button.getAttribute('type')).toBe('button');
      });
    });
  });

  describe('Edge cases and rapid clicking', () => {
    it('should handle rapid clicking without state inconsistencies', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment') as HTMLButtonElement;

      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        incrementButton.click();
      }
      fixture.detectChanges();

      expect(component.countValue()).toBe(10);
    });

    it('should handle large positive numbers', () => {
      // Set a large number
      for (let i = 0; i < 1000; i++) {
        component.increment();
      }

      expect(component.countValue()).toBe(1000);

      const countDisplay = compiled.querySelector('.count-value');
      fixture.detectChanges();
      expect(countDisplay?.textContent?.trim()).toBe('1000');
    });

    it('should handle large negative numbers', () => {
      // Set a large negative number
      for (let i = 0; i < 1000; i++) {
        component.decrement();
      }

      expect(component.countValue()).toBe(-1000);

      const countDisplay = compiled.querySelector('.count-value');
      fixture.detectChanges();
      expect(countDisplay?.textContent?.trim()).toBe('-1000');
    });

    it('should maintain layout with very large numbers', () => {
      // Set a very large number to test layout
      for (let i = 0; i < 10000; i++) {
        component.increment();
      }
      fixture.detectChanges();

      const countDisplay = compiled.querySelector('.count-value') as HTMLElement;
      // In test environment, check that element exists and has content rather than dimensions
      expect(countDisplay).toBeTruthy();
      expect(countDisplay.textContent?.trim()).toBe('10000');
      expect(countDisplay.style.display).not.toBe('none');
    });
  });

  describe('Signal reactivity', () => {
    it('should use signals for state management', () => {
      expect(typeof component.countValue).toBe('function');
    });

    it('should automatically update template when signal changes', () => {
      component.increment();
      fixture.detectChanges();

      const countDisplay = compiled.querySelector('.count-value');
      expect(countDisplay?.textContent?.trim()).toBe('1');

      component.increment();
      fixture.detectChanges();

      expect(countDisplay?.textContent?.trim()).toBe('2');
    });
  });

  describe('Component structure', () => {
    it('should be a standalone component', () => {
      expect(CounterComponent).toBeDefined();
      // Verify it's not using NgModule by checking it has the standalone property
      expect((CounterComponent as any).ɵcmp?.standalone).toBe(true);
    });

    it('should have all required buttons', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment');
      const decrementButton = compiled.querySelector('.counter-button--decrement');
      const resetButton = compiled.querySelector('.counter-button--reset');

      expect(incrementButton).toBeTruthy();
      expect(decrementButton).toBeTruthy();
      expect(resetButton).toBeTruthy();
    });

    it('should have proper button text content', () => {
      const incrementButton = compiled.querySelector('.counter-button--increment .button-text');
      const decrementButton = compiled.querySelector('.counter-button--decrement .button-text');
      const resetButton = compiled.querySelector('.counter-button--reset .button-text');

      expect(incrementButton?.textContent?.trim()).toBe('+');
      expect(decrementButton?.textContent?.trim()).toBe('-');
      expect(resetButton?.textContent?.trim()).toBe('Reset');
    });
  });
});