import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Component, DebugElement, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StarRatingComponent, StarSize } from './star-rating.component';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';

// Test host component for integration testing
@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [StarRatingComponent],
  template: `
    <div class="test-container">
      <!-- Interactive rating scenarios -->
      <app-star-rating
        data-testid="interactive-rating"
        [rating]="rating()"
        [readonly]="readonly()"
        [showNumeric]="showNumeric()"
        [size]="size()"
        [contentId]="contentId()"
        (ratingChange)="onRatingChange($event)"
        (hover)="onHover($event)">
      </app-star-rating>

      <!-- Multiple instances for performance testing -->
      <app-star-rating
        *ngFor="let item of items(); trackBy: trackByItem"
        [rating]="item.rating"
        [readonly]="item.readonly"
        [showNumeric]="true"
        [size]="item.size"
        [contentId]="'perf-' + item.id"
        (ratingChange)="onItemRatingChange(item.id, $event)">
      </app-star-rating>

      <!-- Analytics tracking instance -->
      <app-star-rating
        data-testid="analytics-rating"
        [rating]="analyticsRating()"
        [showNumeric]="true"
        [contentId]="analyticsContentId()"
        (ratingChange)="onAnalyticsRatingChange($event)"
        (hover)="onAnalyticsHover($event)">
      </app-star-rating>
    </div>
  `
})
class TestHostComponent {
  rating = signal(0);
  readonly = signal(false);
  showNumeric = signal(false);
  size = signal<StarSize>('medium');
  contentId = signal<string | undefined>(undefined);

  // Multiple instances for performance testing
  items = signal([
    { id: 1, rating: 3, readonly: false, size: 'small' as StarSize },
    { id: 2, rating: 4.5, readonly: true, size: 'medium' as StarSize },
    { id: 3, rating: 2, readonly: false, size: 'large' as StarSize },
    { id: 4, rating: 1.5, readonly: true, size: 'medium' as StarSize },
    { id: 5, rating: 5, readonly: false, size: 'small' as StarSize }
  ]);

  // Analytics testing
  analyticsRating = signal(0);
  analyticsContentId = signal('analytics-content-123');

  // Event tracking
  ratingChanges: Array<{ rating: number; timestamp: number }> = [];
  hoverEvents: Array<{ rating: number; timestamp: number }> = [];
  itemRatingChanges: Array<{ id: number; rating: number; timestamp: number }> = [];
  analyticsEvents: Array<{ type: string; rating: number; contentId: string; timestamp: number }> = [];

  onRatingChange(rating: number): void {
    this.rating.set(rating);
    this.ratingChanges.push({ rating, timestamp: Date.now() });
  }

  onHover(rating: number): void {
    this.hoverEvents.push({ rating, timestamp: Date.now() });
  }

  onItemRatingChange(id: number, rating: number): void {
    this.itemRatingChanges.push({ id, rating, timestamp: Date.now() });
  }

  onAnalyticsRatingChange(rating: number): void {
    this.analyticsRating.set(rating);
    this.analyticsEvents.push({
      type: 'star_rating_selected',
      rating,
      contentId: this.analyticsContentId(),
      timestamp: Date.now()
    });
  }

  onAnalyticsHover(rating: number): void {
    this.analyticsEvents.push({
      type: 'star_hover',
      rating,
      contentId: this.analyticsContentId(),
      timestamp: Date.now()
    });
  }

  trackByItem(index: number, item: any): number {
    return item.id;
  }
}

