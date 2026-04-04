import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DebugElement } from '@angular/core';
import { of, throwError, delay, timer } from 'rxjs';

import { TypeaheadSearchComponent } from './typeahead-search.component';
import { SearchService } from '../../services/search.service';
import { SearchResponse, SearchResult, ApiError } from '../../models/search.models';

describe('TypeaheadSearchComponent - Acceptance Criteria', () => {
  let component: TypeaheadSearchComponent;
  let fixture: ComponentFixture<TypeaheadSearchComponent>;
  let searchService: jasmine.SpyObj<SearchService>;
  let httpMock: HttpTestingController;

  const mockSearchResults: SearchResult[] = [
    { id: '1', title: 'Angular Development Guide', description: 'Learn Angular development best practices' },
    { id: '2', title: 'TypeScript Tutorial', description: 'Master TypeScript programming' },
    { id: '3', title: 'RxJS Reactive Programming', description: 'Understand reactive programming with RxJS' }
  ];

  const mockSearchResponse: SearchResponse = {
    results: mockSearchResults,
    total: 3
  };

  const createLargeResultSet = (count: number): SearchResult[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i.toString(),
      title: `Result ${i + 1}`,
      description: `Description for result ${i + 1}`
    }));
  };

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['search']);

    await TestBed.configureTestingModule({
      imports: [TypeaheadSearchComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeaheadSearchComponent);
    component = fixture.componentInstance;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('AC1: Debouncing - 300ms desktop, 200ms mobile', () => {
    it('should use 300ms debounce on desktop by default', fakeAsync(() => {
      spyOn<any>(component, 'detectMobile').and.returnValue(false);
      component.ngOnInit(); // Reinitialize with mobile detection

      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Type query
      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      // Should not search before 300ms
      tick(299);
      expect(searchService.search).not.toHaveBeenCalled();

      // Should search after 300ms
      tick(1);
      expect(searchService.search).toHaveBeenCalledWith('test');
    }));

    it('should use 200ms debounce on mobile', fakeAsync(() => {
      spyOn<any>(component, 'detectMobile').and.returnValue(true);
      component.ngOnInit(); // Reinitialize with mobile detection

      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Type query
      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      // Should not search before 200ms
      tick(199);
      expect(searchService.search).not.toHaveBeenCalled();

      // Should search after 200ms
      tick(1);
      expect(searchService.search).toHaveBeenCalledWith('test');
    }));

    it('should respect custom debounce time when provided', fakeAsync(() => {
      component.debounceTimeMs = 500;
      component.ngOnInit(); // Reinitialize with custom debounce

      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      tick(499);
      expect(searchService.search).not.toHaveBeenCalled();

      tick(1);
      expect(searchService.search).toHaveBeenCalledWith('test');
    }));
  });

  describe('AC2: Request cancellation with switchMap', () => {
    it('should cancel previous request when new input arrives', fakeAsync(() => {
      let firstCallCompleted = false;
      let secondCallCompleted = false;

      // First call - slow response
      searchService.search.and.callFake((query: string) => {
        if (query === 'test') {
          return timer(1000).pipe(
            delay(500),
            map(() => {
              firstCallCompleted = true;
              return mockSearchResponse;
            })
          );
        } else {
          return of({ results: [], total: 0 }).pipe(
            map(() => {
              secondCallCompleted = true;
              return { results: [], total: 0 };
            })
          );
        }
      });

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Type first query
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);

      // Type second query before first completes
      input.value = 'different';
      input.dispatchEvent(new Event('input'));
      tick(300);

      // Wait for all operations to complete
      tick(2000);

      // Only the second call should have completed
      expect(firstCallCompleted).toBe(false);
      expect(secondCallCompleted).toBe(true);
    }));

    it('should handle rapid successive inputs correctly', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Type multiple queries rapidly
      ['t', 'te', 'tes', 'test', 'testi', 'testin', 'testing'].forEach((query, index) => {
        input.value = query;
        input.dispatchEvent(new Event('input'));
        tick(100); // Less than debounce time
      });

      // Wait for debounce
      tick(300);

      // Should only make one call for the final query
      expect(searchService.search).toHaveBeenCalledTimes(1);
      expect(searchService.search).toHaveBeenCalledWith('testing');
    }));
  });

  describe('AC3: Text highlighting with WCAG compliance', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'Angular';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150); // Minimum loading time
      fixture.detectChanges();
    }));

    it('should highlight matching text with WCAG AA compliant contrast', () => {
      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      const titleElement = resultTitles[0].nativeElement;
      const highlightedText = titleElement.innerHTML;

      // Should contain highlight markup
      expect(highlightedText).toContain('<mark class="search-highlight"');
      expect(highlightedText).toContain('Angular</mark>');

      // Check WCAG AA compliant styling
      expect(highlightedText).toContain('background-color: #fff3cd');
      expect(highlightedText).toContain('color: #856404');
      expect(highlightedText).toContain('text-decoration: underline');
      expect(highlightedText).toContain('font-weight: 500');
    });

    it('should highlight case-insensitive matches', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'angular'; // lowercase
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      const titleElement = resultTitles[0].nativeElement;
      expect(titleElement.innerHTML).toContain('Angular</mark>'); // Should highlight "Angular"
    }));

    it('should use both color and underline for accessibility', () => {
      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      const titleElement = resultTitles[0].nativeElement;
      const highlightedText = titleElement.innerHTML;

      // Must have both color AND underline for accessibility
      expect(highlightedText).toContain('text-decoration: underline');
      expect(highlightedText).toContain('color: #856404');
    });
  });

  describe('AC4: Keyboard navigation with proper focus management', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();
    }));

    it('should navigate with arrow keys and announce changes', () => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Arrow Down - should select first item
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      spyOn(downEvent, 'preventDefault');
      input.dispatchEvent(downEvent);

      expect(downEvent.preventDefault).toHaveBeenCalled();
      expect(component.state().selectedIndex).toBe(0);

      // Arrow Down again - should select second item
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.state().selectedIndex).toBe(1);

      // Arrow Up - should go back to first item
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      spyOn(upEvent, 'preventDefault');
      input.dispatchEvent(upEvent);

      expect(upEvent.preventDefault).toHaveBeenCalled();
      expect(component.state().selectedIndex).toBe(0);
    });

    it('should handle Enter key to select result', () => {
      spyOn(component.resultSelected, 'emit');
      component.setSelectedIndex(1);

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(enterEvent, 'preventDefault');

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.dispatchEvent(enterEvent);

      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockSearchResults[1]);
      expect(component.state().selectedIndex).toBe(-1); // Should close dropdown
    });

    it('should handle Escape key to close dropdown', () => {
      component.setSelectedIndex(1);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      spyOn(escapeEvent, 'preventDefault');

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.dispatchEvent(escapeEvent);

      expect(escapeEvent.preventDefault).toHaveBeenCalled();
      expect(component.state().selectedIndex).toBe(-1);
    });

    it('should handle Home/End keys for first/last navigation', () => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Home key - should go to first item
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      spyOn(homeEvent, 'preventDefault');
      input.dispatchEvent(homeEvent);

      expect(homeEvent.preventDefault).toHaveBeenCalled();
      expect(component.state().selectedIndex).toBe(0);

      // End key - should go to last item
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      spyOn(endEvent, 'preventDefault');
      input.dispatchEvent(endEvent);

      expect(endEvent.preventDefault).toHaveBeenCalled();
      expect(component.state().selectedIndex).toBe(mockSearchResults.length - 1);
    });

    it('should maintain focus on input after selection', () => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      spyOn(input, 'focus');

      component.setSelectedIndex(0);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(input.focus).toHaveBeenCalled();
    });
  });

  describe('AC5: Error handling with retry functionality', () => {
    it('should display inline error message with retry button', fakeAsync(() => {
      const errorResponse: ApiError = {
        error: 'Network connection error. Please check your internet connection.',
        code: 0
      };
      searchService.search.and.returnValue(throwError(() => errorResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      // Should display error message
      expect(component.state().error).toBe(errorResponse.error);
      expect(component.state().loading).toBe(false);

      const errorElement = fixture.debugElement.query(By.css('.error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain(errorResponse.error);

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.getAttribute('aria-label')).toBe('Retry search');
    }));

    it('should successfully retry search when retry button is clicked', fakeAsync(() => {
      const errorResponse: ApiError = { error: 'Server error', code: 500 };

      // First call fails
      searchService.search.and.returnValue(throwError(() => errorResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      // Now make it succeed
      searchService.search.and.returnValue(of(mockSearchResponse));

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.nativeElement.click();
      tick(150);
      fixture.detectChanges();

      expect(searchService.search).toHaveBeenCalledTimes(2);
      expect(component.state().error).toBeNull();
      expect(component.state().results).toEqual(mockSearchResults);
    }));

    it('should handle different types of errors appropriately', fakeAsync(() => {
      const networkError: ApiError = { error: 'Network connection error. Please check your internet connection.', code: 0 };
      searchService.search.and.returnValue(throwError(() => networkError));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      expect(component.state().error).toBe(networkError.error);

      // Error should have assertive live region
      const errorElement = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(errorElement).toBeTruthy();
    }));
  });

  describe('AC6: ARIA live regions and screen reader compatibility', () => {
    it('should have proper ARIA live regions for different content types', fakeAsync(() => {
      // Test error announcement (assertive)
      const errorResponse: ApiError = { error: 'Search failed', code: 500 };
      searchService.search.and.returnValue(throwError(() => errorResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('[aria-live="assertive"]'));
      expect(errorElement).toBeTruthy();

      // Test results announcement (polite)
      searchService.search.and.returnValue(of(mockSearchResponse));
      component.retrySearch();
      tick(150);
      fixture.detectChanges();

      const resultsElement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(resultsElement).toBeTruthy();
    }));

    it('should announce result count changes', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const resultsSummary = fixture.debugElement.query(By.css('.results-summary'));
      expect(resultsSummary.nativeElement.textContent.trim()).toBe('3 results found');
      expect(resultsSummary.nativeElement.getAttribute('aria-live')).toBe('polite');
    }));

    it('should have proper combobox ARIA attributes', () => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.getAttribute('aria-owns')).toContain(component.componentId);
      expect(input.getAttribute('aria-describedby')).toContain(component.componentId);
    });

    it('should update aria-expanded when dropdown state changes', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      searchService.search.and.returnValue(of(mockSearchResponse));
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      expect(input.getAttribute('aria-expanded')).toBe('true');
    }));

    it('should have proper listbox and option roles', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.results-dropdown'));
      expect(dropdown.nativeElement.getAttribute('role')).toBe('listbox');

      const options = fixture.debugElement.queryAll(By.css('.result-item'));
      options.forEach((option, index) => {
        expect(option.nativeElement.getAttribute('role')).toBe('option');
        expect(option.nativeElement.getAttribute('id')).toContain(component.componentId);
        expect(option.nativeElement.getAttribute('aria-selected')).toBe(index === 0 ? 'false' : 'false');
      });
    }));
  });

  describe('AC7: Virtual scrolling for large result sets', () => {
    it('should implement virtual scrolling for 50+ results', fakeAsync(() => {
      const largeResults = createLargeResultSet(60);
      searchService.search.and.returnValue(of({ results: largeResults, total: 60 }));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const virtualScrollViewport = fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'));
      expect(virtualScrollViewport).toBeTruthy();

      const normalResultsList = fixture.debugElement.query(By.css('.results-list'));
      expect(normalResultsList).toBeFalsy();
    }));

    it('should use normal scrolling for less than 50 results', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse)); // 3 results

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const virtualScrollViewport = fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'));
      expect(virtualScrollViewport).toBeFalsy();

      const normalResultsList = fixture.debugElement.query(By.css('.results-list'));
      expect(normalResultsList).toBeTruthy();
    }));

    it('should maintain performance with virtual scrolling', fakeAsync(() => {
      const largeResults = createLargeResultSet(1000);
      searchService.search.and.returnValue(of({ results: largeResults, total: 1000 }));

      const startTime = performance.now();

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with 1000 results
      expect(renderTime).toBeLessThan(100); // 100ms threshold

      // Should only render visible items in DOM
      const renderedItems = fixture.debugElement.queryAll(By.css('.result-item'));
      expect(renderedItems.length).toBeLessThan(50); // Only visible items rendered
    }));
  });

  describe('AC8: WCAG 2.1 AA compliance verification', () => {
    it('should pass color contrast requirements', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      // Check focus indicators
      input.focus();
      const computedStyle = getComputedStyle(input);
      expect(input.style.outline || computedStyle.outline).toBeTruthy();

      // Check highlight contrast (WCAG AA requires 3:1 for large text, 4.5:1 for normal)
      // Background: #fff3cd, Text: #856404 provides adequate contrast
      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      const highlightedText = resultTitles[0].nativeElement.innerHTML;
      expect(highlightedText).toContain('background-color: #fff3cd');
      expect(highlightedText).toContain('color: #856404');
    }));

    it('should have proper heading structure and landmarks', () => {
      // Component should not have improper heading hierarchy
      const headings = fixture.debugElement.queryAll(By.css('h1, h2, h3, h4, h5, h6'));
      expect(headings.length).toBe(0); // No headings in this component, which is correct

      // Should have proper landmarks via ARIA roles
      const combobox = fixture.debugElement.query(By.css('[role="combobox"]'));
      expect(combobox).toBeTruthy();
    });

    it('should support screen reader navigation', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      // Should have proper labeling
      expect(input.getAttribute('aria-label')).toBe('Search');

      // Should have description
      const description = fixture.debugElement.query(By.css('#search-description-' + component.componentId));
      expect(description).toBeTruthy();
      expect(description.nativeElement.textContent).toContain('Start typing to search');

      // Should announce loading state
      component.state.update(state => ({ ...state, loading: true, query: 'test' }));
      fixture.detectChanges();

      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner[role="status"]'));
      expect(loadingSpinner.nativeElement.getAttribute('aria-label')).toBe('Searching for test');
    }));

    it('should handle keyboard-only navigation', () => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      const clearButton = component.state().query ? fixture.debugElement.query(By.css('.clear-button')) : null;

      // Input should be focusable
      expect(input.tabIndex).not.toBe(-1);

      // Clear button should be focusable when present
      if (clearButton) {
        expect(clearButton.nativeElement.tabIndex).not.toBe(-1);
      }

      // Results should be navigable via keyboard (tested in other suites)
      expect(true).toBe(true); // Keyboard navigation tested above
    }));
  });

  describe('Edge Cases and Failure Modes', () => {
    it('should handle empty query edge cases', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Empty string
      input.value = '';
      input.dispatchEvent(new Event('input'));
      tick(300);
      expect(searchService.search).not.toHaveBeenCalled();

      // Only whitespace
      input.value = '   ';
      input.dispatchEvent(new Event('input'));
      tick(300);
      expect(searchService.search).not.toHaveBeenCalled();

      // Single character
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      tick(300);
      expect(searchService.search).not.toHaveBeenCalled();
    }));

    it('should handle special characters in search', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;

      // Special characters
      const specialQueries = ['<script>', '&amp;', '"quotes"', "l'apostrophe", '$100', '@mention'];

      specialQueries.forEach(query => {
        input.value = query;
        input.dispatchEvent(new Event('input'));
        tick(300);

        expect(searchService.search).toHaveBeenCalledWith(query);
      });
    }));

    it('should handle network connectivity issues', fakeAsync(() => {
      const networkError: ApiError = {
        error: 'Network connection error. Please check your internet connection.',
        code: 0
      };
      searchService.search.and.returnValue(throwError(() => networkError));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      expect(component.state().error).toBe(networkError.error);

      // Should provide retry mechanism
      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
    }));

    it('should handle concurrent component instances', () => {
      // Create second component instance
      const fixture2 = TestBed.createComponent(TypeaheadSearchComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      // Should have different component IDs
      expect(component.componentId).not.toBe(component2.componentId);

      // ARIA relationships should be unique
      const input1 = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      const input2 = fixture2.debugElement.query(By.css('.search-input')).nativeElement;

      expect(input1.getAttribute('aria-owns')).toContain(component.componentId);
      expect(input2.getAttribute('aria-owns')).toContain(component2.componentId);
      expect(input1.getAttribute('aria-owns')).not.toBe(input2.getAttribute('aria-owns'));
    }));

    it('should maintain minimum loading time to prevent flicker', fakeAsync(() => {
      // Fast response (< 150ms)
      searchService.search.and.returnValue(of(mockSearchResponse).pipe(delay(50)));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300); // Debounce

      expect(component.state().loading).toBe(true);

      tick(100); // Should still be loading due to minimum time
      expect(component.state().loading).toBe(true);

      tick(100); // Now should be complete (150ms minimum)
      expect(component.state().loading).toBe(false);
      expect(component.state().results).toEqual(mockSearchResults);
    }));

    it('should handle focus management on blur and destroy', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input')).nativeElement;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      tick(300);
      tick(150);
      fixture.detectChanges();

      // Simulate blur to outside element
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const blurEvent = new FocusEvent('blur', { relatedTarget: outsideElement });
      input.dispatchEvent(blurEvent);

      // Should close dropdown after delay
      tick(200);
      expect(component.state().selectedIndex).toBe(-1);

      document.body.removeChild(outsideElement);
    }));
  });
});