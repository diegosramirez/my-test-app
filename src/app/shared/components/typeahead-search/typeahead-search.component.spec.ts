import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { TypeaheadSearchComponent } from './typeahead-search.component';
import { SearchService } from '../../services/search.service';
import { SearchResponse, SearchResult } from '../../models/search.models';

describe('TypeaheadSearchComponent', () => {
  let component: TypeaheadSearchComponent;
  let fixture: ComponentFixture<TypeaheadSearchComponent>;
  let searchService: jasmine.SpyObj<SearchService>;
  let httpMock: HttpTestingController;

  const mockSearchResults: SearchResult[] = [
    { id: '1', title: 'First Result', description: 'First description' },
    { id: '2', title: 'Second Result', description: 'Second description' },
    { id: '3', title: 'Third Result', description: 'Third description' }
  ];

  const mockSearchResponse: SearchResponse = {
    results: mockSearchResults,
    total: 3
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

  describe('component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default properties', () => {
      expect(component.placeholder).toBe('Type to search...');
      expect(component.ariaLabel).toBe('Search');
      expect(component.virtualScrollThreshold).toBe(50);
    });

    it('should generate unique component ID', () => {
      expect(component.componentId).toBeTruthy();
      expect(component.componentId.length).toBe(9);
    });

    it('should detect mobile device correctly', () => {
      // This test depends on the current viewport size
      expect(typeof component['detectMobile']()).toBe('boolean');
    });
  });

  describe('input handling', () => {
    it('should update state on input change', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'test query';
      inputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.state().query).toBe('test query');
      expect(component.state().selectedIndex).toBe(-1);
      expect(component.state().error).toBeNull();
    });

    it('should emit queryChanged event', () => {
      spyOn(component.queryChanged, 'emit');
      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));

      expect(component.queryChanged.emit).toHaveBeenCalledWith('test');
    });

    it('should clear search when clear button is clicked', () => {
      component.state.update(state => ({ ...state, query: 'test', results: mockSearchResults }));
      fixture.detectChanges();

      const clearButton = fixture.debugElement.query(By.css('.clear-button'));
      expect(clearButton).toBeTruthy();

      clearButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.state().query).toBe('');
      expect(component.state().results).toEqual([]);
    });
  });

  describe('search functionality', () => {
    it('should search after debounce time', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement as HTMLInputElement;

      inputElement.value = 'test';
      inputElement.dispatchEvent(new Event('input'));

      // Should not search immediately
      expect(searchService.search).not.toHaveBeenCalled();

      // Should search after debounce time
      tick(300);
      expect(searchService.search).toHaveBeenCalledWith('test');
    }));

    it('should display loading spinner during search', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);

      expect(component.state().loading).toBe(true);

      const spinner = fixture.debugElement.query(By.css('.loading-spinner.visible'));
      expect(spinner).toBeTruthy();
    }));

    it('should display search results', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150); // Minimum loading time
      fixture.detectChanges();

      expect(component.state().results).toEqual(mockSearchResults);
      expect(component.state().loading).toBe(false);

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      expect(resultItems.length).toBe(3);
    }));

    it('should not search for queries shorter than 2 characters', fakeAsync(() => {
      component.onInputChange({ target: { value: 'a' } } as any);
      tick(300);

      expect(searchService.search).not.toHaveBeenCalled();
    }));

    it('should clear results for short queries', fakeAsync(() => {
      // First, add some results
      component.state.update(state => ({ ...state, results: mockSearchResults, query: 'test' }));

      // Then enter a short query
      component.onInputChange({ target: { value: 'a' } } as any);
      tick(300);

      expect(component.state().results).toEqual([]);
    }));
  });

  describe('keyboard navigation', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();
    }));

    it('should navigate down with ArrowDown key', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));

      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      expect(component.state().selectedIndex).toBe(0);
    });

    it('should navigate up with ArrowUp key', () => {
      component.setSelectedIndex(1);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      expect(component.state().selectedIndex).toBe(0);
    });

    it('should wrap around when navigating past boundaries', () => {
      component.setSelectedIndex(2); // Last item

      const input = fixture.debugElement.query(By.css('.search-input'));

      // Navigate down from last item should go to first
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.state().selectedIndex).toBe(0);

      // Navigate up from first item should go to last
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(component.state().selectedIndex).toBe(2);
    });

    it('should go to first item with Home key', () => {
      component.setSelectedIndex(2);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));

      expect(component.state().selectedIndex).toBe(0);
    });

    it('should go to last item with End key', () => {
      component.setSelectedIndex(0);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));

      expect(component.state().selectedIndex).toBe(2);
    });

    it('should select result with Enter key', () => {
      spyOn(component.resultSelected, 'emit');
      component.setSelectedIndex(1);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockSearchResults[1]);
      expect(component.state().selectedIndex).toBe(-1);
    });

    it('should close dropdown with Escape key', () => {
      component.setSelectedIndex(1);

      const input = fixture.debugElement.query(By.css('.search-input'));
      input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component.state().selectedIndex).toBe(-1);
    });
  });

  describe('mouse interactions', () => {
    beforeEach(fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();
    }));

    it('should select result on click', () => {
      spyOn(component.resultSelected, 'emit');

      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      resultItems[1].nativeElement.click();

      expect(component.resultSelected.emit).toHaveBeenCalledWith(mockSearchResults[1]);
    });

    it('should update selected index on mouseenter', () => {
      const resultItems = fixture.debugElement.queryAll(By.css('.result-item'));
      resultItems[2].nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

      expect(component.state().selectedIndex).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should display error message on search failure', fakeAsync(() => {
      const errorResponse = { error: 'Search failed', code: 500 };
      searchService.search.and.returnValue(throwError(() => errorResponse));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();

      expect(component.state().error).toBe('Search failed');
      expect(component.state().loading).toBe(false);

      const errorElement = fixture.debugElement.query(By.css('.error-message'));
      expect(errorElement).toBeTruthy();
    }));

    it('should retry search on retry button click', fakeAsync(() => {
      const errorResponse = { error: 'Search failed', code: 500 };
      searchService.search.and.returnValue(throwError(() => errorResponse));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();

      searchService.search.and.returnValue(of(mockSearchResponse));

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.nativeElement.click();

      expect(searchService.search).toHaveBeenCalledTimes(2);
    }));
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const inputElement = input.nativeElement;

      expect(inputElement.getAttribute('role')).toBe('combobox');
      expect(inputElement.getAttribute('aria-autocomplete')).toBe('list');
      expect(inputElement.getAttribute('aria-expanded')).toBe('false');
    });

    it('should update aria-expanded when dropdown opens', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));
      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('.search-input'));
      expect(input.nativeElement.getAttribute('aria-expanded')).toBe('true');
    }));

    it('should have proper ARIA live regions', () => {
      const errorMessage = fixture.debugElement.query(By.css('[aria-live="assertive"]'));
      expect(errorMessage).toBeFalsy(); // Should not be present initially

      const resultsElement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(resultsElement).toBeFalsy(); // Should not be present when no results
    });

    it('should have unique IDs for ARIA relationships', () => {
      const input = fixture.debugElement.query(By.css('.search-input'));
      const ariaOwns = input.nativeElement.getAttribute('aria-owns');
      const ariaDescribedBy = input.nativeElement.getAttribute('aria-describedby');

      expect(ariaOwns).toContain(component.componentId);
      expect(ariaDescribedBy).toContain(component.componentId);
    });
  });

  describe('virtual scrolling', () => {
    it('should use virtual scrolling for large result sets', fakeAsync(() => {
      const largeResultSet = Array.from({ length: 60 }, (_, i) => ({
        id: i.toString(),
        title: `Result ${i}`,
        description: `Description ${i}`
      }));

      searchService.search.and.returnValue(of({ results: largeResultSet, total: 60 }));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();

      const virtualScrollViewport = fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'));
      expect(virtualScrollViewport).toBeTruthy();

      const normalResultsList = fixture.debugElement.query(By.css('.results-list'));
      expect(normalResultsList).toBeFalsy();
    }));

    it('should use normal scrolling for small result sets', fakeAsync(() => {
      searchService.search.and.returnValue(of(mockSearchResponse));

      component.onInputChange({ target: { value: 'test' } } as any);
      tick(300);
      tick(150);
      fixture.detectChanges();

      const virtualScrollViewport = fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'));
      expect(virtualScrollViewport).toBeFalsy();

      const normalResultsList = fixture.debugElement.query(By.css('.results-list'));
      expect(normalResultsList).toBeTruthy();
    }));
  });

  describe('trackBy function', () => {
    it('should track results by ID', () => {
      const result = mockSearchResults[0];
      const trackByResult = component.trackByResultId(0, result);

      expect(trackByResult).toBe(result.id);
    });
  });
});