import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ToggleSwitchComponent } from './toggle-switch.component';
import { EventTrackingService } from '../../shared/event-tracking.service';
import { ToggleChangeEvent } from '../../shared/toggle.types';

describe('ToggleSwitchComponent', () => {
  let component: ToggleSwitchComponent;
  let fixture: ComponentFixture<ToggleSwitchComponent>;
  let eventTrackingService: EventTrackingService;
  let hostElement: HTMLElement;

  beforeEach(async () => {
    const eventTrackingSpy = {
      trackToggleInit: vi.fn(),
      trackToggleStateChange: vi.fn(),
      trackAnimationComplete: vi.fn(),
      trackKeyboardUsed: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ToggleSwitchComponent],
      providers: [
        { provide: EventTrackingService, useValue: eventTrackingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleSwitchComponent);
    component = fixture.componentInstance;
    eventTrackingService = TestBed.inject(EventTrackingService);
    hostElement = fixture.nativeElement;
  });

  describe('Component Creation and Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default properties', () => {
      expect(component.isChecked).toBe(false);
      expect(component.disabled).toBe(false);
      expect(component.size).toBe('medium');
      expect(component.showLabels).toBe(false);
      expect(component.debounceMs).toBe(50);
    });

    it('should generate component ID if not provided', () => {
      fixture.detectChanges();
      expect(component.componentId).toBeDefined();
      expect(component.componentId!.length).toBeGreaterThan(0);
    });

    it('should track initialization event', () => {
      component.componentId = 'test-toggle';
      fixture.detectChanges();
      expect(eventTrackingService.trackToggleInit).toHaveBeenCalledWith('test-toggle', false);
    });

    it('should set minimum touch target size', () => {
      fixture.detectChanges();
      const computedStyle = getComputedStyle(hostElement);
      expect(parseInt(computedStyle.minWidth)).toBe(44);
      expect(parseInt(computedStyle.minHeight)).toBe(44);
    });
  });

  describe('ARIA and Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have correct ARIA attributes', () => {
      expect(hostElement.getAttribute('role')).toBe('switch');
      expect(hostElement.getAttribute('tabindex')).toBe('0');
      expect(hostElement.getAttribute('aria-checked')).toBe('false');
      expect(hostElement.getAttribute('aria-disabled')).toBe('false');
    });

    it('should update aria-checked when state changes', () => {
      component.isChecked = true;
      fixture.detectChanges();
      expect(hostElement.getAttribute('aria-checked')).toBe('true');
    });

    it('should update aria-disabled when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      expect(hostElement.getAttribute('aria-disabled')).toBe('true');
    });

    it('should handle Space key press', () => {
      vi.spyOn(component.change, 'emit');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');

      hostElement.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(eventTrackingService.trackKeyboardUsed).toHaveBeenCalledWith(component.componentId!, ' ');
    });

    it('should handle Enter key press', () => {
      vi.spyOn(component.change, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      hostElement.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(eventTrackingService.trackKeyboardUsed).toHaveBeenCalledWith(component.componentId!, 'Enter');
    });

    it('should ignore other keys', () => {
      vi.spyOn(component.change, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      vi.spyOn(event, 'preventDefault');

      hostElement.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.change.emit).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle state on click', fakeAsync(() => {
      vi.spyOn(component.change, 'emit');

      hostElement.click();
      tick(component.debounceMs);

      expect(component.isChecked).toBe(true);
      expect(component.change.emit).toHaveBeenCalledWith({
        checked: true,
        trigger: 'user'
      });
      expect(eventTrackingService.trackToggleStateChange).toHaveBeenCalledWith(
        component.componentId!,
        true,
        'user'
      );
    }));

    it('should not toggle when disabled', () => {
      component.disabled = true;
      vi.spyOn(component.change, 'emit');

      hostElement.click();

      expect(component.isChecked).toBe(false);
      expect(component.change.emit).not.toHaveBeenCalled();
    });

    it('should not toggle when animating', () => {
      component.isAnimating = true;
      vi.spyOn(component.change, 'emit');

      hostElement.click();

      expect(component.change.emit).not.toHaveBeenCalled();
    });

    it('should debounce rapid clicks', fakeAsync(() => {
      vi.spyOn(component.change, 'emit');

      // Click multiple times rapidly
      hostElement.click();
      hostElement.click();
      hostElement.click();

      // Should not emit immediately
      expect(component.change.emit).not.toHaveBeenCalled();

      // After debounce period, should emit once
      tick(component.debounceMs);
      expect(component.change.emit).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Visual States and CSS Classes', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should apply size classes correctly', () => {
      component.size = 'small';
      fixture.detectChanges();
      expect(hostElement.classList.contains('toggle--small')).toBe(true);

      component.size = 'large';
      fixture.detectChanges();
      expect(hostElement.classList.contains('toggle--large')).toBe(true);
    });

    it('should apply checked class when checked', () => {
      component.isChecked = true;
      fixture.detectChanges();
      expect(hostElement.classList.contains('toggle--checked')).toBe(true);
    });

    it('should apply disabled class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      expect(hostElement.classList.contains('toggle--disabled')).toBe(true);
    });

    it('should show labels when showLabels is true', () => {
      component.showLabels = true;
      fixture.detectChanges();

      const labelsElement = fixture.debugElement.query(By.css('.toggle-labels'));
      expect(labelsElement).toBeTruthy();
    });

    it('should hide labels when showLabels is false', () => {
      component.showLabels = false;
      fixture.detectChanges();

      const labelsElement = fixture.debugElement.query(By.css('.toggle-labels'));
      expect(labelsElement).toBeFalsy();
    });
  });

  describe('ControlValueAccessor Interface', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should implement writeValue correctly', () => {
      const onChangeSpy = vi.fn('onChange');
      component.registerOnChange(onChangeSpy);

      component.writeValue(true);

      expect(component.isChecked).toBe(true);
      expect(onChangeSpy).toHaveBeenCalledWith(true);
    });

    it('should not trigger change if value is the same', () => {
      const onChangeSpy = vi.fn('onChange');
      component.registerOnChange(onChangeSpy);

      component.writeValue(false); // Same as default

      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should register onChange callback', () => {
      const callback = vi.fn('onChange');
      component.registerOnChange(callback);

      // Trigger a change
      component.writeValue(true);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should register onTouched callback', fakeAsync(() => {
      const callback = vi.fn('onTouched');
      component.registerOnTouched(callback);

      hostElement.click();
      tick(component.debounceMs);

      expect(callback).toHaveBeenCalled();
    }));

    it('should handle setDisabledState', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);
    });
  });

  describe('Animation Behavior', () => {
    beforeEach(() => {
      fixture.detectChanges();
      // Mock performance.now for consistent timing
      vi.spyOn(window.performance, 'now').and.returnValues(0, 300);
    });

    it('should track animation completion', fakeAsync(() => {
      // Mock matchMedia to return false (motion not reduced)
      vi.spyOn(window, 'matchMedia').and.returnValue({
        matches: false
      } as MediaQueryList);

      hostElement.click();
      tick(component.debounceMs);

      expect(component.isAnimating).toBe(true);

      tick(300); // Animation duration

      expect(component.isAnimating).toBe(false);
      expect(eventTrackingService.trackAnimationComplete).toHaveBeenCalledWith(
        component.componentId!,
        300
      );
    }));

    it('should skip animation when prefers-reduced-motion is true', fakeAsync(() => {
      // Mock matchMedia to return true (motion reduced)
      vi.spyOn(window, 'matchMedia').and.returnValue({
        matches: true
      } as MediaQueryList);

      hostElement.click();
      tick(component.debounceMs);

      expect(component.isAnimating).toBe(false);
      expect(eventTrackingService.trackAnimationComplete).not.toHaveBeenCalled();
    }));
  });

  describe('Performance Requirements', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render within 50ms', () => {
      const startTime = performance.now();

      // Force change detection and rendering
      component.isChecked = true;
      fixture.detectChanges();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('should complete animation within 300ms target', fakeAsync(() => {
      vi.spyOn(window, 'matchMedia').and.returnValue({
        matches: false
      } as MediaQueryList);

      hostElement.click();
      tick(component.debounceMs);

      expect(component.isAnimating).toBe(true);

      tick(300);

      expect(component.isAnimating).toBe(false);
    }));
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clean up subscriptions on destroy', () => {
      vi.spyOn(component['destroy$'], 'next');
      vi.spyOn(component['destroy$'], 'complete');

      fixture.destroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should clear debounce timer on destroy', () => {
      // Start a debounce
      hostElement.click();
      expect(component['debounceTimer']).toBeDefined();

      vi.spyOn(window, 'clearTimeout');
      fixture.destroy();

      expect(clearTimeout).toHaveBeenCalled();
    });
  });
});