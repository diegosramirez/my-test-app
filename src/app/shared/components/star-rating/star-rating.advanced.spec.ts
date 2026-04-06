import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

import { StarRatingComponent } from './star-rating.component';
import { RatingChangeEvent, RatingHoverEvent, StarState } from './star-rating.interface';

@Component({
  template: `
    <app-star-rating
      [rating]="rating"
      [interactive]="interactive"
      [maxStars]="maxStars"
      [showNumeric]="showNumeric"
      [size]="size"
      [componentId]="componentId"
      [precision]="precision"
      [debounceTime]="debounceTime"
      (ratingChange)="onRatingChange($event)"
      (ratingHover)="onRatingHover($event)"
      (keyboardNavigation)="onKeyboardNavigation($event)">
    </app-star-rating>
  `,
  imports: [StarRatingComponent],
  standalone: true
})
class AdvancedTestHostComponent {
  rating = 3.7;
  interactive = true;
  maxStars = 5;
  showNumeric = true;
  size: 'small' | 'medium' | 'large' = 'medium';
  componentId = 'advanced-test-rating';
  precision = 0.5;
  debounceTime = 50;

  onRatingChange = vi.fn();
  onRatingHover = vi.fn();
  onKeyboardNavigation = vi.fn();
}

describe('StarRatingComponent - Advanced Scenarios', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent, AdvancedTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Half-Star Display Accuracy', () => {
    it('should display 3.7 rating as 3.5 stars visually with half-star', () => {
      component.rating = 3.7;
      component.precision = 0.5;
      fixture.detectChanges();

      // Should normalize 3.7 to 3.5 for half-star display
      expect(component.currentRating).toBe(3.7);

      // Check star states: first 3 should be filled, 4th should be half-filled
      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].filled).toBe(true);
      expect(component.stars[3].halfFilled).toBe(true);
      expect(component.stars[3].filled).toBe(false);
      expect(component.stars[4].filled).toBe(false);
      expect(component.stars[4].halfFilled).toBe(false);
    });

    it('should handle 2.3 rating by displaying 2 full stars and one half-star', () => {
      component.rating = 2.3;
      fixture.detectChanges();

      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].halfFilled).toBe(true);
      expect(component.stars[2].filled).toBe(false);
      expect(component.stars[3].filled).toBe(false);
      expect(component.stars[4].filled).toBe(false);
    });

    it('should display 4.9 rating as 4 full stars and one half-star', () => {
      component.rating = 4.9;
      fixture.detectChanges();

      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].filled).toBe(true);
      expect(component.stars[3].filled).toBe(true);
      expect(component.stars[4].halfFilled).toBe(true);
      expect(component.stars[4].filled).toBe(false);
    });

    it('should handle exact half values like 2.5', () => {
      component.rating = 2.5;
      fixture.detectChanges();

      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].halfFilled).toBe(true);
      expect(component.stars[2].filled).toBe(false);
    });

    it('should handle edge case of 0.5 rating', () => {
      component.rating = 0.5;
      fixture.detectChanges();

      expect(component.stars[0].halfFilled).toBe(true);
      expect(component.stars[0].filled).toBe(false);
      expect(component.stars[1].filled).toBe(false);
    });

    it('should display exact integer ratings without half stars', () => {
      component.rating = 3.0;
      fixture.detectChanges();

      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].filled).toBe(true);
      expect(component.stars[3].filled).toBe(false);
      expect(component.stars[3].halfFilled).toBe(false);
    });
  });

  describe('Touch Target Requirements', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have minimum 44px touch targets for medium size', () => {
      component.size = 'medium';
      fixture.detectChanges();

      const starButtons = fixture.debugElement.queryAll(By.css('.star-rating__star-button'));
      starButtons.forEach(button => {
        const element = button.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(element);

        // Check minimum dimensions (using computed styles)
        const minWidth = parseInt(computedStyle.minWidth);
        const minHeight = parseInt(computedStyle.minHeight);

        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should have appropriate touch targets for small size (still meeting 44px minimum)', () => {
      component.size = 'small';
      fixture.detectChanges();

      const starButtons = fixture.debugElement.queryAll(By.css('.star-rating__star-button'));
      starButtons.forEach(button => {
        const element = button.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(element);

        const minWidth = parseInt(computedStyle.minWidth);
        const minHeight = parseInt(computedStyle.minHeight);

        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should have larger touch targets for large size', () => {
      component.size = 'large';
      fixture.detectChanges();

      const starButtons = fixture.debugElement.queryAll(By.css('.star-rating__star-button'));
      starButtons.forEach(button => {
        const element = button.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(element);

        const minWidth = parseInt(computedStyle.minWidth);
        const minHeight = parseInt(computedStyle.minHeight);

        expect(minWidth).toBeGreaterThanOrEqual(52);
        expect(minHeight).toBeGreaterThanOrEqual(52);
      });
    });

    it('should handle touch events on entire touch target area', () => {
      vi.spyOn(component.ratingChange, 'emit');

      const starButton = fixture.debugElement.query(By.css('.star-rating__star-button'));
      const touchEvent = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 0,
          target: starButton.nativeElement,
          clientX: 10,
          clientY: 10,
          radiusX: 0,
          radiusY: 0,
          rotationAngle: 0,
          force: 1
        })]
      });

      component.onTouchStart(touchEvent, 0);

      expect(component.ratingChange.emit).toHaveBeenCalledWith(1);
    });
  });

  describe('Performance with OnPush Strategy', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle rapid hover interactions without performance issues', () => {
      vi.useFakeTimers();
      vi.spyOn(component.ratingHover, 'emit');
      vi.spyOn(component['cdr'], 'markForCheck');

      // Simulate rapid mouse movements across stars
      for (let i = 0; i < 10; i++) {
        component.onStarHover(i % 5);
      }

      // Verify change detection is called but hover events are debounced
      expect(component['cdr'].markForCheck).toHaveBeenCalledTimes(10);

      // Fast-forward through debounce period
      vi.advanceTimersByTime(100);

      // Should only emit the last hover event due to debouncing
      expect(component.ratingHover.emit).toHaveBeenCalledTimes(1);
    });

    it('should efficiently update star states without unnecessary re-renders', () => {
      const markForCheckSpy = vi.spyOn(component['cdr'], 'markForCheck');

      // Multiple rapid state changes
      component.onStarHover(1);
      component.onStarHover(2);
      component.onStarHover(3);

      // Should call markForCheck for each state change
      expect(markForCheckSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle cleanup properly to prevent memory leaks', () => {
      const destroySubject = component['destroy$'];
      vi.spyOn(destroySubject, 'next');
      vi.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();

      expect(destroySubject.next).toHaveBeenCalled();
      expect(destroySubject.complete).toHaveBeenCalled();
    });

    it('should use trackBy function for efficient ngFor rendering', () => {
      const mockStar: StarState = {
        index: 3,
        filled: true,
        halfFilled: false,
        hovered: false
      };

      const trackResult = component.trackByStar(3, mockStar);
      expect(trackResult).toBe(3);
    });
  });

  describe('Advanced Keyboard Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle arrow key boundaries correctly', () => {
      // Test left arrow at first star (should not go below 0)
      component.focusedStarIndex = 0;
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

      component.onKeyDown(leftEvent);
      expect(component.focusedStarIndex).toBe(0);

      // Test right arrow at last star (should not exceed maxStars-1)
      component.focusedStarIndex = 4;
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      component.onKeyDown(rightEvent);
      expect(component.focusedStarIndex).toBe(4);
    });

    it('should handle rapid keyboard navigation without issues', () => {
      vi.spyOn(component.keyboardNavigation, 'emit');

      const keys = ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
      keys.forEach(key => {
        const event = new KeyboardEvent('keydown', { key });
        component.onKeyDown(event);
      });

      expect(component.keyboardNavigation.emit).toHaveBeenCalledTimes(5);
    });

    it('should prevent default behavior for handled keyboard events', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not prevent default for unhandled keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should emit correct keyboard navigation data with component ID', () => {
      component.componentId = 'test-keyboard-nav';
      vi.spyOn(component.keyboardNavigation, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onKeyDown(event);

      expect(component.keyboardNavigation.emit).toHaveBeenCalledWith({
        direction: 'right',
        currentFocus: 0,
        componentId: 'test-keyboard-nav'
      });
    });
  });

  describe('Advanced Accessibility Compliance', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should provide comprehensive ARIA labels for screen readers', () => {
      component.interactive = true;
      component.currentRating = 3;
      component.maxStars = 5;

      const containerAriaLabel = component.getAriaLabel();
      expect(containerAriaLabel).toBe('Rating: 3 out of 5 stars. Use arrow keys to navigate and Enter or Space to select.');
    });

    it('should provide different ARIA labels for read-only mode', () => {
      component.interactive = false;
      component.currentRating = 4;
      component.maxStars = 5;

      const containerAriaLabel = component.getAriaLabel();
      expect(containerAriaLabel).toBe('Rating: 4 out of 5 stars');
    });

    it('should have proper star-specific ARIA labels', () => {
      component.currentRating = 2;
      component.interactive = true;

      const selectedStarLabel = component.getStarAriaLabel(0);
      expect(selectedStarLabel).toBe('1 star, selected. Press Enter or Space to select.');

      const unselectedStarLabel = component.getStarAriaLabel(3);
      expect(selectedStarLabel).toBe('1 star, selected. Press Enter or Space to select.');
      expect(unselectedStarLabel).toBe('4 stars, not selected. Press Enter or Space to select.');
    });

    it('should handle singular vs plural star labels correctly', () => {
      component.interactive = false;

      const singleStarLabel = component.getStarAriaLabel(0);
      expect(singleStarLabel).toContain('1 star');

      const multipleStarsLabel = component.getStarAriaLabel(1);
      expect(multipleStarsLabel).toContain('2 stars');
    });

    it('should have proper role attributes in template', () => {
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.star-rating-container'));
      const starButtons = fixture.debugElement.queryAll(By.css('.star-rating__star-button'));

      expect(container.nativeElement.getAttribute('role')).toBe('radiogroup');
      starButtons.forEach(button => {
        expect(button.nativeElement.getAttribute('role')).toBe('radio');
      });
    });

    it('should update aria-live regions appropriately', () => {
      component.showNumeric = true;
      component.interactive = true;
      fixture.detectChanges();

      const numericDisplay = fixture.debugElement.query(By.css('.star-rating__numeric'));
      expect(numericDisplay.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Edge Case Validations', () => {
    it('should validate non-numeric rating inputs', () => {
      const validation = component['validateAndNormalizeRating']('invalid' as any);

      expect(validation.isValid).toBe(false);
      expect(validation.normalizedRating).toBe(0);
      expect(validation.errorMessage).toBe('Rating must be a valid number');
    });

    it('should validate negative infinity ratings', () => {
      const validation = component['validateAndNormalizeRating'](-Infinity);

      expect(validation.isValid).toBe(false);
      expect(validation.normalizedRating).toBe(0);
    });

    it('should validate positive infinity ratings', () => {
      const validation = component['validateAndNormalizeRating'](Infinity);

      expect(validation.isValid).toBe(false);
      expect(validation.normalizedRating).toBe(5);
    });

    it('should handle extremely large maxStars values', () => {
      component.maxStars = 100;
      fixture.detectChanges();

      expect(component.stars).toHaveLength(100);
      component.stars.forEach((star, index) => {
        expect(star.index).toBe(index);
      });
    });

    it('should handle zero rating with precision', () => {
      component.rating = 0;
      component.precision = 0.1;
      fixture.detectChanges();

      const formatted = component.getFormattedRating();
      expect(formatted).toBe('0.0');
    });

    it('should handle decimal precision formatting', () => {
      component.currentRating = 3.7654;
      component.precision = 1;

      expect(component.getFormattedRating()).toBe('4');

      component.precision = 0.1;
      expect(component.getFormattedRating()).toBe('3.8');
    });
  });

  describe('Event Handling and Debouncing', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should configure custom debounce time', () => {
      vi.useFakeTimers();
      vi.spyOn(component.ratingHover, 'emit');
      component.debounceTime = 200;

      // Reinitialize with new debounce time
      component.ngOnDestroy();
      component.ngOnInit();

      component.onStarHover(2);

      vi.advanceTimersByTime(150);
      expect(component.ratingHover.emit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(component.ratingHover.emit).toHaveBeenCalled();
    });

    it('should emit hover events with correct component ID', () => {
      vi.useFakeTimers();
      vi.spyOn(component.ratingHover, 'emit');
      component.componentId = 'custom-rating-id';

      component.onStarHover(3);
      vi.advanceTimersByTime(150);

      expect(component.ratingHover.emit).toHaveBeenCalledWith({
        previewRating: 4,
        componentId: 'custom-rating-id'
      });
    });

    it('should clear hover state properly on mouse leave', () => {
      component.onStarHover(2);
      expect(component.isHovering).toBe(true);
      expect(component.previewRating).toBe(3);

      component.onMouseLeave();

      expect(component.isHovering).toBe(false);
      expect(component.previewRating).toBe(0);
    });

    it('should handle multiple rapid mouse leave events', () => {
      component.onStarHover(2);
      component.onMouseLeave();
      component.onMouseLeave(); // Should not cause errors

      expect(component.isHovering).toBe(false);
      expect(component.previewRating).toBe(0);
    });
  });

  describe('CSS Class Generation', () => {
    it('should generate correct container classes for different states', () => {
      component.size = 'large';
      component.interactive = false;
      component.isHovering = false;

      const classes = component.getContainerClasses();
      expect(classes).toContain('star-rating--large');
      expect(classes).toContain('star-rating--readonly');
      expect(classes).not.toContain('star-rating--hovering');
    });

    it('should generate hovering class when appropriate', () => {
      component.isHovering = true;
      const classes = component.getContainerClasses();
      expect(classes).toContain('star-rating--hovering');
    });

    it('should generate correct star classes for different states', () => {
      const mockStar: StarState = {
        index: 2,
        filled: true,
        halfFilled: false,
        hovered: true
      };
      component.focusedStarIndex = 2;

      const classes = component.getStarClasses(mockStar);
      expect(classes).toContain('star-rating__star--filled');
      expect(classes).toContain('star-rating__star--hovered');
      expect(classes).toContain('star-rating__star--focused');
    });

    it('should generate half-filled star classes correctly', () => {
      const mockStar: StarState = {
        index: 1,
        filled: false,
        halfFilled: true,
        hovered: false
      };

      const classes = component.getStarClasses(mockStar);
      expect(classes).toContain('star-rating__star--half-filled');
      expect(classes).not.toContain('star-rating__star--filled');
    });
  });
});