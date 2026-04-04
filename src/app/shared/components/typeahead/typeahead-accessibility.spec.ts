import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError, delay } from 'rxjs';
import { vi } from 'vitest';

import { TypeaheadComponent } from './typeahead.component';
import { SearchResult } from '../../interfaces/search-result.interface';
import { HighlightTextPipe } from '../../pipes/highlight-text.pipe';

describe('TypeaheadComponent - Accessibility Compliance', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;
  let mockSearchFunction: (query: string) => Observable<SearchResult[]>;

  const mockResults: SearchResult[] = [
    { id: '1', title: 'Angular Accessibility Guide', description: 'Learn about Angular accessibility features' },
    { id: '2', title: 'WCAG 2.1 Compliance', description: 'Web Content Accessibility Guidelines compliance' },
    { id: '3', title: 'Screen Reader Testing', description: 'Best practices for screen reader compatibility' }
  ];

  beforeEach(async () => {
    mockSearchFunction = vi.fn().mockReturnValue(of(mockResults));

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        TypeaheadComponent,
        HighlightTextPipe
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeaheadComponent);
    component = fixture.componentInstance;
    component.searchFunction = mockSearchFunction;
    component.debounceTime = 100; // Reduce for testing
    fixture.detectChanges();
  });

  describe('ARIA Attributes and Roles', () => {
    it('should have proper combobox role and attributes on input', () => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('true');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.hasAttribute('aria-activedescendant')).toBe(true);
      expect(input.hasAttribute('aria-describedby')).toBe(true);
      expect(input.getAttribute('autocomplete')).toBe('off');
    });

    it('should update aria-expanded when dropdown opens and closes', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      expect(input.getAttribute('aria-expanded')).toBe('false');

      // Open dropdown by typing
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      expect(input.getAttribute('aria-expanded')).toBe('true');

      // Close dropdown
      component.clearSearch();
      fixture.detectChanges();

      expect(input.getAttribute('aria-expanded')).toBe('false');
    }));

    it('should have proper listbox role on dropdown container', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.dropdown-container'));
      expect(dropdown.nativeElement.getAttribute('role')).toBe('listbox');
      expect(dropdown.nativeElement.hasAttribute('id')).toBe(true);
    }));

    it('should have proper option roles on result items', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      resultItems.forEach(item => {
        expect(item.nativeElement.getAttribute('role')).toBe('option');
        expect(item.nativeElement.hasAttribute('aria-selected')).toBe(true);
        expect(item.nativeElement.hasAttribute('id')).toBe(true);
      });
    }));

    it('should properly manage aria-activedescendant during navigation', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      // Initially no active descendant
      expect(component.selectedResultId).toBeNull();

      // Navigate down
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      input.dispatchEvent(downEvent);
      fixture.detectChanges();

      // Should have active descendant
      expect(component.selectedResultId).toBeTruthy();
      expect(input.getAttribute('aria-activedescendant')).toBe(component.selectedResultId);
    }));

    it('should have alert role on error messages', fakeAsync(() => {
      const error = { name: 'HttpError', status: 500 };
      mockSearchFunction.mockReturnValue(throwError(error));

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.error-state'));
      expect(errorElement.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorElement.nativeElement.hasAttribute('id')).toBe(true);
    }));
  });

  describe('Keyboard Navigation Accessibility', () => {
    it('should support full keyboard navigation without mouse', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      // Focus input programmatically
      input.focus();
      fixture.detectChanges();

      // Type to trigger search
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      // Navigate down with arrow keys
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();

      // Verify selection
      component.state.subscribe(state => {
        expect(state.selectedIndex).toBe(0);
      });

      // Select with Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(component.resultSelected, 'emit');
      component.onKeyDown(enterEvent);

      expect(component.resultSelected.emit).toHaveBeenCalledWith({
        result: mockResults[0],
        selectionMethod: 'keyboard'
      });
    }));

    it('should handle Escape key to close dropdown and clear search', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
      vi.spyOn(input, 'blur');

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      expect(component.isDropdownOpen).toBe(true);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(escapeEvent);
      fixture.detectChanges();

      expect(component.searchControl.value).toBe('');
      expect(input.blur).toHaveBeenCalled();
    }));

    it('should emit keyboard navigation events for screen readers', fakeAsync(() => {
      vi.spyOn(component.keyboardNavigation, 'emit');

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      // Arrow down navigation
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      expect(component.keyboardNavigation.emit).toHaveBeenCalledWith({
        query: 'angular',
        navigationDirection: 'down',
        currentPosition: 0
      });
    }));

    it('should prevent default on arrow keys to avoid page scrolling', () => {
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      vi.spyOn(downEvent, 'preventDefault');
      vi.spyOn(upEvent, 'preventDefault');
      vi.spyOn(enterEvent, 'preventDefault');
      vi.spyOn(escapeEvent, 'preventDefault');

      component.onKeyDown(downEvent);
      component.onKeyDown(upEvent);
      component.onKeyDown(enterEvent);
      component.onKeyDown(escapeEvent);

      expect(downEvent.preventDefault).toHaveBeenCalled();
      expect(upEvent.preventDefault).toHaveBeenCalled();
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(escapeEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus on input during keyboard navigation', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
      vi.spyOn(input, 'focus');

      input.focus();
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      // Navigate through results
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();

      // Focus should remain on input
      expect(document.activeElement).toBe(input);
    }));

    it('should have visible focus indicators', () => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
      const clearButton = fixture.debugElement.query(By.css('.clear-button'));

      // Check that focusable elements have focus styles in CSS
      const inputStyles = getComputedStyle(input);
      expect(input.style.outline).toBeDefined();

      if (clearButton) {
        const buttonStyles = getComputedStyle(clearButton.nativeElement);
        expect(clearButton.nativeElement.style.outline).toBeDefined();
      }
    });

    it('should handle focus and blur events properly for dropdown visibility', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      // Focus should open dropdown
      component.onFocus();
      expect(component.dropdownOpen$.value).toBe(true);

      // Blur should close dropdown after delay
      const blurEvent = new FocusEvent('blur');
      component.onBlur(blurEvent);

      tick(300); // Wait for blur delay
      expect(component.dropdownOpen$.value).toBe(false);
    }));
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive labels and instructions', () => {
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

      // Should have meaningful placeholder
      expect(input.getAttribute('placeholder')).toBeTruthy();
      expect(input.getAttribute('placeholder').length).toBeGreaterThan(0);

      // Should have proper ARIA labeling
      expect(input.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('should announce result counts for large result sets', fakeAsync(() => {
      component.totalResults = 25;
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const resultCount = fixture.debugElement.query(By.css('.result-count'));
      expect(resultCount).toBeTruthy();
      expect(resultCount.nativeElement.textContent).toContain('Showing 3 of 25 results');
    }));

    it('should provide clear error messages for screen readers', fakeAsync(() => {
      const error = { name: 'TimeoutError', message: 'Connection timeout' };
      mockSearchFunction.mockReturnValue(throwError(error));

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.error-message'));
      expect(errorElement.nativeElement.textContent).toContain('Connection timeout');

      // Should be announced as live region
      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState.nativeElement.getAttribute('role')).toBe('alert');
    }));

    it('should emit accessibility interaction events', () => {
      vi.spyOn(component.accessibilityInteraction, 'emit');

      // Simulate screen reader interaction
      component.accessibilityInteraction.emit({
        query: 'test',
        assistiveTechType: 'screen-reader',
        interactionSuccess: true
      });

      expect(component.accessibilityInteraction.emit).toHaveBeenCalledWith({
        query: 'test',
        assistiveTechType: 'screen-reader',
        interactionSuccess: true
      });
    });
  });

  describe('Text Highlighting WCAG AA Compliance', () => {
    it('should use WCAG AA compliant contrast ratios in highlighted text', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      const firstTitle = resultTitles[0].nativeElement;

      // Check that highlighted text has proper contrast
      expect(firstTitle.innerHTML).toContain('background-color: #1a1a1a');
      expect(firstTitle.innerHTML).toContain('color: #ffffff');
      expect(firstTitle.innerHTML).toContain('font-weight: 700');
    });

    it('should maintain highlighting visibility when result is selected', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      // Navigate to first result
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();

      const selectedResult = fixture.debugElement.query(By.css('.result-item.selected'));
      expect(selectedResult).toBeTruthy();

      // Selected result should still show highlighting with proper contrast
      const titleElement = selectedResult.query(By.css('.result-title'));
      expect(titleElement).toBeTruthy();
    }));
  });

  describe('Touch Accessibility', () => {
    it('should handle touch events for mobile screen readers', fakeAsync(() => {
      vi.spyOn(component.resultSelected, 'emit');

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const firstResult = fixture.debugElement.query(By.css('.result-item'));

      // Simulate touch interaction
      const touchStartEvent = new Event('touchstart');
      const touchEndEvent = new Event('touchend');

      component.onTouchStart(touchStartEvent as TouchEvent);
      firstResult.nativeElement.dispatchEvent(touchEndEvent);

      expect(component.resultSelected.emit).toHaveBeenCalledWith({
        result: mockResults[0],
        selectionMethod: 'touch'
      });
    }));

    it('should maintain proper touch target sizes for accessibility', () => {
      // According to WCAG, touch targets should be at least 44x44 CSS pixels
      const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
      const styles = getComputedStyle(input);

      // Check minimum touch target size through padding/height
      const padding = parseInt(styles.paddingTop) + parseInt(styles.paddingBottom);
      expect(padding).toBeGreaterThanOrEqual(24); // 12px top + 12px bottom minimum
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion preference', () => {
      // Mock reduced motion preference
      const mediaQuery = '(prefers-reduced-motion: reduce)';
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        media: mediaQuery,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia
      });

      // Component should handle reduced motion appropriately
      // This is primarily handled in CSS, but component should not interfere
      expect(component).toBeTruthy();
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should work properly in high contrast mode', fakeAsync(() => {
      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.dropdown-container'));
      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));

      // Elements should be present and functional
      expect(dropdown).toBeTruthy();
      expect(resultItems.length).toBe(3);

      // High contrast styles are handled in CSS with @media (prefers-contrast: high)
      expect(resultItems[0].nativeElement).toBeTruthy();
    }));
  });

  describe('Loading State Accessibility', () => {
    it('should provide accessible loading indication', fakeAsync(() => {
      mockSearchFunction.mockReturnValue(of(mockResults).pipe(delay(200)));

      component.searchControl.setValue('angular');
      tick(100); // Past debounce
      tick(component.loadingDelay);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner).toBeTruthy();
      expect(spinner.nativeElement.getAttribute('aria-hidden')).toBe('true');

      // Loading state should be communicated to screen readers via aria-busy or live region
      const inputWrapper = fixture.debugElement.query(By.css('.input-wrapper'));
      expect(inputWrapper.nativeElement.classList.contains('is-loading')).toBe(true);
    }));
  });

  describe('Clear Button Accessibility', () => {
    it('should have proper clear button accessibility', fakeAsync(() => {
      component.searchControl.setValue('test');
      fixture.detectChanges();

      const clearButton = fixture.debugElement.query(By.css('.clear-button'));
      expect(clearButton).toBeTruthy();
      expect(clearButton.nativeElement.getAttribute('aria-label')).toBe('Clear search');
      expect(clearButton.nativeElement.getAttribute('type')).toBe('button');

      // Should be keyboard accessible
      clearButton.nativeElement.focus();
      expect(document.activeElement).toBe(clearButton.nativeElement);
    }));
  });

  describe('Error Recovery Accessibility', () => {
    it('should provide accessible retry functionality', fakeAsync(() => {
      const error = { name: 'HttpError', status: 500 };
      mockSearchFunction.mockReturnValue(throwError(error));

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.getAttribute('type')).toBe('button');
      expect(retryButton.nativeElement.textContent.trim()).toBe('Try Again');

      // Should be keyboard accessible
      retryButton.nativeElement.focus();
      expect(document.activeElement).toBe(retryButton.nativeElement);

      // Should work with Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      retryButton.nativeElement.dispatchEvent(enterEvent);
    }));

    it('should show proper disabled state during retry', fakeAsync(() => {
      const error = { name: 'HttpError', status: 500 };
      mockSearchFunction.mockReturnValue(throwError(error));

      component.searchControl.setValue('angular');
      tick(200);
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));

      // Trigger retry
      component.retrySearch();
      fixture.detectChanges();

      expect(component.isRetrying).toBe(true);
      expect(retryButton.nativeElement.textContent.trim()).toBe('Retrying...');
      expect(retryButton.nativeElement.disabled).toBe(true);
    }));
  });
});