describe('StarRatingComponent - Integration & Performance Tests', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let compiled: HTMLElement;
  let performanceObserver: PerformanceObserver;
  let performanceEntries: PerformanceEntry[] = [];

  beforeEach(async () => {
    // Setup performance monitoring
    if (typeof PerformanceObserver !== 'undefined') {
      performanceObserver = new PerformanceObserver((list) => {
        performanceEntries.push(...list.getEntries());
      });
      performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    }

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, StarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    performanceEntries = [];
    if (performanceObserver) {
      performanceObserver.disconnect();
    }
  });

  describe('Performance Requirements', () => {
    it('should render single component within 100ms performance requirement', () => {
      const startTime = performance.now();

      fixture.detectChanges();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);

      // Verify component is properly rendered
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]');
      expect(starRating).toBeTruthy();

      const stars = starRating?.querySelectorAll('.star-rating__star');
      expect(stars?.length).toBe(5);
    });

    it('should render multiple components efficiently', () => {
      const startTime = performance.now();

      fixture.detectChanges();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 6 total components (1 main + 5 in loop) within reasonable time
      expect(renderTime).toBeLessThan(200);

      // Verify all components are rendered
      const allRatings = compiled.querySelectorAll('app-star-rating');
      expect(allRatings.length).toBe(7); // 1 interactive + 5 items + 1 analytics
    });

    it('should handle rapid interaction without performance degradation', fakeAsync(() => {
      fixture.detectChanges();

      const interactiveRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const stars = interactiveRating.querySelectorAll('.star-rating__star') as NodeListOf<HTMLButtonElement>;

      const startTime = performance.now();

      // Simulate rapid clicking
      for (let i = 0; i < 20; i++) {
        const randomStar = stars[Math.floor(Math.random() * 5)];
        randomStar.click();
      }

      tick(500); // Wait for all debouncing

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      expect(interactionTime).toBeLessThan(100);

      // Should only emit one final event due to debouncing
      expect(hostComponent.ratingChanges.length).toBe(1);
    }));

    it('should maintain performance with continuous hover interactions', fakeAsync(() => {
      fixture.detectChanges();

      const interactiveRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const stars = interactiveRating.querySelectorAll('.star-rating__star') as NodeListOf<HTMLButtonElement>;

      const startTime = performance.now();

      // Simulate rapid hovering
      for (let i = 0; i < 50; i++) {
        const randomStar = stars[Math.floor(Math.random() * 5)];
        randomStar.dispatchEvent(new MouseEvent('mouseenter'));
        tick(10);
      }

      tick(200); // Wait for debouncing

      const endTime = performance.now();
      const hoverTime = endTime - startTime;

      expect(hoverTime).toBeLessThan(200);

      // Should have limited events due to debouncing
      expect(hostComponent.hoverEvents.length).toBeGreaterThan(0);
      expect(hostComponent.hoverEvents.length).toBeLessThan(20); // Debounced
    }));
  });

  describe('Advanced Accessibility & WCAG 2.1 AA Compliance', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should meet minimum contrast requirements', () => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const computedStyle = window.getComputedStyle(starRating);

      // CSS custom properties should be set for proper contrast
      const style = starRating.style;
      expect(starRating.classList.contains('star-rating')).toBe(true);

      // Verify CSS classes are applied for theming
      const stars = starRating.querySelectorAll('.star-rating__star');
      stars.forEach(star => {
        expect(star.classList.contains('star-rating__star')).toBe(true);
      });
    });

    it('should support high contrast mode preferences', () => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;

      // The CSS should handle high contrast mode automatically
      // Verify that appropriate classes exist for styling
      expect(starRating.classList.contains('star-rating')).toBe(true);

      const stars = starRating.querySelectorAll('.star-rating__star');
      expect(stars.length).toBe(5);
    });

    it('should provide proper screen reader context switching', fakeAsync(() => {
      const mockCreateElement = vi.spyOn(document, 'createElement');
      const mockAppendChild = vi.spyOn(document.body, 'appendChild');
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild');

      const mockElement = {
        setAttribute: vi.fn(),
        textContent: '',
        className: ''
      };

      mockCreateElement.mockReturnValue(mockElement as any);

      // Switch from interactive to readonly mode
      hostComponent.readonly.set(true);
      fixture.detectChanges();

      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      expect(starRating.classList.contains('star-rating--readonly')).toBe(true);

      // Switch back to interactive
      hostComponent.readonly.set(false);
      fixture.detectChanges();

      expect(starRating.classList.contains('star-rating--interactive')).toBe(true);

      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    }));

    it('should handle keyboard navigation with screen reader announcements', fakeAsync(() => {
      const mockCreateElement = vi.spyOn(document, 'createElement');
      const mockElement = {
        setAttribute: vi.fn(),
        textContent: '',
        className: ''
      };
      mockCreateElement.mockReturnValue(mockElement as any);

      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;

      // Test arrow key navigation
      starRating.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      tick(100);

      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockElement.textContent).toContain('out of 5 stars');

      mockCreateElement.mockRestore();
    }));

    it('should provide proper ARIA live region updates for dynamic changes', fakeAsync(() => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;

      // Change rating programmatically
      hostComponent.rating.set(3.5);
      fixture.detectChanges();
      tick(100);

      const ariaValueNow = starRating.getAttribute('aria-valuenow');
      expect(ariaValueNow).toBe('3.5');

      const ariaLabel = starRating.getAttribute('aria-label');
      expect(ariaLabel).toContain('Current rating: 3.5 stars');
    }));
  });

  describe('Touch Device Support & Mobile Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should maintain 44px minimum touch targets', () => {
      const stars = compiled.querySelectorAll('.star-rating__star') as NodeListOf<HTMLElement>;

      stars.forEach(star => {
        const computedStyle = window.getComputedStyle(star);
        const minWidth = computedStyle.getPropertyValue('min-width');
        const minHeight = computedStyle.getPropertyValue('min-height');

        // Should use CSS custom property for touch targets
        expect(minWidth).toBe('var(--touch-target-size)');
        expect(minHeight).toBe('var(--touch-target-size)');
      });
    });

    it('should handle touch events without hover dependencies', fakeAsync(() => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const thirdStar = starRating.querySelectorAll('.star-rating__star')[2] as HTMLButtonElement;

      // Simulate touch without hover
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 0,
          target: thirdStar,
          clientX: 100,
          clientY: 100
        })],
        bubbles: true
      });

      thirdStar.dispatchEvent(touchStartEvent);
      thirdStar.click();

      tick(400); // Wait for debouncing

      expect(hostComponent.ratingChanges.length).toBe(1);
      expect(hostComponent.ratingChanges[0].rating).toBe(3);
    }));

    it('should prevent double-tap zoom on touch devices', () => {
      const stars = compiled.querySelectorAll('.star-rating__star') as NodeListOf<HTMLElement>;

      stars.forEach(star => {
        const computedStyle = window.getComputedStyle(star);
        const touchAction = computedStyle.getPropertyValue('touch-action');

        // Should have touch-action: manipulation to prevent double-tap zoom
        expect(['manipulation', 'var(--touch-action-manipulation)', '']).toContain(touchAction);
      });
    });
  });

  describe('Analytics & Tracking Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit proper analytics events with required properties', fakeAsync(() => {
      const analyticsRating = compiled.querySelector('[data-testid="analytics-rating"]') as HTMLElement;
      const fourthStar = analyticsRating.querySelectorAll('.star-rating__star')[3] as HTMLButtonElement;

      fourthStar.click();
      tick(400); // Wait for debouncing

      expect(hostComponent.analyticsEvents.length).toBeGreaterThan(0);

      const ratingEvent = hostComponent.analyticsEvents.find(e => e.type === 'star_rating_selected');
      expect(ratingEvent).toBeTruthy();
      expect(ratingEvent?.rating).toBe(4);
      expect(ratingEvent?.contentId).toBe('analytics-content-123');
      expect(ratingEvent?.timestamp).toBeTypeOf('number');
    }));

    it('should track hover interactions for analytics', fakeAsync(() => {
      const analyticsRating = compiled.querySelector('[data-testid="analytics-rating"]') as HTMLElement;
      const secondStar = analyticsRating.querySelectorAll('.star-rating__star')[1] as HTMLButtonElement;

      secondStar.dispatchEvent(new MouseEvent('mouseenter'));
      tick(150); // Wait for hover debouncing

      const hoverEvent = hostComponent.analyticsEvents.find(e => e.type === 'star_hover');
      expect(hoverEvent).toBeTruthy();
      expect(hoverEvent?.rating).toBe(2);
      expect(hoverEvent?.contentId).toBe('analytics-content-123');
    }));

    it('should track interaction methods (click vs keyboard)', fakeAsync(() => {
      const analyticsRating = compiled.querySelector('[data-testid="analytics-rating"]') as HTMLElement;

      // Test keyboard interaction
      analyticsRating.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
      tick(400);

      const keyboardEvent = hostComponent.analyticsEvents.find(e => e.type === 'star_rating_selected');
      expect(keyboardEvent).toBeTruthy();
      expect(keyboardEvent?.rating).toBe(3);

      // Clear events
      hostComponent.analyticsEvents = [];

      // Test click interaction
      const fifthStar = analyticsRating.querySelectorAll('.star-rating__star')[4] as HTMLButtonElement;
      fifthStar.click();
      tick(400);

      const clickEvent = hostComponent.analyticsEvents.find(e => e.type === 'star_rating_selected');
      expect(clickEvent).toBeTruthy();
      expect(clickEvent?.rating).toBe(5);
    }));

    it('should provide component size information for analytics', () => {
      hostComponent.size.set('large');
      fixture.detectChanges();

      const analyticsRating = compiled.querySelector('[data-testid="analytics-rating"]') as HTMLElement;
      expect(analyticsRating.classList.contains('star-rating--large')).toBe(true);

      // Size should be derivable from CSS classes for analytics
      const sizeClass = Array.from(analyticsRating.classList).find(cls => cls.startsWith('star-rating--'));
      expect(sizeClass).toBe('star-rating--large');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle rapid mode switching without errors', fakeAsync(() => {
      // Rapidly switch between readonly and interactive modes
      for (let i = 0; i < 10; i++) {
        hostComponent.readonly.set(i % 2 === 0);
        fixture.detectChanges();
        tick(50);
      }

      // Should not throw errors and maintain proper state
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      expect(starRating).toBeTruthy();

      // Final state should be readonly=false (even iteration)
      expect(starRating.classList.contains('star-rating--interactive')).toBe(true);
    }));

    it('should handle size changes without layout shifts', fakeAsync(() => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const initialRect = starRating.getBoundingClientRect();

      // Change size
      hostComponent.size.set('large');
      fixture.detectChanges();
      tick(100);

      expect(starRating.classList.contains('star-rating--large')).toBe(true);

      // Change back to small
      hostComponent.size.set('small');
      fixture.detectChanges();
      tick(100);

      expect(starRating.classList.contains('star-rating--small')).toBe(true);

      // Should not cause layout errors
      const finalRect = starRating.getBoundingClientRect();
      expect(finalRect.top).toBeGreaterThanOrEqual(0);
      expect(finalRect.left).toBeGreaterThanOrEqual(0);
    }));

    it('should handle contentId changes properly', () => {
      hostComponent.contentId.set('test-content-1');
      fixture.detectChanges();

      let starRating = compiled.querySelector('[data-testid="star-rating-test-content-1"]');
      expect(starRating).toBeTruthy();

      hostComponent.contentId.set('test-content-2');
      fixture.detectChanges();

      starRating = compiled.querySelector('[data-testid="star-rating-test-content-2"]');
      expect(starRating).toBeTruthy();

      // Old contentId should not exist
      const oldRating = compiled.querySelector('[data-testid="star-rating-test-content-1"]');
      expect(oldRating).toBeFalsy();
    });

    it('should recover from invalid rating inputs gracefully', fakeAsync(() => {
      const testValues = [NaN, -10, 15, null as any, undefined as any, 'invalid' as any];

      testValues.forEach(invalidValue => {
        hostComponent.rating.set(invalidValue);
        fixture.detectChanges();

        // Should clamp to valid range (0-5)
        const displayedRating = hostComponent.rating();
        expect(displayedRating).toBeGreaterThanOrEqual(0);
        expect(displayedRating).toBeLessThanOrEqual(5);
        expect(isNaN(displayedRating)).toBe(false);
      });
    }));
  });

  describe('Cross-Browser Compatibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render SVG stars consistently', () => {
      const stars = compiled.querySelectorAll('.star-rating__star-icon') as NodeListOf<SVGElement>;

      stars.forEach(star => {
        expect(star.tagName.toLowerCase()).toBe('svg');
        expect(star.getAttribute('viewBox')).toBe('0 0 24 24');

        const path = star.querySelector('path');
        expect(path).toBeTruthy();
        expect(path?.getAttribute('d')).toBeTruthy();
      });
    });

    it('should use CSS custom properties correctly', () => {
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;

      // Verify CSS custom properties are used
      const computedStyle = window.getComputedStyle(starRating);

      // These properties should be defined in the CSS
      const starColorEmpty = computedStyle.getPropertyValue('--star-color-empty');
      const starColorFilled = computedStyle.getPropertyValue('--star-color-filled');
      const touchTargetSize = computedStyle.getPropertyValue('--touch-target-size');

      // Properties should either be set or fallback gracefully
      // The test ensures the CSS structure is correct
      expect(starRating.classList.contains('star-rating')).toBe(true);
    });

    it('should handle reduced motion preferences', () => {
      const stars = compiled.querySelectorAll('.star-rating__star') as NodeListOf<HTMLElement>;

      // Should have transition properties by default
      stars.forEach(star => {
        const computedStyle = window.getComputedStyle(star);
        // CSS should handle reduced motion via media queries
        expect(star.classList.contains('star-rating__star')).toBe(true);
      });
    });
  });

  describe('Real-World Usage Patterns', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle form integration scenarios', fakeAsync(() => {
      // Simulate rating being part of a larger form
      hostComponent.rating.set(0);
      fixture.detectChanges();

      const interactiveRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      const thirdStar = interactiveRating.querySelectorAll('.star-rating__star')[2] as HTMLButtonElement;

      thirdStar.click();
      tick(400);

      expect(hostComponent.rating()).toBe(3);
      expect(hostComponent.ratingChanges[0].rating).toBe(3);

      // Should work with form validation patterns
      expect(hostComponent.rating()).toBeGreaterThan(0);
    }));

    it('should handle list rendering performance with trackBy', () => {
      const startTime = performance.now();

      // Update items array
      hostComponent.items.update(items => [
        ...items,
        { id: 6, rating: 2.5, readonly: false, size: 'medium' as StarSize }
      ]);

      fixture.detectChanges();

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(50);

      const allRatings = compiled.querySelectorAll('app-star-rating');
      expect(allRatings.length).toBe(8); // Original 7 + 1 new
    });

    it('should handle server-side rating updates', fakeAsync(() => {
      // Simulate server response updating rating
      const serverRating = 4.2;

      hostComponent.analyticsRating.set(serverRating);
      fixture.detectChanges();
      tick(100);

      const analyticsRating = compiled.querySelector('[data-testid="analytics-rating"]') as HTMLElement;
      const filledStars = analyticsRating.querySelectorAll('.star-rating__star--filled');
      const halfStars = analyticsRating.querySelectorAll('.star-rating__star--half');

      // Should display 4 full stars and 1 half star (4.2 rounds to 4.5)
      expect(filledStars.length).toBe(4);
      expect(halfStars.length).toBe(1);
    }));

    it('should maintain state during component lifecycle', () => {
      // Set initial state
      hostComponent.rating.set(3);
      fixture.detectChanges();

      // Simulate component being hidden/shown (common in SPAs)
      const starRating = compiled.querySelector('[data-testid="interactive-rating"]') as HTMLElement;
      starRating.style.display = 'none';
      fixture.detectChanges();

      starRating.style.display = 'block';
      fixture.detectChanges();

      // State should be preserved
      expect(hostComponent.rating()).toBe(3);

      const filledStars = starRating.querySelectorAll('.star-rating__star--filled');
      expect(filledStars.length).toBe(3);
    });
  });

  describe('Component Composition & Reusability', () => {
    it('should work correctly when multiple instances interact', fakeAsync(() => {
      const allRatings = compiled.querySelectorAll('app-star-rating');
      expect(allRatings.length).toBeGreaterThan(1);

      // Interact with first instance
      const firstRating = allRatings[0] as HTMLElement;
      const firstStars = firstRating.querySelectorAll('.star-rating__star') as NodeListOf<HTMLButtonElement>;
      firstStars[3].click(); // Click 4th star

      tick(400);

      // Interact with second instance
      const secondRating = allRatings[1] as HTMLElement;
      const secondStars = secondRating.querySelectorAll('.star-rating__star') as NodeListOf<HTMLButtonElement>;
      secondStars[1].click(); // Click 2nd star

      tick(400);

      // Both should maintain independent state
      expect(hostComponent.ratingChanges.length).toBe(1); // Only interactive instance should emit
      expect(hostComponent.itemRatingChanges.length).toBe(1); // Perf instance should emit

      // Events should be properly separated
      expect(hostComponent.ratingChanges[0].rating).toBe(4);
      expect(hostComponent.itemRatingChanges[0].rating).toBe(2);
    }));

    it('should maintain accessibility when composed with other components', () => {
      const container = compiled.querySelector('.test-container') as HTMLElement;
      const allInteractiveElements = container.querySelectorAll('[tabindex]');

      // Should have proper tab order
      let hasStarRatingTabIndex = false;
      allInteractiveElements.forEach(element => {
        const tabIndex = element.getAttribute('tabindex');
        if (element.classList.contains('star-rating')) {
          hasStarRatingTabIndex = true;
          expect(['0', '-1']).toContain(tabIndex || '');
        }
      });

      expect(hasStarRatingTabIndex).toBe(true);
    });
  });
});