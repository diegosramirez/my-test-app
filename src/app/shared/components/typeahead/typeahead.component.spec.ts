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

describe('TypeaheadComponent', () => {
  let component: TypeaheadComponent;
  let fixture: ComponentFixture<TypeaheadComponent>;
  let mockSearchFunction: (query: string) => Observable<SearchResult[]>;

  const mockResults: SearchResult[] = [
    { id: '1', title: 'Angular Component', description: 'Learn about Angular components' },
    { id: '2', title: 'TypeScript Guide', description: 'TypeScript programming guide' },
    { id: '3', title: 'RxJS Operators', description: 'Reactive programming with RxJS' }
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have proper ARIA attributes', () => {
    const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('true');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-activedescendant')).toBe(true);
  });

  it('should not search for queries under minimum length', fakeAsync(() => {
    component.searchControl.setValue('a');
    tick(200);
    fixture.detectChanges();

    expect(mockSearchFunction).not.toHaveBeenCalled();
    expect(component.isDropdownOpen).toBe(true); // Should show minimum length message
  }));

  it('should search after minimum length and debounce', fakeAsync(() => {
    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    expect(mockSearchFunction).toHaveBeenCalledWith('angular');
    expect(component.isDropdownOpen).toBe(true);
  }));

  it('should cancel previous search when new input arrives', fakeAsync(() => {
    // Mock search with delay to test cancellation
    mockSearchFunction.mockReturnValue(of(mockResults).pipe(delay(500)));

    component.searchControl.setValue('angular');
    tick(200); // Past debounce

    component.searchControl.setValue('typescript');
    tick(200); // Past debounce
    tick(600); // Past both delays

    expect(mockSearchFunction).toHaveBeenCalledTimes(2);
    expect(mockSearchFunction).toHaveBeenCalledWith('typescript');
  }));

  it('should show loading spinner with delay', fakeAsync(() => {
    mockSearchFunction.mockReturnValue(of(mockResults).pipe(delay(200)));

    component.searchControl.setValue('angular');
    tick(200); // Past debounce
    tick(component.loadingDelay);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('.loading-spinner'));
    expect(spinner).toBeTruthy();

    tick(300); // Past search delay
    fixture.detectChanges();

    const spinnerAfter = fixture.debugElement.query(By.css('.loading-spinner'));
    expect(spinnerAfter).toBeFalsy();
  }));

  it('should highlight matching text in results', fakeAsync(() => {
    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    const resultTitles = fixture.debugElement.queryAll(By.css('.result-title'));
    expect(resultTitles.length).toBe(3);

    // First result should have highlighted text
    const firstTitle = resultTitles[0].nativeElement;
    expect(firstTitle.innerHTML).toContain('<strong');
    expect(firstTitle.innerHTML).toContain('Angular');
  }));

  it('should navigate results with keyboard', fakeAsync(() => {
    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;

    // Arrow down
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    input.dispatchEvent(downEvent);
    fixture.detectChanges();

    component.state.subscribe(state => {
      expect(state.selectedIndex).toBe(0);
    });
  }));

  it('should select result on Enter key', fakeAsync(() => {
    vi.spyOn(component.resultSelected, 'emit');

    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    // Navigate to first result
    const input = fixture.debugElement.query(By.css('.typeahead-input')).nativeElement;
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    input.dispatchEvent(downEvent);

    // Press Enter
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onKeyDown(enterEvent);

    expect(component.resultSelected.emit).toHaveBeenCalledWith({
      result: mockResults[0],
      selectionMethod: 'keyboard'
    });
  }));

  it('should close dropdown on Escape', fakeAsync(() => {
    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    expect(component.isDropdownOpen).toBe(true);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onKeyDown(escapeEvent);
    fixture.detectChanges();

    expect(component.searchControl.value).toBe('');
  }));

  it('should select result on click', fakeAsync(() => {
    vi.spyOn(component.resultSelected, 'emit');

    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    const firstResult = fixture.debugElement.query(By.css('.result-item'));
    firstResult.nativeElement.click();

    expect(component.resultSelected.emit).toHaveBeenCalledWith({
      result: mockResults[0],
      selectionMethod: 'mouse'
    });
  }));

  it('should handle touch events for mobile', fakeAsync(() => {
    vi.spyOn(component.resultSelected, 'emit');

    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    const firstResult = fixture.debugElement.query(By.css('.result-item'));
    const touchEvent = new Event('touchend');
    firstResult.nativeElement.dispatchEvent(touchEvent);

    expect(component.resultSelected.emit).toHaveBeenCalledWith({
      result: mockResults[0],
      selectionMethod: 'touch'
    });
  }));

  it('should handle search errors with retry', fakeAsync(() => {
    const error = { name: 'HttpError', status: 500 };
    mockSearchFunction.mockReturnValue(throwError(error));

    component.searchControl.setValue('angular');
    tick(200);
    fixture.detectChanges();

    component.state.subscribe(state => {
      expect(state.error).toContain('Server error');
      expect(state.results.length).toBe(0);
    });

    const retryButton = fixture.debugElement.query(By.css('.retry-button'));
    expect(retryButton).toBeTruthy();
  }));

  it('should clear search input', () => {
    component.searchControl.setValue('test');
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(By.css('.clear-button'));
    clearButton.nativeElement.click();

    expect(component.searchControl.value).toBe('');
  });

  it('should emit tracking events', fakeAsync(() => {
    vi.spyOn(component.searchStarted, 'emit');
    vi.spyOn(component.searchCompleted, 'emit');

    component.searchControl.setValue('angular');
    tick(200);

    expect(component.searchStarted.emit).toHaveBeenCalledWith({
      query: 'angular',
      debounceTime: expect.any(Number),
      deviceType: expect.any(String)
    });

    tick(100); // Allow search to complete

    expect(component.searchCompleted.emit).toHaveBeenCalledWith({
      query: 'angular',
      resultCount: 3,
      responseTime: expect.any(Number),
      deviceType: expect.any(String)
    });
  }));

  it('should prevent search for whitespace-only queries', fakeAsync(() => {
    component.searchControl.setValue('   ');
    tick(200);

    expect(mockSearchFunction).not.toHaveBeenCalled();
  }));

  it('should show no results message', fakeAsync(() => {
    mockSearchFunction.mockReturnValue(of([]));

    component.searchControl.setValue('notfound');
    tick(200);
    fixture.detectChanges();

    const noResults = fixture.debugElement.query(By.css('.no-results'));
    expect(noResults).toBeTruthy();
    expect(noResults.nativeElement.textContent).toContain('No results found');
  }));

  it('should detect mobile devices for adaptive debouncing', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });

    const newComponent = new TypeaheadComponent();
    expect(newComponent.debounceTime).toBe(200); // Mobile debounce time
  });

  it('should handle exponential backoff retry', fakeAsync(() => {
    const error = { name: 'TimeoutError' };
    mockSearchFunction.mockReturnValue(throwError(error));

    component.searchControl.setValue('angular');
    tick(200);

    // Should attempt retry after exponential backoff
    expect(mockSearchFunction).toHaveBeenCalledTimes(1);

    // Wait for first retry (1 second)
    tick(1000);
    expect(mockSearchFunction).toHaveBeenCalledTimes(2);
  }));
});