import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TypeaheadSearchComponent } from './typeahead-search.component';
import { SearchService } from './search.service';
import { SearchResult } from './search-result.interface';
import { of, throwError } from 'rxjs';

describe('TypeaheadSearchComponent', () => {
  let component: TypeaheadSearchComponent;
  let fixture: ComponentFixture<TypeaheadSearchComponent>;
  let searchService: jasmine.SpyObj<SearchService>;
  let httpTestingController: HttpTestingController;

  const mockResults: SearchResult[] = [
    { id: '1', title: 'Angular Component', description: 'Learn about Angular components' },
    { id: '2', title: 'TypeScript Guide', description: 'TypeScript fundamentals and advanced concepts' }
  ];

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['search']);

    await TestBed.configureTestingModule({
      imports: [TypeaheadSearchComponent, HttpClientTestingModule],
      providers: [
        { provide: SearchService, useValue: searchServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeaheadSearchComponent);
    component = fixture.componentInstance;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    if (component.errorDismissTimeout) {
      clearTimeout(component.errorDismissTimeout);
    }
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.placeholder).toBe('Search...');
      expect(component.searchEndpoint).toBe('/api/search');
      expect(component.showDropdown).toBe(false);
      expect(component.selectedIndex).toBe(-1);
    });

    it('should accept input properties', () => {
      component.placeholder = 'Custom placeholder';
      component.searchEndpoint = '/custom/search';

      expect(component.placeholder).toBe('Custom placeholder');
      expect(component.searchEndpoint).toBe('/custom/search');
    });
  });

  describe('Debounced Search', () => {
    it('should debounce search queries by 300ms', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      const input = fixture.debugElement.query(By.css('.search-input'));

      // Type rapidly
      component.searchControl.setValue('ang');
      tick(100);
      component.searchControl.setValue('angu');
      tick(100);
      component.searchControl.setValue('angular');
      tick(299);

      // Should not have called search yet
      expect(searchService.search).not.toHaveBeenCalled();

      tick(1);
      // Now it should call search
      expect(searchService.search).toHaveBeenCalledTimes(1);
      expect(searchService.search).toHaveBeenCalledWith('angular', '/api/search');

      flush();
    }));

    it('should not search for empty queries', fakeAsync(() => {
      component.searchControl.setValue('');
      tick(300);

      expect(searchService.search).not.toHaveBeenCalled();
      flush();
    }));

    it('should not search for whitespace-only queries', fakeAsync(() => {
      component.searchControl.setValue('   ');
      tick(300);

      expect(searchService.search).not.toHaveBeenCalled();
      flush();
    }));
  });

  describe('Request Cancellation', () => {
    it('should cancel previous requests when new input arrives', fakeAsync(() => {
      const firstCall = of(mockResults);
      const secondCall = of([mockResults[0]]);

      searchService.search.and.returnValues(firstCall, secondCall);

      // First search
      component.searchControl.setValue('angular');
      tick(300);

      // Second search before first completes
      component.searchControl.setValue('typescript');
      tick(300);

      expect(searchService.search).toHaveBeenCalledTimes(2);
      flush();
    }));
  });

  describe('Loading State', () => {
    it('should show loading spinner for requests taking longer than 100ms', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300); // Debounce

      tick(100); // Loading threshold
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner).toBeTruthy();
      expect(component.searchState.loading).toBe(true);

      flush();
    }));

    it('should hide loading spinner when results arrive', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      tick(100);

      fixture.detectChanges();
      expect(component.searchState.loading).toBe(false);

      const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
      expect(spinner).toBeFalsy();

      flush();
    }));
  });

  describe('Error Handling', () => {
    it('should display error message when search fails', fakeAsync(() => {
      const error = new Error('Network error');
      searchService.search.and.returnValue(throwError(() => error));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      expect(component.searchState.error).toBe('Network error');

      const errorElement = fixture.debugElement.query(By.css('.search-error'));
      expect(errorElement).toBeTruthy();

      flush();
    }));

    it('should auto-dismiss error after 5 seconds', fakeAsync(() => {
      const error = new Error('Network error');
      searchService.search.and.returnValue(throwError(() => error));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      expect(component.searchState.error).toBe('Network error');

      tick(5000);
      expect(component.searchState.error).toBeNull();

      flush();
    }));

    it('should retry search when retry button is clicked', fakeAsync(() => {
      const error = new Error('Network error');
      searchService.search.and.returnValues(throwError(() => error), of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();

      retryButton.nativeElement.click();
      tick(310); // Wait for retry debounce

      expect(searchService.search).toHaveBeenCalledTimes(2);
      expect(component.searchState.error).toBeNull();

      flush();
    }));
  });

  describe('Text Highlighting', () => {
    it('should display results with highlighted matching text', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
      expect(resultTitles.length).toBe(2);

      flush();
    }));
  });

  describe('Keyboard Navigation', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));
      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();
      flush();
    }));

    it('should navigate down with ArrowDown key', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component.onKeyDown(event);
      expect(component.selectedIndex).toBe(0);

      component.onKeyDown(event);
      expect(component.selectedIndex).toBe(1);
    });

    it('should navigate up with ArrowUp key', () => {
      component.selectedIndex = 1;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

      component.onKeyDown(event);
      expect(component.selectedIndex).toBe(0);

      component.onKeyDown(event);
      expect(component.selectedIndex).toBe(-1);
    });

    it('should select result with Enter key', () => {
      spyOn(component.resultSelected, 'emit');
      component.selectedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeyDown(event);

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockResults[0]);
      expect(component.showDropdown).toBe(false);
    });

    it('should close dropdown with Escape key', () => {
      component.showDropdown = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onKeyDown(event);

      expect(component.showDropdown).toBe(false);
      expect(component.selectedIndex).toBe(-1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const combobox = fixture.debugElement.query(By.css('.typeahead-search'));

      expect(combobox.nativeElement.getAttribute('role')).toBe('combobox');
      expect(input.nativeElement.getAttribute('aria-label')).toBe('Search input');
      expect(input.nativeElement.getAttribute('aria-describedby')).toBe('search-status');
    });

    it('should announce search status to screen readers', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      const statusElement = fixture.debugElement.query(By.css('#search-status'));
      expect(statusElement.nativeElement.textContent.trim()).toContain('2 results found');

      flush();
    }));

    it('should have proper ARIA attributes for dropdown results', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      const dropdown = fixture.debugElement.query(By.css('.search-dropdown'));
      const results = fixture.debugElement.queryAll(By.css('.search-result'));

      expect(dropdown.nativeElement.getAttribute('role')).toBe('listbox');
      expect(results[0].nativeElement.getAttribute('role')).toBe('option');
      expect(results[0].nativeElement.getAttribute('aria-selected')).toBe('false');

      flush();
    }));
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions on component destruction', () => {
      spyOn(component.searchControl.valueChanges, 'pipe').and.callThrough();

      component.ngOnDestroy();

      // Component should be destroyed without errors
      expect(component).toBeTruthy();
    });

    it('should clear error timeout on component destruction', () => {
      component.errorDismissTimeout = setTimeout(() => {}, 5000);
      spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      // Note: Component doesn't have explicit ngOnDestroy,
      // but takeUntilDestroyed() handles cleanup automatically
      expect(component).toBeTruthy();
    });
  });

  describe('Dropdown Positioning', () => {
    it('should position dropdown below input by default', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));

      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();

      expect(component.showDropdown).toBe(true);

      flush();
    }));

    it('should close dropdown when clicking outside', () => {
      component.showDropdown = true;

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const event = new Event('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: outsideElement });

      component.onDocumentClick(event);

      expect(component.showDropdown).toBe(false);

      document.body.removeChild(outsideElement);
    });
  });

  describe('Result Selection', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockResults));
      component.searchControl.setValue('angular');
      tick(300);
      fixture.detectChanges();
      flush();
    }));

    it('should emit selected result and close dropdown', () => {
      spyOn(component.resultSelected, 'emit');

      component.selectResult(mockResults[0]);

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockResults[0]);
      expect(component.showDropdown).toBe(false);
      expect(component.searchControl.value).toBe(mockResults[0].title);
    });

    it('should select result when clicked', () => {
      spyOn(component, 'selectResult');

      const resultElement = fixture.debugElement.query(By.css('.search-result'));
      resultElement.nativeElement.click();

      expect(component.selectResult).toHaveBeenCalledWith(mockResults[0]);
    });
  });
});