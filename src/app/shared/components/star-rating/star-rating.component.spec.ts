import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StarRatingComponent } from './star-rating.component';
import { beforeEach, describe, it, expect, vi } from 'vitest';

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.rating).toBe(0);
      expect(component.readonly).toBe(false);
      expect(component.showNumeric).toBe(false);
      expect(component.size).toBe('medium');
    });

    it('should set up proper accessibility attributes', () => {
      fixture.detectChanges();
      const container = compiled.querySelector('[role="slider"]') as HTMLElement;

      expect(container).toBeTruthy();
      expect(container.getAttribute('aria-valuemin')).toBe('0');
      expect(container.getAttribute('aria-valuemax')).toBe('5');
      expect(container.getAttribute('aria-valuenow')).toBe('0');
      expect(container.getAttribute('tabindex')).toBe('0');
    });

    it('should render 5 star elements', () => {
      fixture.detectChanges();
      const stars = compiled.querySelectorAll('.star-rating__star');
      expect(stars.length).toBe(5);
    });
  });

  describe('Rating Display', () => {
    it('should display correct number of filled stars for whole numbers', () => {
      component.rating = 3;
      component.ngOnChanges({
        rating: { currentValue: 3, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const filledStars = compiled.querySelectorAll('.star-rating__star--filled');
      expect(filledStars.length).toBe(3);
    });

    it('should display half stars for decimal values', () => {
      component.rating = 3.5;
      component.ngOnChanges({
        rating: { currentValue: 3.5, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const filledStars = compiled.querySelectorAll('.star-rating__star--filled');
      const halfStars = compiled.querySelectorAll('.star-rating__star--half');

      expect(filledStars.length).toBe(3);
      expect(halfStars.length).toBe(1);
    });

    it('should handle fractional ratings with proper rounding', () => {
      component.rating = 3.2;
      component.ngOnChanges({
        rating: { currentValue: 3.2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const filledStars = compiled.querySelectorAll('.star-rating__star--filled');
      expect(filledStars.length).toBe(3);
    });

    it('should show numeric rating when showNumeric is true', () => {
      component.rating = 4.5;
      component.showNumeric = true;
      component.ngOnChanges({
        rating: { currentValue: 4.5, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const numeric = compiled.querySelector('.star-rating__numeric');
      expect(numeric).toBeTruthy();
      expect(numeric?.textContent?.trim()).toBe('4.5');
    });

    it('should hide numeric rating when showNumeric is false', () => {
      component.rating = 4.5;
      component.showNumeric = false;
      fixture.detectChanges();

      const numeric = compiled.querySelector('.star-rating__numeric');
      expect(numeric).toBeFalsy();
    });
  });

  describe('Interactive Mode', () => {
    beforeEach(() => {
      component.readonly = false;
      fixture.detectChanges();
    });

    it('should emit ratingChange on star click', () => {
      return new Promise<void>((resolve) => {
        const emitSpy = vi.spyOn(component.ratingChange, 'emit');

        const thirdStar = compiled.querySelectorAll('.star-rating__star')[2] as HTMLButtonElement;
        thirdStar.click();

        // Wait for debounce
        setTimeout(() => {
          expect(emitSpy).toHaveBeenCalledWith(3);
          resolve();
        }, 350);
      });
    });

    it('should emit hover events on mouseenter', () => {
      return new Promise<void>((resolve) => {
        const hoverSpy = vi.spyOn(component.hover, 'emit');

        const secondStar = compiled.querySelectorAll('.star-rating__star')[1] as HTMLButtonElement;
        secondStar.dispatchEvent(new MouseEvent('mouseenter'));

        // Wait for debounce
        setTimeout(() => {
          expect(hoverSpy).toHaveBeenCalledWith(2);
          resolve();
        }, 150);
      });
    });

    it('should reset hover state on mouse leave', () => {
      component.onStarHover(3);
      fixture.detectChanges();

      component.onMouseLeave();
      fixture.detectChanges();

      expect(component['_hoveredRating']()).toBe(0);
    });

    it('should debounce rapid clicks', () => {
      return new Promise<void>((resolve) => {
        const emitSpy = vi.spyOn(component.ratingChange, 'emit');

        const thirdStar = compiled.querySelectorAll('.star-rating__star')[2] as HTMLButtonElement;

        // Click multiple times rapidly
        thirdStar.click();
        thirdStar.click();
        thirdStar.click();

        setTimeout(() => {
          // Should only emit once due to debouncing
          expect(emitSpy).toHaveBeenCalledTimes(1);
          resolve();
        }, 350);
      });
    });
  });

  describe('Readonly Mode', () => {
    beforeEach(() => {
      component.readonly = true;
      fixture.detectChanges();
    });

    it('should disable star buttons in readonly mode', () => {
      const stars = compiled.querySelectorAll('.star-rating__star') as NodeListOf<HTMLButtonElement>;

      stars.forEach(star => {
        expect(star.disabled).toBe(true);
      });
    });

    it('should not emit events in readonly mode', () => {
      return new Promise<void>((resolve) => {
        const ratingEmitSpy = vi.spyOn(component.ratingChange, 'emit');
        const hoverEmitSpy = vi.spyOn(component.hover, 'emit');

        const thirdStar = compiled.querySelectorAll('.star-rating__star')[2] as HTMLButtonElement;
        thirdStar.click();
        thirdStar.dispatchEvent(new MouseEvent('mouseenter'));

        setTimeout(() => {
          expect(ratingEmitSpy).not.toHaveBeenCalled();
          expect(hoverEmitSpy).not.toHaveBeenCalled();
          resolve();
        }, 350);
      });
    });

    it('should not have tabindex in readonly mode', () => {
      const container = compiled.querySelector('.star-rating') as HTMLElement;
      expect(container.getAttribute('tabindex')).toBeFalsy();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      component.readonly = false;
      component.rating = 2;
      fixture.detectChanges();
    });

    it('should increase rating with ArrowRight key', () => {
      const emitSpy = vi.spyOn(component.ratingChange, 'emit');

      // Ensure the component has the initial rating set
      component.ngOnChanges({
        rating: { currentValue: 2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(emitSpy).toHaveBeenCalledWith(3);
    });

    it('should decrease rating with ArrowLeft key', () => {
      const emitSpy = vi.spyOn(component.ratingChange, 'emit');

      // Ensure the component has the initial rating set
      component.ngOnChanges({
        rating: { currentValue: 2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      expect(emitSpy).toHaveBeenCalledWith(1);
    });

    it('should set rating to 1 with Home key', () => {
      const emitSpy = vi.spyOn(component.ratingChange, 'emit');

      // Ensure the component has the initial rating set
      component.ngOnChanges({
        rating: { currentValue: 2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));

      expect(emitSpy).toHaveBeenCalledWith(1);
    });

    it('should set rating to 5 with End key', () => {
      const emitSpy = vi.spyOn(component.ratingChange, 'emit');

      // Ensure the component has the initial rating set
      component.ngOnChanges({
        rating: { currentValue: 2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));

      expect(emitSpy).toHaveBeenCalledWith(5);
    });

    it('should set rating with numeric keys 1-5', () => {
      const emitSpy = vi.spyOn(component.ratingChange, 'emit');

      // Ensure the component has the initial rating set
      component.ngOnChanges({
        rating: { currentValue: 2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));

      expect(emitSpy).toHaveBeenCalledWith(4);
    });

    it('should not exceed maximum rating', () => {
      component.rating = 5;
      component.ngOnChanges({
        rating: { currentValue: 5, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(component['_rating']()).toBe(5);
    });

    it('should not go below minimum rating', () => {
      component.rating = 0;
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      expect(component['_rating']()).toBe(0);
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      component.size = 'small';
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating');
      expect(container?.classList).toContain('star-rating--small');
    });

    it('should apply medium size class', () => {
      component.size = 'medium';
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating');
      expect(container?.classList).toContain('star-rating--medium');
    });

    it('should apply large size class', () => {
      component.size = 'large';
      fixture.detectChanges();

      const container = compiled.querySelector('.star-rating');
      expect(container?.classList).toContain('star-rating--large');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative rating values', () => {
      component.rating = -2;
      component.ngOnChanges({
        rating: { currentValue: -2, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      expect(component['_rating']()).toBe(0);
    });

    it('should handle rating values above 5', () => {
      component.rating = 7;
      component.ngOnChanges({
        rating: { currentValue: 7, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      expect(component['_rating']()).toBe(5);
    });

    it('should handle NaN rating values', () => {
      component.rating = NaN;
      component.ngOnChanges({
        rating: { currentValue: NaN, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      expect(component['_rating']()).toBe(0);
    });

    it('should handle undefined rating values', () => {
      component.rating = undefined as any;
      component.ngOnChanges({
        rating: { currentValue: undefined, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      expect(component['_rating']()).toBe(0);
    });

    it('should clamp decimal values to nearest 0.5', () => {
      component.rating = 3.7;
      component.ngOnChanges({
        rating: { currentValue: 3.7, previousValue: 0, firstChange: false, isFirstChange: () => false }
      });
      fixture.detectChanges();

      expect(component['_rating']()).toBe(3.5); // 3.7 rounds to 3.5 (nearest 0.5)
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      component.readonly = false;
      fixture.detectChanges();
    });

    it('should handle touchstart events', () => {
      const hoverSpy = vi.spyOn(component, 'onStarHover');

      const secondStar = compiled.querySelectorAll('.star-rating__star')[1] as HTMLButtonElement;

      // Create mock Touch object for test environment
      const mockTouch = {
        identifier: 0,
        target: secondStar,
        clientX: 100,
        clientY: 100,
        screenX: 100,
        screenY: 100,
        pageX: 100,
        pageY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1
      } as Touch;

      secondStar.dispatchEvent(new TouchEvent('touchstart', {
        touches: [mockTouch],
        bubbles: true
      }));

      expect(hoverSpy).toHaveBeenCalledWith(2);
    });
  });

  describe('Accessibility', () => {
    it('should update aria-valuenow when rating changes', () => {
      component.rating = 3;
      fixture.detectChanges();

      const container = compiled.querySelector('[role="slider"]') as HTMLElement;
      expect(container.getAttribute('aria-valuenow')).toBe('3');
    });

    it('should have proper aria-label for stars', () => {
      fixture.detectChanges();

      const firstStar = compiled.querySelector('.star-rating__star') as HTMLButtonElement;
      expect(firstStar.getAttribute('aria-label')).toBe('Rate 1 stars');
    });

    it('should announce rating changes to screen readers', () => {
      return new Promise<void>((resolve) => {
        // Create a proper mock DOM element
        const mockElement = document.createElement('div');
        const setAttributeSpy = vi.spyOn(mockElement, 'setAttribute');

        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockElement);
        const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement);
        const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockElement);

        component.onStarClick(4);
        fixture.detectChanges();

        expect(createElementSpy).toHaveBeenCalledWith('div');
        expect(setAttributeSpy).toHaveBeenCalledWith('aria-live', 'polite');
        expect(mockElement.textContent).toBe('Rating set to 4 out of 5 stars');

        setTimeout(() => {
          expect(removeChildSpy).toHaveBeenCalled();
          createElementSpy.mockRestore();
          appendChildSpy.mockRestore();
          removeChildSpy.mockRestore();
          resolve();
        }, 1100);
      });
    });

    it('should provide screen reader instructions', () => {
      fixture.detectChanges();

      const srInstructions = compiled.querySelector('.sr-only');
      expect(srInstructions).toBeTruthy();
      expect(srInstructions?.textContent).toContain('Use arrow keys to navigate');
    });
  });

  describe('Content ID and Tracking', () => {
    it('should set data-testid with contentId', () => {
      component.contentId = 'test-content';
      fixture.detectChanges();

      const container = compiled.querySelector('[data-testid="star-rating-test-content"]');
      expect(container).toBeTruthy();
    });

    it('should set data-testid without contentId', () => {
      fixture.detectChanges();

      const container = compiled.querySelector('[data-testid="star-rating"]');
      expect(container).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should complete subjects on destroy', () => {
      const ratingCompleteSpy = vi.spyOn(component['ratingSubject'], 'complete');
      const hoverCompleteSpy = vi.spyOn(component['hoverSubject'], 'complete');

      component.ngOnDestroy();

      expect(ratingCompleteSpy).toHaveBeenCalled();
      expect(hoverCompleteSpy).toHaveBeenCalled();
    });

    it('should handle input changes', () => {
      const changes = {
        rating: {
          currentValue: 4,
          previousValue: 0,
          firstChange: true,
          isFirstChange: () => true
        }
      };

      component.ngOnChanges(changes);

      expect(component['_rating']()).toBe(4);
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      component.readonly = false;
      fixture.detectChanges();
    });

    it('should set keyboard navigation flag on focus', () => {
      component.onFocus();
      expect(component['isKeyboardNavigation']).toBe(true);
    });

    it('should reset keyboard navigation flag on blur', () => {
      component['isKeyboardNavigation'] = true;
      component.onBlur();
      expect(component['isKeyboardNavigation']).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should use trackBy function for star rendering', () => {
      const trackByResult = component.trackByStar(0, { index: 2 });
      expect(trackByResult).toBe(2);
    });
  });
});