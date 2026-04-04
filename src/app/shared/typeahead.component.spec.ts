import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';

import { TypeaheadComponent } from './typeahead.component';
import { SearchService } from './search.service';
import { HighlightPipe } from './highlight.pipe';
import { SearchResult, SearchResponse, SearchError } from './search.interface';

describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;
  let searchService: jasmine.SpyObj<SearchService>;
  let inputElement: HTMLInputElement;

  const mockResults: SearchResult[] = [
    { id: '1', title: 'Test Result 1', description: 'First test result' },
    { id: '2', title: 'Test Result 2', description: 'Second test result' },
    { id: '3', title: 'Another Test', description: 'Third test result' }
  ];

  const mockResponse: SearchResponse = {
    results: mockResults,
    totalCount: 3,
    hasMore: false
  };

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['search']);

    await TestBed.configureTestingModule({
      imports: [
        TypeaheadComponent,
        FormsModule,
        HttpClientTestingModule,
        HighlightPipe
      ],
      providers: [
        { provide: SearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
    searchService.search.and.returnValue(of(mockResponse));
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TypeaheadComponent);
    component = fixture.componentInstance;
    inputElement = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default config', () => {
      expect(component.placeholder).toBe('Search...');
      expect(component.maxLength).toBe(150);
      expect(component.minQueryLength).toBe(1);
    });

    it('should set proper ARIA attributes on input', () => {
      expect(inputElement.getAttribute('aria-expanded')).toBe('false');
      expect(inputElement.getAttribute('aria-haspopup')).toBe('listbox');
      expect(inputElement.getAttribute('aria-autocomplete')).toBe('list');
      expect(inputElement.getAttribute('role')).toBe('combobox');
    });

    it('should display character count', () => {
      const characterCount = fixture.debugElement.query(By.css('.character-count'));
      expect(characterCount.nativeElement.textContent.trim()).toBe('0/150');
    });
  });

  describe('Input Handling', () => {
    it('should update query on input', fakeAsync(() => {
      const testQuery = 'test query';

      inputElement.value = testQuery;
      inputElement.dispatchEvent(new Event('input'));
      tick();

      component.state$.subscribe(state => {
        expect(state.query).toBe(testQuery);
      });
    }));

    it('should enforce character limit', () => {
      const longText = 'a'.repeat(200);

      inputElement.value = longText;
      inputElement.dispatchEvent(new Event('input'));

      expect(inputElement.value.length).toBe(150);
    });

    it('should update character count display', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick();
      fixture.detectChanges();

      const characterCount = fixture.debugElement.query(By.css('.character-count'));
      expect(characterCount.nativeElement.textContent.trim()).toBe('4/150');
    }));

    it('should show warning style when approaching character limit', fakeAsync(() => {
      const warningText = 'a'.repeat(130); // > 80% of 150

      inputElement.value = warningText;
      inputElement.dispatchEvent(new Event('input'));
      tick();
      fixture.detectChanges();

      const characterCount = fixture.debugElement.query(By.css('.character-count'));
      expect(characterCount.nativeElement).toHaveClass('warning');
    }));
  });

  describe('Search Functionality', () => {
    it('should debounce search requests', fakeAsync(() => {
      // Type rapidly
      inputElement.value = 't';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      inputElement.value = 'te';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      inputElement.value = 'tes';
      inputElement.dispatchEvent(new Event('input'));
      tick(100);

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300); // Complete debounce period

      expect(searchService.search).toHaveBeenCalledTimes(1);
      expect(searchService.search).toHaveBeenCalledWith({ query: 'test' });
    }));

    it('should not search for queries below minimum length', fakeAsync(() => {
      component.minQueryLength = 3;

      inputElement.value = 'te';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      expect(searchService.search).not.toHaveBeenCalled();
    }));

    it('should display results in dropdown', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.typeahead-dropdown'));
      expect(dropdown.nativeElement).toHaveClass('visible');

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      expect(resultItems.length).toBe(3);
    }));

    it('should highlight search terms in results', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const resultTitle = fixture.debugElement.query(By.css('.result-title'));
      expect(resultTitle.nativeElement.innerHTML).toContain('<mark class="search-highlight">Test</mark>');
    }));

    it('should emit search events', fakeAsync(() => {
      spyOn(component.searchStarted, 'emit');
      spyOn(component.searchCompleted, 'emit');

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      expect(component.searchStarted.emit).toHaveBeenCalledWith({
        query: 'test',
        queryLength: 4
      });

      expect(component.searchCompleted.emit).toHaveBeenCalledWith({
        responseTime: jasmine.any(Number),
        resultCount: 3,
        query: 'test'
      });
    }));
  });

  describe('Loading States', () => {
    it('should show loading border animation immediately', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.typeahead-container'));
      expect(container.nativeElement).toHaveClass('loading');
    }));

    it('should show spinner after 200ms delay', fakeAsync(() => {
      // Mock delayed search response
      searchService.search.and.returnValue(of(mockResponse).pipe(delay(500)));

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300); // Complete debounce
      fixture.detectChanges();

      // Spinner should not be visible immediately
      let spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner.nativeElement).not.toHaveClass('visible');

      tick(200); // Wait for spinner delay
      fixture.detectChanges();

      // Now spinner should be visible
      spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner.nativeElement).toHaveClass('visible');

      tick(300); // Complete search response
      fixture.detectChanges();

      // Spinner should be hidden after response
      spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner.nativeElement).not.toHaveClass('visible');
    }));
  });

  describe('Error Handling', () => {
    it('should display error message on search failure', fakeAsync(() => {
      const error = new SearchError('Network error', 0, null, 'NETWORK_ERROR');
      searchService.search.and.returnValue(throwError(() => error));

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Network error');
    }));

    it('should show retry button on error', fakeAsync(() => {
      const error = new SearchError('Network error');
      searchService.search.and.returnValue(throwError(() => error));

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
    }));

    it('should retry search when retry button is clicked', fakeAsync(() => {
      const error = new SearchError('Network error');
      searchService.search.and.returnValue(throwError(() => error));

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      searchService.search.calls.reset();
      searchService.search.and.returnValue(of(mockResponse));

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.nativeElement.click();
      tick(310); // Debounce + small delay
      fixture.detectChanges();

      expect(searchService.search).toHaveBeenCalledWith({ query: 'test' });
    }));

    it('should emit error events', fakeAsync(() => {
      spyOn(component.searchError, 'emit');
      const error = new SearchError('Network error', 1, null, 'NETWORK_ERROR');
      searchService.search.and.returnValue(throwError(() => error));

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      expect(component.searchError.emit).toHaveBeenCalledWith({
        errorType: 'NETWORK_ERROR',
        retryCount: jasmine.any(Number),
        query: 'test'
      });
    }));
  });

  describe('Keyboard Navigation', () => {
    beforeEach(fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();
    }));

    it('should navigate down with arrow down key', () => {
      spyOn(component.keyboardNavigation, 'emit');

      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
      fixture.detectChanges();

      component.state$.subscribe(state => {
        expect(state.selectedIndex).toBe(0);
      });

      expect(component.keyboardNavigation.emit).toHaveBeenCalledWith({
        keyPressed: 'ArrowDown',
        currentIndex: 0
      });
    });

    it('should navigate up with arrow up key', () => {
      // First navigate down to select an item
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
      fixture.detectChanges();

      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      fixture.detectChanges();

      component.state$.subscribe(state => {
        expect(state.selectedIndex).toBe(2); // Should wrap to last item
      });
    });

    it('should select result with Enter key', () => {
      spyOn(component.resultSelected, 'emit');

      // Navigate to first result
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
      fixture.detectChanges();

      // Select with Enter
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should close dropdown with Escape key', () => {
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      fixture.detectChanges();

      component.state$.subscribe(state => {
        expect(state.isDropdownVisible).toBe(false);
      });
    });

    it('should update aria-activedescendant on navigation', () => {
      inputElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
      fixture.detectChanges();

      expect(inputElement.getAttribute('aria-activedescendant')).toBe('typeahead-result-0');
    });
  });

  describe('Mouse Interaction', () => {
    beforeEach(fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();
    }));

    it('should select result on click', () => {
      spyOn(component.resultSelected, 'emit');

      const firstResult = fixture.debugElement.query(By.css('.result-item'));
      firstResult.nativeElement.click();

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should update selected index on mouse enter', () => {
      const secondResult = fixture.debugElement.queryAll(By.css('.result-item'))[1];
      secondResult.nativeElement.dispatchEvent(new Event('mouseenter'));

      component.state$.subscribe(state => {
        expect(state.selectedIndex).toBe(1);
      });
    });
  });

  describe('ControlValueAccessor', () => {
    it('should implement writeValue', () => {
      component.writeValue('initial value');

      component.state$.subscribe(state => {
        expect(state.query).toBe('initial value');
      });
    });

    it('should call onChange when input changes', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));

      expect(onChangeSpy).toHaveBeenCalledWith('test');
    });

    it('should call onTouched when input is blurred', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      inputElement.dispatchEvent(new Event('blur'));

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should disable input when setDisabledState is called', () => {
      component.setDisabledState(true);
      expect(inputElement.disabled).toBe(true);

      component.setDisabledState(false);
      expect(inputElement.disabled).toBe(false);
    });
  });

  describe('Custom Search Function', () => {
    it('should use custom search function when provided', fakeAsync(() => {
      const customSearchFn = jasmine.createSpy('customSearchFn').and.returnValue(of(mockResponse));
      component.searchFn = customSearchFn;

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      expect(customSearchFn).toHaveBeenCalledWith({ query: 'test' });
      expect(searchService.search).not.toHaveBeenCalled();
    }));
  });

  describe('Request Cancellation', () => {
    it('should cancel previous request when new input arrives', fakeAsync(() => {
      const responseSubject = new Subject<SearchResponse>();
      searchService.search.and.returnValue(responseSubject.asObservable());

      // First search
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      // Second search before first completes
      inputElement.value = 'test2';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      // Complete first request (should be ignored)
      responseSubject.next(mockResponse);
      fixture.detectChanges();

      // Should have made two search calls but ignored first result
      expect(searchService.search).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Accessibility', () => {
    it('should announce search status to screen readers', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const srAnnouncement = fixture.debugElement.query(By.css('.sr-only span'));
      expect(srAnnouncement.nativeElement.textContent).toContain('3 results found');
    }));

    it('should set proper ARIA attributes on dropdown', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.typeahead-dropdown'));
      expect(dropdown.nativeElement.getAttribute('role')).toBe('listbox');
      expect(dropdown.nativeElement.getAttribute('aria-label')).toBe('Search results');
    }));

    it('should set proper ARIA attributes on result items', fakeAsync(() => {
      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      resultItems.forEach((item, index) => {
        expect(item.nativeElement.getAttribute('role')).toBe('option');
        expect(item.nativeElement.getAttribute('id')).toBe(`typeahead-result-${index}`);
      });
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty query gracefully', fakeAsync(() => {
      inputElement.value = '   '; // Whitespace only
      inputElement.dispatchEvent(new Event('input'));
      tick(300);

      expect(searchService.search).not.toHaveBeenCalled();

      component.state$.subscribe(state => {
        expect(state.results).toEqual([]);
        expect(state.isDropdownVisible).toBe(false);
      });
    }));

    it('should handle no results gracefully', fakeAsync(() => {
      searchService.search.and.returnValue(of({ results: [], totalCount: 0 }));

      inputElement.value = 'nonexistent';
      inputElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const noResults = fixture.debugElement.query(By.css('.no-results'));
      expect(noResults).toBeTruthy();
      expect(noResults.nativeElement.textContent).toContain('No results found');
    }));

    it('should handle component destruction gracefully', () => {
      expect(() => {
        component.ngOnDestroy();
        fixture.destroy();
      }).not.toThrow();
    });
  });
});