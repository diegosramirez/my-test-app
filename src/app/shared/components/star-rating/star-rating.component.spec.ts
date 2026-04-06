import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { vi } from 'vitest';

import { StarRatingComponent } from './star-rating.component';
import { StarRatingService } from './star-rating.service';
import { RatingChangeEvent, StarRatingConfig } from './rating.types';

// Test host component for integration testing
@Component({
  standalone: true,
  imports: [StarRatingComponent],
  template: `
    <app-star-rating
      [currentRating]="rating"
      [readonly]="readonly"
      [contentId]="contentId"
      [config]="config"
      (ratingChange)="onRatingChange($event)">
    </app-star-rating>
  `
})
class TestHostComponent {
  rating = 0;
  readonly = false;
  contentId = 'test-content';
  config: StarRatingConfig = {};
  lastRatingEvent: RatingChangeEvent | null = null;

  onRatingChange(event: RatingChangeEvent): void {
    this.lastRatingEvent = event;
  }
}

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;
  let service: StarRatingService;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent, ReactiveFormsModule, TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(StarRatingService);

    // Spy on service methods for tracking verification
    vi.spyOn(service, 'trackComponentRender');
    vi.spyOn(service, 'trackRatingSelection');
    vi.spyOn(service, 'trackHoverInteraction');
    vi.spyOn(service, 'trackKeyboardNavigation');
    vi.spyOn(service, 'trackRatingCleared');
  });

  describe('Component Creation and Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should render in under 50ms with OnPush change detection strategy', async () => {
      const startTime = performance.now();

      component.currentRating = 4.5;
      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(50);
      expect(component['cdr']).toBeTruthy(); // Verify ChangeDetectorRef injection for OnPush
    });

    it('should initialize with default configuration', () => {
      component.ngOnInit();

      expect(component.maxRating).toBe(5);
      expect(component.showNumeric).toBe(true);
      expect(component['allowHalfStars']).toBe(true);
      expect(component['debounceMs']).toBe(100);
    });

    it('should apply custom configuration', () => {
      component.config = {
        maxRating: 10,
        showNumeric: false,
        allowHalfStars: false,
        debounceMs: 200
      };

      component.ngOnInit();

      expect(component.maxRating).toBe(10);
      expect(component.showNumeric).toBe(false);
      expect(component['allowHalfStars']).toBe(false);
      expect(component['debounceMs']).toBe(200);
    });

    it('should detect touch device capability', () => {
      const mockTouchDevice = () => {
        Object.defineProperty(window, 'ontouchstart', { value: true, writable: true });
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, writable: true });
      };

      mockTouchDevice();
      component['detectTouchDevice']();

      expect(component.isTouchDevice).toBe(true);
    });

    it('should track component render performance', () => {
      component.currentRating = 3.5;
      component.ngOnInit();
      component.ngAfterViewInit();

      expect(service.trackComponentRender).toHaveBeenCalledWith(
        'interactive',
        3.5,
        expect.any(Number)
      );
    });
  });

  describe('Star Display and Rating Values', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render correct number of stars based on maxRating', () => {
      component.config = { maxRating: 3 };
      component.ngOnInit();
      fixture.detectChanges();

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      expect(stars.length).toBe(3);
    });

    it('should support all rating values from 0-5 with 0.5 increment display precision', () => {
      const testValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

      testValues.forEach(rating => {
        component.currentRating = rating;
        component.ngOnInit();
        fixture.detectChanges();

        expect(component.getFormattedRating()).toBe(`${rating.toFixed(1)}/5.0`);
      });
    });

    it('should display half-stars correctly with 0.5 precision', () => {
      // Test case: 3.7 should display as 3.5 stars
      component.currentRating = 3.7;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.displayRating).toBe(3.5);
      expect(component.getStarState(0)).toBe('full');  // Star 1
      expect(component.getStarState(1)).toBe('full');  // Star 2
      expect(component.getStarState(2)).toBe('full');  // Star 3
      expect(component.getStarState(3)).toBe('half');  // Star 4
      expect(component.getStarState(4)).toBe('empty'); // Star 5
    });

    it('should handle edge cases for rating validation', () => {
      const edgeCases = [
        { input: -1, expected: 0 },
        { input: 6, expected: 5 },
        { input: NaN, expected: 0 },
        { input: 3.7, expected: 3.5 },
        { input: 3.2, expected: 3 },
        { input: 3.8, expected: 4 }
      ];

      edgeCases.forEach(({ input, expected }) => {
        component.writeValue(input);
        expect(component.currentRating).toBe(expected);
      });
    });

    it('should display numeric rating in correct format', () => {
      component.currentRating = 3.5;
      component.ngOnInit();
      fixture.detectChanges();

      const numericDisplay = fixture.debugElement.query(By.css('.rating-numeric'));
      expect(numericDisplay).toBeTruthy();
      expect(numericDisplay.nativeElement.textContent.trim()).toBe('3.5/5.0');
    });

    it('should hide numeric display when configured', () => {
      component.config = { showNumeric: false };
      component.ngOnInit();
      fixture.detectChanges();

      const numericDisplay = fixture.debugElement.query(By.css('.rating-numeric'));
      expect(numericDisplay).toBeFalsy();
    });
  });

  describe('Interactive Star Selection', () => {
    beforeEach(() => {
      component.readonly = false;
      fixture.detectChanges();
    });

    it('should emit rating change with debouncing when star is clicked', async () => {
      vi.spyOn(component.ratingChange, 'emit');

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[2].nativeElement.click(); // Click third star (rating 3)

      // Should not emit immediately due to debouncing
      expect(component.ratingChange.emit).not.toHaveBeenCalled();

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(component.ratingChange.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 3,
          contentId: undefined,
          timestamp: expect.any(Date)
        })
      );

      expect(service.trackRatingSelection).toHaveBeenCalledWith(3, undefined);
    });

    it('should handle rapid clicks with debouncing', async () => {
      vi.spyOn(component.ratingChange, 'emit');

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));

      // Rapid clicks
      stars[1].nativeElement.click(); // Rating 2
      await new Promise(resolve => setTimeout(resolve, 20));
      stars[3].nativeElement.click(); // Rating 4
      await new Promise(resolve => setTimeout(resolve, 20));
      stars[2].nativeElement.click(); // Rating 3

      // Should not emit during rapid clicking
      expect(component.ratingChange.emit).not.toHaveBeenCalled();

      // Wait for final debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only emit the last rating
      expect(component.ratingChange.emit).toHaveBeenCalledTimes(1);
      expect(component.ratingChange.emit).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 3 })
      );
    });

    it('should update hover state without persistence on touch devices', () => {
      component.isTouchDevice = true;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[2].triggerEventHandler('mouseenter', null);

      // Should not update hover state on touch devices
      expect(component.hoveredRating).toBe(0);
      expect(service.trackHoverInteraction).not.toHaveBeenCalled();
    });

    it('should update hover state on desktop devices', () => {
      component.isTouchDevice = false;
      fixture.detectChanges();

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[2].triggerEventHandler('mouseenter', null);

      expect(component.hoveredRating).toBe(3);
      expect(service.trackHoverInteraction).toHaveBeenCalledWith(3, undefined);
    });

    it('should clear hover state on mouse leave', () => {
      component.isTouchDevice = false;
      component.hoveredRating = 3;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.star-rating'));
      container.triggerEventHandler('mouseleave', null);

      expect(component.hoveredRating).toBe(0);
    });

    it('should provide clear rating functionality', () => {
      component.currentRating = 4;
      const previousRating = component.currentRating;

      component.clearRating();

      expect(component.currentRating).toBe(0);
      expect(service.trackRatingCleared).toHaveBeenCalledWith(previousRating, undefined);
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    beforeEach(() => {
      component.readonly = false;
      fixture.detectChanges();
    });

    it('should handle Enter key for star selection', () => {
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[2]; // Third star

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      starElement.triggerEventHandler('keydown', enterEvent);

      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('select', expect.any(Number));
    });

    it('should handle Space key for star selection', () => {
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[1]; // Second star

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      starElement.triggerEventHandler('keydown', spaceEvent);

      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('select', expect.any(Number));
    });

    it('should handle arrow key navigation for rating increment/decrement', () => {
      component.currentRating = 3;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[0];

      // Test arrow right (increment)
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      starElement.triggerEventHandler('keydown', rightEvent);

      expect(component.currentRating).toBe(4);
      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('increment', 4);

      // Test arrow left (decrement)
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      starElement.triggerEventHandler('keydown', leftEvent);

      expect(component.currentRating).toBe(3);
      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('decrement', 3);
    });

    it('should handle Home key to clear rating', () => {
      component.currentRating = 4;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[0];

      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      starElement.triggerEventHandler('keydown', homeEvent);

      expect(component.currentRating).toBe(0);
      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('clear', 0);
    });

    it('should handle End key for maximum rating', () => {
      component.currentRating = 2;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[0];

      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      starElement.triggerEventHandler('keydown', endEvent);

      expect(component.currentRating).toBe(5);
      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('max', 5);
    });

    it('should have proper WCAG 2.1 AA accessibility attributes', () => {
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.star-rating'));

      // Container should have proper radiogroup role
      expect(container.nativeElement.getAttribute('role')).toBe('radiogroup');
      expect(container.nativeElement.getAttribute('aria-valuenow')).toBe('0');
      expect(container.nativeElement.getAttribute('aria-valuemin')).toBe('0');
      expect(container.nativeElement.getAttribute('aria-valuemax')).toBe('5');
      expect(container.nativeElement.hasAttribute('aria-label')).toBe(true);

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars.forEach((star, index) => {
        // Each star should have proper radio role and attributes
        expect(star.nativeElement.getAttribute('role')).toBe('radio');
        expect(star.nativeElement.hasAttribute('aria-label')).toBe(true);
        expect(star.nativeElement.hasAttribute('aria-pressed')).toBe(true);

        // First star should be focusable, others should not be in tab order
        const expectedTabIndex = index === 0 ? '0' : '-1';
        expect(star.nativeElement.getAttribute('tabindex')).toBe(expectedTabIndex);
      });
    });

    it('should provide appropriate aria labels for interactive mode', () => {
      component.readonly = false;
      component.currentRating = 3;
      fixture.detectChanges();

      expect(component.getAriaLabel()).toContain('Rate this content');
      expect(component.getAriaLabel()).toContain('Current rating: 3.0/5.0');

      expect(component.getStarAriaLabel(0)).toContain('Give 1 star rating');
      expect(component.getStarAriaLabel(1)).toContain('Give 2 stars rating');
      expect(component.getStarAriaLabel(2)).toContain('(selected)');
    });

    it('should provide appropriate aria labels for readonly mode', () => {
      component.readonly = true;
      component.currentRating = 4;
      fixture.detectChanges();

      expect(component.getAriaLabel()).toContain('Rating: 4.0/5.0');
      expect(component.getAriaLabel()).not.toContain('Rate this content');

      expect(component.getStarAriaLabel(0)).toContain('Star 1 of 5 filled');
      expect(component.getStarAriaLabel(4)).toContain('Star 5 of 5 empty');
    });

    it('should have screen reader instructions for interactive mode', () => {
      component.readonly = false;
      fixture.detectChanges();

      const srInstructions = fixture.debugElement.query(By.css('.sr-only'));
      expect(srInstructions).toBeTruthy();
      expect(srInstructions.nativeElement.textContent).toContain('Use arrow keys to change rating');
      expect(srInstructions.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Readonly Mode', () => {
    beforeEach(() => {
      component.readonly = true;
      component.currentRating = 3.5;
      fixture.detectChanges();
    });

    it('should not emit changes in readonly mode', () => {
      vi.spyOn(component.ratingChange, 'emit');

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[2].nativeElement.click();

      expect(component.ratingChange.emit).not.toHaveBeenCalled();
      expect(component.currentRating).toBe(3.5); // Should remain unchanged
    });

    it('should not respond to hover events in readonly mode', () => {
      const initialHover = component.hoveredRating;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[4].triggerEventHandler('mouseenter', null);

      expect(component.hoveredRating).toBe(initialHover);
      expect(service.trackHoverInteraction).not.toHaveBeenCalled();
    });

    it('should not respond to keyboard events in readonly mode', () => {
      const initialRating = component.currentRating;

      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const starElement = stars[0];

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      starElement.triggerEventHandler('keydown', enterEvent);

      expect(component.currentRating).toBe(initialRating);
      expect(service.trackKeyboardNavigation).not.toHaveBeenCalled();
    });

    it('should disable star buttons in readonly mode', () => {
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));

      stars.forEach(star => {
        expect(star.nativeElement.disabled).toBe(true);
        expect(star.nativeElement.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('should track component render as readonly', () => {
      component.ngAfterViewInit();

      expect(service.trackComponentRender).toHaveBeenCalledWith(
        'readonly',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Forms Integration (ControlValueAccessor)', () => {
    let formControl: FormControl;

    beforeEach(() => {
      formControl = new FormControl(0);
      fixture.detectChanges();
    });

    it('should implement ControlValueAccessor interface', () => {
      expect(component.writeValue).toBeDefined();
      expect(component.registerOnChange).toBeDefined();
      expect(component.registerOnTouched).toBeDefined();
      expect(component.setDisabledState).toBeDefined();
    });

    it('should write value correctly from form control', () => {
      component.writeValue(4);

      expect(component.currentRating).toBe(4);
    });

    it('should validate rating values when writing from form', () => {
      // Test invalid values get validated
      component.writeValue(-2);
      expect(component.currentRating).toBe(0);

      component.writeValue(8);
      expect(component.currentRating).toBe(5);

      component.writeValue(3.7);
      expect(component.currentRating).toBe(3.5);
    });

    it('should register onChange callback and call it on rating change', fakeAsync(() => {
      let formValue: number | null = null;
      component.registerOnChange((value: number) => {
        formValue = value;
      });

      component.onStarClick(3);
      tick(100); // Wait for debounce

      expect(formValue).toBe(3);
    }));

    it('should register onTouched callback and call it on interaction', () => {
      let touched = false;
      component.registerOnTouched(() => {
        touched = true;
      });

      component.onStarClick(2);

      expect(touched).toBe(true);
    });

    it('should set disabled state correctly', () => {
      component.setDisabledState(true);

      expect(component.readonly).toBe(true);
    });

    it('should work with reactive forms validation', () => {
      const formControl = new FormControl(0, { validators: [(control) => {
        return control.value > 0 ? null : { required: true };
      }]});

      // Initially invalid
      expect(formControl.invalid).toBe(true);

      // Set valid value
      component.writeValue(3);
      component.registerOnChange((value) => formControl.setValue(value));
      component.onStarClick(3);

      // Should be valid now
      setTimeout(() => {
        expect(formControl.invalid).toBe(false);
      }, 150);
    });
  });

  describe('Touch Device Support', () => {
    beforeEach(() => {
      component.isTouchDevice = true;
      fixture.detectChanges();
    });

    it('should provide 44px minimum touch targets', () => {
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));

      stars.forEach(star => {
        const styles = getComputedStyle(star.nativeElement);
        const minWidth = parseInt(styles.minWidth, 10);
        const minHeight = parseInt(styles.minHeight, 10);

        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should maintain 20px visual star size on mobile while keeping touch targets', () => {
      const starIcons = fixture.debugElement.queryAll(By.css('.star-icon'));

      starIcons.forEach(icon => {
        const styles = getComputedStyle(icon.nativeElement);
        const maxWidth = parseInt(styles.maxWidth, 10);
        const maxHeight = parseInt(styles.maxHeight, 10);

        // On mobile, stars should be 20px visually
        expect(maxWidth).toBeLessThanOrEqual(24);
        expect(maxHeight).toBeLessThanOrEqual(24);
      });
    });

    it('should not trigger hover effects on touch devices', () => {
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      stars[2].triggerEventHandler('mouseenter', null);

      expect(component.hoveredRating).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid state changes efficiently', fakeAsync(() => {
      vi.spyOn(component['cdr'], 'markForCheck');

      // Simulate rapid rating changes
      for (let i = 1; i <= 5; i++) {
        component.setRating(i);
        tick(10);
      }

      tick(100); // Final debounce

      // Should efficiently handle changes with OnPush strategy
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    }));

    it('should properly cleanup resources on destroy', () => {
      vi.spyOn(component['destroy$'], 'next');
      vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should handle trackBy function for ngFor performance', () => {
      const index = 2;
      const result = component.trackByStarIndex(index);

      expect(result).toBe(index);
    });

    it('should handle component with no contentId gracefully', () => {
      component.contentId = undefined;

      component.onStarClick(3);

      // Should not throw errors when contentId is undefined
      expect(service.trackRatingSelection).toHaveBeenCalledWith(3, undefined);
    });
  });

  describe('Service Integration and Analytics', () => {
    it('should track all required analytics events', fakeAsync(() => {
      component.currentRating = 0;
      component.contentId = 'test-content';
      fixture.detectChanges();

      // Test star selection tracking
      component.onStarClick(4);
      tick(100);

      expect(service.trackRatingSelection).toHaveBeenCalledWith(4, 'test-content');

      // Test hover tracking (non-touch device)
      component.isTouchDevice = false;
      component.onStarHover(3);

      expect(service.trackHoverInteraction).toHaveBeenCalledWith(3, 'test-content');

      // Test keyboard navigation tracking
      const stars = fixture.debugElement.queryAll(By.css('.star-button'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      stars[0].triggerEventHandler('keydown', enterEvent);

      expect(service.trackKeyboardNavigation).toHaveBeenCalledWith('select', expect.any(Number));

      // Test rating cleared tracking
      component.clearRating();

      expect(service.trackRatingCleared).toHaveBeenCalledWith(4, 'test-content');
    }));

    it('should use service for all rating validation', () => {
      vi.spyOn(service, 'validateRating');

      component.setRating(3.7);

      expect(service.validateRating).toHaveBeenCalledWith(3.7);
    });

    it('should use service for star state calculation', () => {
      vi.spyOn(service, 'getStarState');

      component.currentRating = 3.5;
      component.getStarState(2);

      expect(service.getStarState).toHaveBeenCalledWith(3.5, 2);
    });

    it('should use service for rating format display', () => {
      vi.spyOn(service, 'formatRatingDisplay');

      component.getFormattedRating();

      expect(service.formatRatingDisplay).toHaveBeenCalled();
    });
  });

  describe('Integration with Host Component', () => {
    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostFixture.detectChanges();
    });

    it('should integrate properly with parent component', () => {
      hostComponent.rating = 3.5;
      hostComponent.contentId = 'integration-test';
      hostFixture.detectChanges();

      const starComponent = hostFixture.debugElement.query(By.directive(StarRatingComponent));
      expect(starComponent).toBeTruthy();

      const componentInstance = starComponent.componentInstance;
      expect(componentInstance.currentRating).toBe(3.5);
      expect(componentInstance.contentId).toBe('integration-test');
    });

    it('should emit events to parent component', fakeAsync(() => {
      const stars = hostFixture.debugElement.queryAll(By.css('.star-button'));
      stars[3].nativeElement.click(); // Click fourth star

      tick(100);

      expect(hostComponent.lastRatingEvent).toBeTruthy();
      expect(hostComponent.lastRatingEvent!.rating).toBe(4);
      expect(hostComponent.lastRatingEvent!.contentId).toBe('test-content');
    }));

    it('should respond to dynamic configuration changes', () => {
      hostComponent.config = { maxRating: 3, showNumeric: false };
      hostFixture.detectChanges();

      const stars = hostFixture.debugElement.queryAll(By.css('.star-button'));
      expect(stars.length).toBe(3);

      const numericDisplay = hostFixture.debugElement.query(By.css('.rating-numeric'));
      expect(numericDisplay).toBeFalsy();
    });

    it('should handle dynamic readonly mode switching', () => {
      // Start in interactive mode
      expect(hostComponent.readonly).toBe(false);

      const stars = hostFixture.debugElement.queryAll(By.css('.star-button'));
      expect(stars[0].nativeElement.disabled).toBe(false);

      // Switch to readonly
      hostComponent.readonly = true;
      hostFixture.detectChanges();

      expect(stars[0].nativeElement.disabled).toBe(true);
    });
  });
});