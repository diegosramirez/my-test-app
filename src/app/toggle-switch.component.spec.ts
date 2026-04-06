import 'zone.js/testing';
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ToggleSwitchComponent } from './toggle-switch.component';
import { vi, beforeAll } from 'vitest';

// Mock matchMedia globally for all tests
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ToggleSwitchComponent', () => {
  let component: ToggleSwitchComponent;
  let fixture: ComponentFixture<ToggleSwitchComponent>;
  let toggleButton: DebugElement;
  let buttonElement: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleSwitchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleSwitchComponent);
    component = fixture.componentInstance;
    toggleButton = fixture.debugElement.query(By.css('.toggle-switch'));
    buttonElement = toggleButton.nativeElement;
    fixture.detectChanges();
  });

  describe('Basic functionality', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.checked).toBe(false);
      expect(component.disabled).toBe(false);
      expect(component.ariaLabel).toBe('Toggle switch');
      expect(component.size).toBe('medium');
    });

    it('should emit checkedChange event when clicked', async () => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      buttonElement.click();
      await new Promise(resolve => setTimeout(resolve, component.animationDuration));

      expect(component.checked).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('should toggle state correctly', fakeAsync(() => {
      expect(component.checked).toBe(false);

      component.toggle();
      tick(component.animationDuration);
      expect(component.checked).toBe(true);

      // Wait for animation to complete before second toggle
      component.toggle();
      tick(component.animationDuration);
      expect(component.checked).toBe(false);
    }));
  });

  describe('Keyboard navigation', () => {
    it('should toggle on Space key press', fakeAsync(() => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      const event = new KeyboardEvent('keydown', { key: ' ' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);
      tick(component.animationDuration);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(component.checked).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(true);
    }));

    it('should toggle on Enter key press', fakeAsync(() => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);
      tick(component.animationDuration);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(component.checked).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(true);
    }));

    it('should not toggle on other key presses', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      buttonElement.dispatchEvent(event);

      expect(component.checked).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should have visible focus indicator', () => {
      buttonElement.focus();
      fixture.detectChanges();

      // Focus styles are applied via CSS, this verifies the element can receive focus
      expect(document.activeElement).toBe(buttonElement);
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      expect(buttonElement.getAttribute('role')).toBe('switch');
      expect(buttonElement.getAttribute('aria-checked')).toBe('false');
      expect(buttonElement.getAttribute('aria-label')).toBe('Toggle switch');
      expect(buttonElement.getAttribute('aria-disabled')).toBe('false');
    });

    it('should update aria-checked when state changes', fakeAsync(() => {
      component.checked = true;
      fixture.detectChanges();
      tick();

      expect(buttonElement.getAttribute('aria-checked')).toBe('true');
    }));

    it('should set aria-disabled when disabled', fakeAsync(() => {
      component.disabled = true;
      fixture.detectChanges();
      tick();

      expect(buttonElement.getAttribute('aria-disabled')).toBe('true');
    }));

    it('should use custom aria-label', fakeAsync(() => {
      component.ariaLabel = 'Enable notifications';
      fixture.detectChanges();
      tick();

      expect(buttonElement.getAttribute('aria-label')).toBe('Enable notifications');
    }));
  });

  describe('Animation and debouncing', () => {
    it('should ignore rapid clicks during animation', fakeAsync(() => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      // First click
      component.toggle();
      expect(component.checked).toBe(true);

      // Rapid second click during animation
      component.toggle();
      expect(component.checked).toBe(true); // Should remain true

      tick(component.animationDuration);
      expect(emitSpy).toHaveBeenCalledTimes(1);
    }));

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Create new component instance with reduced motion
      fixture = TestBed.createComponent(ToggleSwitchComponent);
      component = fixture.componentInstance;

      expect(component.animationDuration).toBe(50);
    });

    it('should clean up animation timeout on destroy', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      component.toggle();
      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Disabled state', () => {
    beforeEach(fakeAsync(() => {
      component.disabled = true;
      fixture.detectChanges();
      tick();
    }));

    it('should not toggle when disabled', () => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      component.toggle();

      expect(component.checked).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not respond to keyboard when disabled', () => {
      const emitSpy = vi.spyOn(component.checkedChange, 'emit');

      const event = new KeyboardEvent('keydown', { key: ' ' });
      component.onKeyDown(event);

      expect(component.checked).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should have disabled styling', () => {
      expect(buttonElement.disabled).toBe(true);
      expect(buttonElement.classList.contains('disabled')).toBe(true);
    });
  });

  describe('Size variants', () => {
    it('should apply small size class', fakeAsync(() => {
      component.size = 'small';
      fixture.detectChanges();
      tick();

      expect(buttonElement.classList.contains('toggle-small')).toBe(true);
    }));

    it('should apply medium size class', fakeAsync(() => {
      component.size = 'medium';
      fixture.detectChanges();
      tick();

      expect(buttonElement.classList.contains('toggle-medium')).toBe(true);
    }));

    it('should apply large size class', fakeAsync(() => {
      component.size = 'large';
      fixture.detectChanges();
      tick();

      expect(buttonElement.classList.contains('toggle-large')).toBe(true);
    }));
  });

  describe('Touch target accessibility', () => {
    it('should have minimum 44px touch target', () => {
      const computedStyle = getComputedStyle(buttonElement);
      const width = parseInt(computedStyle.minWidth, 10);
      const height = parseInt(computedStyle.minHeight, 10);

      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Public methods', () => {
    it('should focus the button element', () => {
      const focusSpy = vi.spyOn(buttonElement, 'focus');

      component.focus();

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should handle focus when button element is not available', () => {
      component.toggleButton = undefined as any;

      expect(() => component.focus()).not.toThrow();
    });
  });

  describe('CSS classes', () => {
    it('should apply checked class when checked', fakeAsync(() => {
      component.checked = true;
      fixture.detectChanges();
      tick();

      expect(buttonElement.classList.contains('checked')).toBe(true);
    }));

    it('should apply animating class during animation', fakeAsync(() => {
      component.toggle();
      fixture.detectChanges();

      expect(buttonElement.classList.contains('animating')).toBe(true);

      tick(component.animationDuration);
      fixture.detectChanges();

      expect(buttonElement.classList.contains('animating')).toBe(false);
    }));
  });
});