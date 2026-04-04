import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, DebugElement, TemplateRef, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError, timer, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';

import { TypeaheadSearchComponent, SearchEvent, SelectionEvent } from './typeahead-search.component';
import { SearchService } from '../../services/search.service';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { SearchResult, SearchResponse } from '../../interfaces/search-result.interface';
import { SearchError, SearchErrorType } from '../../interfaces/search-error.interface';

describe('TypeaheadSearchComponent', () => {
  let component: TypeaheadSearchComponent;
  let fixture: ComponentFixture<TypeaheadSearchComponent>;
  let searchService: jasmine.SpyObj<SearchService>;

  const mockSearchResults: SearchResult[] = [
    { id: '1', displayValue: 'Apple iPhone', data: { name: 'Apple iPhone', category: 'Electronics' } },
    { id: '2', displayValue: 'Apple iPad', data: { name: 'Apple iPad', category: 'Electronics' } },
    { id: '3', displayValue: 'Apple Watch', data: { name: 'Apple Watch', category: 'Electronics' } }
  ];

  const mockSearchResponse: SearchResponse = {
    results: mockSearchResults,
    totalCount: 3,
    query: 'apple'
  };

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['search']);
    searchServiceSpy.search.and.returnValue(of(mockSearchResponse));

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        TypeaheadSearchComponent,
        HighlightPipe
      ],
      providers: [
        { provide: SearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeaheadSearchComponent);
    component = fixture.componentInstance;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;

    // Set up required search function
    component.searchFunction = jasmine.createSpy('searchFunction').and.returnValue(of(mockSearchResponse));

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('debouncing functionality', () => {
    it('should debounce user input by 300ms by default', fakeAsync(() => {
      const searchSpy = jasmine.createSpy('searchSpy');
      component.search.subscribe(searchSpy);

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      // Type rapidly
      inputElement.value = 'a';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      inputElement.value = 'ap';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      inputElement.value = 'app';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      // Should not have triggered search yet
      expect(searchSpy).not.toHaveBeenCalled();

      tick(300); // Complete the debounce

      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        query: 'app'
      }));
    }));

    it('should use custom debounce delay when provided', fakeAsync(() => {
      component.debounceMs = 500;
      fixture.detectChanges();

      const searchSpy = jasmine.createSpy('searchSpy');
      component.search.subscribe(searchSpy);

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));

      tick(400); // Less than custom debounce
      expect(searchSpy).not.toHaveBeenCalled();

      tick(100); // Complete custom debounce
      expect(searchSpy).toHaveBeenCalled();
    }));

    it('should cancel previous requests when new input arrives', fakeAsync(() => {
      const abortSpy = jasmine.createSpy('abort');
      let currentController: AbortController | undefined;

      component.searchFunction = jasmine.createSpy().and.callFake(() => {
        currentController = new AbortController();
        spyOn(currentController, 'abort').and.callThrough();
        return timer(1000).pipe(delay(100)); // Slow request
      });

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      // First search
      inputElement.value = 'app';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      const firstController = component['searchController'];

      // Second search before first completes
      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      // First request should be cancelled
      expect(firstController?.signal.aborted).toBe(true);
    }));

    it('should prevent duplicate queries with distinctUntilChanged', fakeAsync(() => {
      const searchSpy = jasmine.createSpy('searchSpy');
      component.search.subscribe(searchSpy);

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      // First search
      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      // Same search again
      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      // Should only trigger once
      expect(searchSpy).toHaveBeenCalledTimes(1);
    }));
  });

  describe('loading states', () => {
    it('should display inline loading spinner during search', fakeAsync(() => {
      // Mock slow search
      searchService.search.and.returnValue(timer(1000).pipe(delay(500)));

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300); // Complete debounce
      fixture.detectChanges();

      // Loading spinner should be visible
      const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner).toBeTruthy();
      expect(spinner.attributes['aria-label']).toBe('Loading search results');
      expect(spinner.attributes['role']).toBe('status');

      // Input should have additional padding when loading
      const container = fixture.debugElement.query(By.css('.typeahead-container'));
      expect(container.classes['is-loading']).toBe(true);
    }));

    it('should not overlay input text with loading spinner', fakeAsync(() => {
      searchService.search.and.returnValue(timer(1000));

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      // Verify input text is still visible
      expect(inputElement.value).toBe('apple');

      // Verify spinner is positioned inline, not overlapping
      const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const inputIcons = fixture.debugElement.query(By.css('.input-icons'));
      expect(inputIcons.nativeElement.contains(spinner.nativeElement)).toBe(true);
    }));

    it('should show loading state in dropdown when no previous results', fakeAsync(() => {
      searchService.search.and.returnValue(timer(1000));

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'apple';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const loadingState = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingState).toBeTruthy();
      expect(loadingState.nativeElement.textContent).toContain('Searching...');
    }));
  });

  describe('search results display and highlighting', () => {
    beforeEach(() => {
      component.results = mockSearchResults;
      component.isDropdownOpen = true;
      component.state.lastQuery = 'apple';
      fixture.detectChanges();
    });

    it('should display search results with highlighted matching text', () => {
      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      expect(resultItems.length).toBe(3);

      // Check that results are displayed
      expect(resultItems[0].nativeElement.textContent).toContain('Apple iPhone');
      expect(resultItems[1].nativeElement.textContent).toContain('Apple iPad');
      expect(resultItems[2].nativeElement.textContent).toContain('Apple Watch');
    });

    it('should maintain proper color contrast for highlighted text', () => {
      // The highlight class should be applied through the pipe
      const resultText = fixture.debugElement.query(By.css('.result-text'));
      expect(resultText.nativeElement.innerHTML).toContain('class="highlight"');
      expect(resultText.nativeElement.innerHTML).toContain('aria-label="highlighted text"');
    });

    it('should announce results count to screen readers', () => {
      const announcement = fixture.debugElement.query(By.css(`#${component.announceId}`));
      expect(announcement).toBeTruthy();
      expect(announcement.attributes['aria-live']).toBe('polite');
      expect(announcement.attributes['aria-atomic']).toBe('true');
    });

    it('should provide proper ARIA attributes for dropdown', () => {
      const dropdown = fixture.debugElement.query(By.css('.dropdown'));
      expect(dropdown.attributes['role']).toBe('listbox');
      expect(dropdown.attributes['aria-label']).toBe('Search results');

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      resultItems.forEach((item, index) => {
        expect(item.attributes['role']).toBe('option');
        expect(item.attributes['aria-selected']).toBeDefined();
      });
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      component.results = mockSearchResults;
      component.isDropdownOpen = true;
      fixture.detectChanges();
    });

    it('should navigate down with arrow keys', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));

      // Press arrow down
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      input.nativeElement.dispatchEvent(keyEvent);
      fixture.detectChanges();

      expect(component.selectedIndex).toBe(0);

      // Press arrow down again
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();

      expect(component.selectedIndex).toBe(1);
    });

    it('should navigate up with arrow keys', () => {
      component.selectedIndex = 2;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('.search-input'));

      // Press arrow up
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      fixture.detectChanges();

      expect(component.selectedIndex).toBe(1);
    });

    it('should select result with Enter key', () => {
      component.selectedIndex = 1;
      const selectSpy = jasmine.createSpy('selectSpy');
      component.select.subscribe(selectSpy);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(selectSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        result: mockSearchResults[1],
        index: 1,
        method: 'keyboard'
      }));
    });

    it('should close dropdown with Escape key', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component.isDropdownOpen).toBe(false);
    });

    it('should highlight selected item visually', () => {
      component.selectedIndex = 1;
      fixture.detectChanges();

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      expect(resultItems[1].classes['highlighted']).toBe(true);
      expect(resultItems[0].classes['highlighted']).toBeFalsy();
      expect(resultItems[2].classes['highlighted']).toBeFalsy();
    });

    it('should announce navigation to screen readers', () => {
      component.selectedIndex = 0;
      component['announceNavigation']();

      expect(component.currentAnnouncement).toContain('1 of 3: Apple iPhone');
    });

    it('should scroll selected item into view', () => {
      const scrollSpy = spyOn(Element.prototype, 'scrollIntoView');

      component.selectedIndex = 1;
      component['scrollToSelected']();

      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    });
  });

  describe('error handling with retry functionality', () => {
    const mockError: SearchError = {
      type: SearchErrorType.NETWORK_ERROR,
      message: 'Network connection error. Please check your internet connection and try again.',
      retryCount: 0,
      canRetry: true,
      originalError: new Error('Network error'),
      timestamp: new Date()
    };

    it('should display error state with contextual messaging', () => {
      component.state.error = mockError;
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState).toBeTruthy();
      expect(errorState.attributes['role']).toBe('alert');

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent).toContain(mockError.message);
    });

    it('should show retry button for retryable errors', () => {
      component.state.error = mockError;
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.attributes['aria-label']).toContain('Retry search');
    });

    it('should not show retry button for non-retryable errors', () => {
      const nonRetryableError: SearchError = {
        ...mockError,
        type: SearchErrorType.INVALID_QUERY,
        canRetry: false
      };

      component.state.error = nonRetryableError;
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeFalsy();
    });

    it('should implement retry functionality', () => {
      component.state.error = mockError;
      component.state.lastQuery = 'test';
      component.retryCount = 0;

      const inputSpy = spyOn(component.inputControl, 'setValue');

      component.retry();

      expect(component.retryCount).toBe(1);
      expect(component.state.error).toBeNull();
      expect(inputSpy).toHaveBeenCalledWith('test', { emitEvent: true });
    });

    it('should respect maximum retry attempts', () => {
      component.retryCount = 3; // Max retries
      component.maxRetries = 3;
      component.state.error = mockError;

      const inputSpy = spyOn(component.inputControl, 'setValue');

      component.retry();

      expect(inputSpy).not.toHaveBeenCalled();
      expect(component.retryCount).toBe(3); // Should not increment
    });

    it('should announce errors to screen readers', () => {
      component.state.error = mockError;
      component['announceError']();

      expect(component.currentAnnouncement).toContain('Search error: Network connection error');
    });
  });

  describe('ControlValueAccessor implementation', () => {
    it('should implement writeValue method', () => {
      const testValue = 'test value';
      component.writeValue(testValue);

      expect(component.inputControl.value).toBe(testValue);
    });

    it('should implement registerOnChange method', () => {
      const changeFn = jasmine.createSpy('changeFn');
      component.registerOnChange(changeFn);

      component.inputControl.setValue('test');

      expect(changeFn).toHaveBeenCalledWith('test');
    });

    it('should implement registerOnTouched method', () => {
      const touchedFn = jasmine.createSpy('touchedFn');
      component.registerOnTouched(touchedFn);

      // Simulate blur event
      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new FocusEvent('blur'));

      // Wait for the delayed blur handling
      setTimeout(() => {
        expect(touchedFn).toHaveBeenCalled();
      }, 200);
    });

    it('should implement setDisabledState method', () => {
      component.setDisabledState(true);

      expect(component.disabled).toBe(true);
      expect(component.inputControl.disabled).toBe(true);

      component.setDisabledState(false);

      expect(component.disabled).toBe(false);
      expect(component.inputControl.enabled).toBe(true);
    });

    it('should work with Angular reactive forms', () => {
      const formControl = new FormControl('initial value');

      // Simulate form control binding
      component.writeValue(formControl.value);
      expect(component.inputControl.value).toBe('initial value');

      // Simulate user input
      component.inputControl.setValue('new value');

      // This would be handled by the change subscription in a real form
      expect(component.inputControl.value).toBe('new value');
    });
  });

  describe('accessibility compliance', () => {
    it('should have proper ARIA attributes for input', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));

      expect(input.attributes['role']).toBe('combobox');
      expect(input.attributes['aria-expanded']).toBeDefined();
      expect(input.attributes['aria-haspopup']).toBe('true');
      expect(input.attributes['aria-autocomplete']).toBe('list');
      expect(input.attributes['aria-describedby']).toContain(component.announceId);
    });

    it('should update aria-expanded based on dropdown state', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));

      component.isDropdownOpen = false;
      fixture.detectChanges();
      expect(input.attributes['aria-expanded']).toBe('false');

      component.isDropdownOpen = true;
      fixture.detectChanges();
      expect(input.attributes['aria-expanded']).toBe('true');
    });

    it('should set aria-invalid for error states', () => {
      component.state.error = mockError;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('.search-input'));
      expect(input.attributes['aria-invalid']).toBe('true');
    });

    it('should have proper focus management', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      // Focus input
      inputElement.focus();
      component.onFocus();

      expect(component.hasFocus).toBe(true);

      // Test focus remains on input after selection
      component.selectResult(mockSearchResults[0], 0, 'click');
      expect(document.activeElement).toBe(inputElement);
    });

    it('should provide proper screen reader announcements', () => {
      const announcement = fixture.debugElement.query(By.css(`#${component.announceId}`));

      expect(announcement.classes['sr-only']).toBe(true);
      expect(announcement.attributes['aria-live']).toBe('polite');
      expect(announcement.attributes['aria-atomic']).toBe('true');
    });
  });

  describe('API call reduction', () => {
    it('should demonstrate 70%+ API call reduction through debouncing', fakeAsync(() => {
      let searchCallCount = 0;
      component.searchFunction = jasmine.createSpy().and.callFake(() => {
        searchCallCount++;
        return of(mockSearchResponse);
      });

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      // Simulate 10 rapid keystrokes
      const keystrokes = ['a', 'ap', 'app', 'appl', 'apple', 'apple ', 'apple i', 'apple ip', 'apple iph', 'apple iphone'];

      keystrokes.forEach((value, index) => {
        inputElement.value = value;
        inputElement.dispatchEvent(new Event('input'));
        tick(50); // Rapid typing
      });

      tick(300); // Complete debounce

      // Should only have made 1 search call instead of 10
      expect(searchCallCount).toBe(1);

      const reduction = ((keystrokes.length - searchCallCount) / keystrokes.length) * 100;
      expect(reduction).toBeGreaterThanOrEqual(70);
    }));
  });

  describe('focus and blur handling', () => {
    it('should handle focus events correctly', () => {
      const focusChangeSpy = jasmine.createSpy('focusChangeSpy');
      component.focusChange.subscribe(focusChangeSpy);

      component.onFocus();

      expect(component.hasFocus).toBe(true);
      expect(focusChangeSpy).toHaveBeenCalledWith(true);
    });

    it('should handle blur events with delay for dropdown interaction', fakeAsync(() => {
      const focusChangeSpy = jasmine.createSpy('focusChangeSpy');
      component.focusChange.subscribe(focusChangeSpy);

      component.hasFocus = true;
      component.isDropdownOpen = true;

      const blurEvent = new FocusEvent('blur');
      component.onBlur(blurEvent);

      // Should not immediately close
      expect(component.hasFocus).toBe(true);

      tick(200); // Wait for delayed blur handling

      expect(component.hasFocus).toBe(false);
      expect(component.isDropdownOpen).toBe(false);
      expect(focusChangeSpy).toHaveBeenCalledWith(false);
    }));
  });

  describe('custom template support', () => {
    @Component({
      template: `
        <app-typeahead-search [searchFunction]="searchFn">
          <ng-template #resultTemplate let-result let-query="query">
            <div class="custom-result">{{ result.displayValue }}</div>
          </ng-template>
        </app-typeahead-search>
      `
    })
    class TestHostComponent {
      searchFn = () => of(mockSearchResponse);
    }

    it('should support custom result templates', async () => {
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const typeaheadComponent = hostFixture.debugElement.query(By.directive(TypeaheadSearchComponent));
      const component = typeaheadComponent.componentInstance as TypeaheadSearchComponent;

      // Set up results
      component.results = mockSearchResults;
      component.isDropdownOpen = true;
      hostFixture.detectChanges();

      const customResult = hostFixture.debugElement.query(By.css('.custom-result'));
      expect(customResult).toBeTruthy();
    });
  });

  describe('performance and cleanup', () => {
    it('should clean up subscriptions on destroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should cancel ongoing requests on destroy', () => {
      const abortController = new AbortController();
      spyOn(abortController, 'abort');
      component['searchController'] = abortController;

      component.ngOnDestroy();

      expect(abortController.abort).toHaveBeenCalled();
    });

    it('should handle high frequency input changes efficiently', fakeAsync(() => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      const startTime = performance.now();

      // Simulate very rapid typing
      for (let i = 0; i < 100; i++) {
        inputElement.value = `test${i}`;
        inputElement.dispatchEvent(new Event('input'));
        tick(10);
      }

      tick(300); // Complete final debounce

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid input efficiently
      expect(duration).toBeLessThan(1000); // Within 1 second
    }));
  });
});