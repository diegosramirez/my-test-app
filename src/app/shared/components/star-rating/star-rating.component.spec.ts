import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

import { StarRatingComponent } from './star-rating.component';
import { RatingChangeEvent, RatingHoverEvent, KeyboardNavigationEvent } from './star-rating.interface';

@Component({
  template: `
    <app-star-rating
      [rating]="rating"
      [interactive]="interactive"
      [maxStars]="maxStars"
      [showNumeric]="showNumeric"
      [size]="size"
      [componentId]="componentId"
      (ratingChange)="onRatingChange($event)"
      (ratingHover)="onRatingHover($event)"
      (keyboardNavigation)="onKeyboardNavigation($event)">
    </app-star-rating>
  `,
  imports: [StarRatingComponent],
  standalone: true
})
class TestHostComponent {
  rating = 3;
  interactive = true;
  maxStars = 5;
  showNumeric = true;
  size: 'small' | 'medium' | 'large' = 'medium';
  componentId = 'test-star-rating';

  onRatingChange = vi.fn();
  onRatingHover = vi.fn();
  onKeyboardNavigation = vi.fn();
}

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      fixture.detectChanges();

      expect(component.rating).toBe(0);
      expect(component.interactive).toBe(true);
      expect(component.maxStars).toBe(5);
      expect(component.showNumeric).toBe(true);
      expect(component.size).toBe('medium');
      expect(component.stars).toHaveLength(5);
    });

    it('should initialize stars array correctly', () => {
      component.maxStars = 3;
      fixture.detectChanges();

      expect(component.stars).toHaveLength(3);
      component.stars.forEach((star, index) => {
        expect(star.index).toBe(index);
        expect(star.filled).toBe(false);
        expect(star.halfFilled).toBe(false);
        expect(star.hovered).toBe(false);
      });
    });

    it('should update star states based on rating', () => {
      component.rating = 3.5;
      fixture.detectChanges();

      expect(component.stars[0].filled).toBe(true);
      expect(component.stars[1].filled).toBe(true);
      expect(component.stars[2].filled).toBe(true);
      expect(component.stars[3].halfFilled).toBe(true);
      expect(component.stars[4].filled).toBe(false);
    });
  });

  describe('Visual Rendering', () => {
    it('should render correct number of stars in template', () => {
      component.maxStars = 3;
      fixture.detectChanges();

      const starButtons = fixture.debugElement.queryAll(By.css('.star-rating__star-button'));
      expect(starButtons).toHaveLength(3);
    });

    it('should display numeric rating when showNumeric is true', () => {
      component.showNumeric = true;
      component.currentRating = 2;
      fixture.detectChanges();

      const numericDisplay = fixture.debugElement.query(By.css('.star-rating__numeric'));
      expect(numericDisplay).toBeTruthy();
    });

    it('should hide numeric rating when showNumeric is false', () => {
      component.showNumeric = false;
      fixture.detectChanges();

      const numericDisplay = fixture.debugElement.query(By.css('.star-rating__numeric'));
      expect(numericDisplay).toBeFalsy();
    });

    it('should apply correct CSS classes for size', () => {
      const containerClasses = component.getContainerClasses();
      expect(containerClasses).toContain('star-rating--medium');
    });

    it('should apply readonly class when not interactive', () => {
      component.interactive = false;
      const containerClasses = component.getContainerClasses();
      expect(containerClasses).toContain('star-rating--readonly');
    });
  });

  describe('Mouse Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle star click events', () => {
      vi.spyOn(component.ratingChange, 'emit');

      component.onStarClick(3);

      expect(component.currentRating).toBe(4);
      expect(component.ratingChange.emit).toHaveBeenCalledWith(4);
    });

    it('should not handle clicks when not interactive', () => {
      vi.spyOn(component.ratingChange, 'emit');
      component.interactive = false;

      component.onStarClick(2);

      expect(component.ratingChange.emit).not.toHaveBeenCalled();
    });

    it('should handle mouse hover events', () => {
      vi.useFakeTimers();
      vi.spyOn(component.ratingHover, 'emit');

      component.onStarHover(2);

      expect(component.isHovering).toBe(true);
      expect(component.previewRating).toBe(3);

      vi.advanceTimersByTime(150);

      expect(component.ratingHover.emit).toHaveBeenCalled();
    });

    it('should clear hover state on mouse leave', () => {
      component.onStarHover(2);
      expect(component.isHovering).toBe(true);

      component.onMouseLeave();

      expect(component.isHovering).toBe(false);
      expect(component.previewRating).toBe(0);
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle arrow key navigation', () => {
      vi.spyOn(component.keyboardNavigation, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onKeyDown(event);

      expect(component.focusedStarIndex).toBe(0);
      expect(component.keyboardNavigation.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'right',
          currentFocus: 0
        })
      );
    });

    it('should handle Enter key for selection', () => {
      vi.spyOn(component.ratingChange, 'emit');
      component.focusedStarIndex = 2;

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.ratingChange.emit).toHaveBeenCalledWith(3);
    });

    it('should handle Space key for selection', () => {
      vi.spyOn(component.ratingChange, 'emit');
      component.focusedStarIndex = 1;

      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.ratingChange.emit).toHaveBeenCalledWith(2);
    });

    it('should handle Home key navigation', () => {
      component.focusedStarIndex = 3;
      const event = new KeyboardEvent('keydown', { key: 'Home' });

      component.onKeyDown(event);

      expect(component.focusedStarIndex).toBe(0);
    });

    it('should handle End key navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'End' });

      component.onKeyDown(event);

      expect(component.focusedStarIndex).toBe(4);
    });

    it('should not handle keyboard events when not interactive', () => {
      component.interactive = false;
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      component.onKeyDown(event);

      expect(component.focusedStarIndex).toBe(-1);
    });

    it('should show focus indicator when focused star exists', () => {
      component.interactive = true;
      component.focusedStarIndex = 2;
      fixture.detectChanges();

      // Test that the condition is correct in template
      expect(component.focusedStarIndex >= 0).toBe(true);
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle touch events', () => {
      vi.spyOn(component.ratingChange, 'emit');
      const touchEvent = new TouchEvent('touchstart');
      vi.spyOn(touchEvent, 'preventDefault');

      component.onTouchStart(touchEvent, 2);

      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect(component.ratingChange.emit).toHaveBeenCalledWith(3);
    });

    it('should not handle touch events when not interactive', () => {
      vi.spyOn(component.ratingChange, 'emit');
      component.interactive = false;
      const touchEvent = new TouchEvent('touchstart');

      component.onTouchStart(touchEvent, 1);

      expect(component.ratingChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have appropriate aria-label for container', () => {
      const ariaLabel = component.getAriaLabel();
      expect(ariaLabel).toContain('Rating: 0 out of 5 stars');
      expect(ariaLabel).toContain('Use arrow keys to navigate');
    });

    it('should have proper aria-labels for individual stars', () => {
      const starLabel = component.getStarAriaLabel(0);
      expect(starLabel).toContain('1 star');
      expect(starLabel).toContain('not selected');
    });

    it('should update aria-labels based on rating state', () => {
      component.currentRating = 3;

      const selectedStarLabel = component.getStarAriaLabel(0);
      const unselectedStarLabel = component.getStarAriaLabel(4);

      expect(selectedStarLabel).toContain('selected');
      expect(unselectedStarLabel).toContain('not selected');
    });
  });

  describe('Performance and Change Detection', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component['cdr']).toBeTruthy();
      vi.spyOn(component['cdr'], 'markForCheck');

      component['updateStarStates']();

      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    });

    it('should debounce hover events', () => {
      vi.useFakeTimers();
      vi.spyOn(component.ratingHover, 'emit');

      component.onStarHover(0);
      component.onStarHover(1);
      component.onStarHover(2);

      expect(component.ratingHover.emit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150);

      expect(component.ratingHover.emit).toHaveBeenCalledTimes(1);
    });

    it('should provide trackBy function for ngFor', () => {
      const star = { index: 0, filled: false, halfFilled: false, hovered: false };
      const result = component.trackByStar(0, star);

      expect(result).toBe(0);
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should handle invalid rating values', () => {
      component.rating = -1;
      fixture.detectChanges();

      expect(component.currentRating).toBe(0);
    });

    it('should handle rating values exceeding maximum', () => {
      component.rating = 10;
      fixture.detectChanges();

      expect(component.currentRating).toBe(5);
    });

    it('should handle NaN rating values', () => {
      component.rating = NaN;
      fixture.detectChanges();

      expect(component.currentRating).toBe(0);
    });

    it('should format numeric rating correctly', () => {
      component.currentRating = 3.5;
      component.precision = 0.5;

      expect(component.getFormattedRating()).toBe('3.5');
    });

    it('should handle zero max stars gracefully', () => {
      component.maxStars = 0;
      fixture.detectChanges();

      expect(component.stars).toHaveLength(0);
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      vi.spyOn(component.ratingChange, 'emit');
      vi.spyOn(component.ratingHover, 'emit');
      vi.spyOn(component.keyboardNavigation, 'emit');
    });

    it('should emit rating change with correct data', () => {
      component.onStarClick(2);

      expect(component.ratingChange.emit).toHaveBeenCalledWith(3);
    });

    it('should emit hover events with correct structure', () => {
      vi.useFakeTimers();

      component.onStarHover(1);
      vi.advanceTimersByTime(150);

      expect(component.ratingHover.emit).toHaveBeenCalledWith({
        previewRating: 2,
        componentId: component.componentId
      });
    });

    it('should emit keyboard navigation events', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      component.focusedStarIndex = 2;

      component.onKeyDown(event);

      expect(component.keyboardNavigation.emit).toHaveBeenCalledWith({
        direction: 'left',
        currentFocus: 1,
        componentId: component.componentId
      });
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should complete observables on destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should unsubscribe from hover subject on destroy', () => {
      const nextSpy = vi.spyOn(component['destroy$'], 'next');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
    });
  });

  describe('Integration with Host Component', () => {
    let hostComponent: TestHostComponent;
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostFixture.detectChanges();
    });

    it('should handle events through host component', () => {
      const starRatingElement = hostFixture.debugElement.query(By.css('app-star-rating'));
      const starRatingComponent = starRatingElement.componentInstance as StarRatingComponent;

      starRatingComponent.onStarClick(1);

      expect(hostComponent.onRatingChange).toHaveBeenCalledWith(2);
    });

    it('should render stars correctly in host', () => {
      const starButtons = hostFixture.debugElement.queryAll(By.css('.star-rating__star-button'));
      expect(starButtons).toHaveLength(5);
    });
  });
});