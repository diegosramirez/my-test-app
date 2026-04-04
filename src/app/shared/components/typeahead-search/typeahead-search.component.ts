import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
  TemplateRef,
  ContentChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Observable,
  Subject,
  BehaviorSubject,
  combineLatest,
  merge,
  EMPTY,
  timer
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  map,
  startWith,
  catchError,
  tap,
  filter,
  share
} from 'rxjs/operators';

import { SearchResult, SearchResponse, SearchOptions } from '../../interfaces/search-result.interface';
import { SearchError, SearchState } from '../../interfaces/search-error.interface';
import { SearchService } from '../../services/search.service';
import { HighlightPipe } from '../../pipes/highlight.pipe';

export interface SearchEvent<T> {
  query: string;
  results: SearchResult<T>[];
  total: number;
  cacheHit: boolean;
}

export interface SelectionEvent<T> {
  result: SearchResult<T>;
  index: number;
  method: 'click' | 'keyboard' | 'programmatic';
}

export interface ErrorEvent {
  error: SearchError;
  query: string;
}

@Component({
  selector: 'app-typeahead-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HighlightPipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeaheadSearchComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="typeahead-container"
      [class.has-focus]="hasFocus"
      [class.is-loading]="state.isLoading"
      [class.has-error]="state.error"
      [class.is-open]="isDropdownOpen"
    >
      <div class="input-wrapper">
        <input
          #searchInput
          type="text"
          class="search-input"
          [placeholder]="placeholder"
          [value]="inputControl.value"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur($event)"
          (keydown)="onKeyDown($event)"
          [attr.aria-expanded]="isDropdownOpen"
          [attr.aria-haspopup]="true"
          [attr.aria-owns]="dropdownId"
          [attr.aria-autocomplete]="'list'"
          [attr.aria-describedby]="ariaDescribedBy"
          [attr.aria-invalid]="state.error ? true : null"
          [disabled]="disabled"
          autocomplete="off"
          role="combobox"
        />

        <div class="input-icons">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>

          <div
            class="loading-spinner"
            *ngIf="state.isLoading"
            [attr.aria-label]="'Loading search results'"
            role="status"
          >
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
              <circle class="spinner-path" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle>
            </svg>
          </div>
        </div>
      </div>

      <!-- Screen reader announcements -->
      <div
        [id]="announceId"
        class="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ currentAnnouncement }}
      </div>

      <!-- Dropdown -->
      <div
        *ngIf="isDropdownOpen"
        [id]="dropdownId"
        class="dropdown"
        role="listbox"
        [attr.aria-label]="'Search results'"
      >
        <!-- Error state -->
        <div *ngIf="state.error" class="error-state" role="alert">
          <div class="error-message">
            <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>{{ state.error.message }}</span>
          </div>
          <button
            *ngIf="state.error.canRetry"
            class="retry-button"
            (click)="retry()"
            [attr.aria-label]="'Retry search for ' + state.lastQuery"
          >
            Retry
          </button>
        </div>

        <!-- Empty state -->
        <div *ngIf="!state.error && !state.isLoading && results.length === 0 && state.lastQuery" class="empty-state">
          <p>No results found for "{{ state.lastQuery }}"</p>
          <small>Try adjusting your search terms</small>
        </div>

        <!-- Results -->
        <div *ngIf="!state.error && results.length > 0" class="results-container">
          <div class="results-header sr-only">
            {{ results.length }} result{{ results.length !== 1 ? 's' : '' }} available
          </div>

          <div
            *ngFor="let result of results; let i = index"
            class="result-item"
            [class.highlighted]="i === selectedIndex"
            [attr.id]="getResultId(i)"
            role="option"
            [attr.aria-selected]="i === selectedIndex"
            (click)="selectResult(result, i, 'click')"
            (mouseenter)="setSelectedIndex(i)"
          >
            <ng-container *ngIf="resultTemplate; else defaultResultTemplate">
              <ng-container *ngTemplateOutlet="resultTemplate; context: { $implicit: result, query: state.lastQuery, index: i }"></ng-container>
            </ng-container>

            <ng-template #defaultResultTemplate>
              <div class="result-content">
                <div
                  class="result-text"
                  [innerHTML]="result.displayValue | highlight : state.lastQuery : 'highlight'"
                ></div>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- Loading state in dropdown -->
        <div *ngIf="state.isLoading && !results.length" class="loading-state">
          <div class="loading-content">
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
              <circle class="spinner-path" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></circle>
            </svg>
            <span>Searching...</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./typeahead-search.component.css']
})
export class TypeaheadSearchComponent<T = any> implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() searchFunction!: (query: string, signal?: AbortSignal) => Observable<SearchResponse<T>>;
  @Input() placeholder: string = 'Search...';
  @Input() minQueryLength: number = 2;
  @Input() debounceMs: number = 300;
  @Input() maxResults: number = 50;
  @Input() cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  @Input() disabled: boolean = false;
  @Input() showDropdownOnFocus: boolean = false;
  @Input() clearOnSelect: boolean = false;

  @Output() search = new EventEmitter<SearchEvent<T>>();
  @Output() select = new EventEmitter<SelectionEvent<T>>();
  @Output() error = new EventEmitter<ErrorEvent>();
  @Output() focusChange = new EventEmitter<boolean>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ContentChild('resultTemplate') resultTemplate?: TemplateRef<any>;

  inputControl = new FormControl('');
  results: SearchResult<T>[] = [];
  selectedIndex = -1;
  isDropdownOpen = false;
  hasFocus = false;
  currentAnnouncement = '';

  readonly dropdownId = `typeahead-dropdown-${Math.random().toString(36).substring(2, 11)}`;
  readonly announceId = `typeahead-announce-${Math.random().toString(36).substring(2, 11)}`;

  state: SearchState = {
    isLoading: false,
    isDebouncing: false,
    error: null,
    lastQuery: '',
    cacheHit: false
  };

  private destroy$ = new Subject<void>();
  private retryCount = 0;
  private maxRetries = 3;
  private searchController?: AbortController;
  private onChange = (value: any) => {};
  private onTouched = () => {};

  get ariaDescribedBy(): string {
    const ids = [this.announceId];
    if (this.state.error) {
      ids.push(`${this.dropdownId}-error`);
    }
    return ids.join(' ');
  }

  constructor(
    private searchService: SearchService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelCurrentRequest();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.inputControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.inputControl.disable();
    } else {
      this.inputControl.enable();
    }
  }

  private setupSearch(): void {
    // Main search stream
    const searchTrigger$ = this.inputControl.valueChanges.pipe(
      startWith(''),
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      tap(() => this.state.isDebouncing = false),
      filter(query => typeof query === 'string'),
      map(query => query.trim()),
      takeUntil(this.destroy$)
    );

    // Track debouncing state
    this.inputControl.valueChanges.pipe(
      tap(() => {
        this.state.isDebouncing = true;
        this.cdr.markForCheck();
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    // Execute search
    searchTrigger$.pipe(
      tap(query => {
        this.state.lastQuery = query;
        this.state.error = null;
        this.resetSelection();

        if (query.length < this.minQueryLength) {
          this.closeDropdown();
          return;
        }
      }),
      filter(query => query.length >= this.minQueryLength),
      switchMap(query => this.executeSearch(query)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => this.handleSearchSuccess(response),
      error: (error) => this.handleSearchError(error)
    });

    // Track form control changes for ControlValueAccessor
    this.inputControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.onChange(value);
    });
  }

  private executeSearch(query: string): Observable<SearchResponse<T> & { cacheHit: boolean }> {
    this.cancelCurrentRequest();
    this.searchController = new AbortController();

    this.state.isLoading = true;
    this.cdr.markForCheck();

    const options: SearchOptions = {
      minQueryLength: this.minQueryLength,
      debounceMs: this.debounceMs,
      maxResults: this.maxResults,
      cacheTimeout: this.cacheTimeout
    };

    return this.searchService.search(
      this.searchFunction,
      query,
      options,
      this.searchController.signal
    ).pipe(
      tap(() => {
        this.state.isLoading = false;
        this.retryCount = 0;
      }),
      catchError(error => {
        this.state.isLoading = false;
        throw error;
      })
    );
  }

  private handleSearchSuccess(response: SearchResponse<T> & { cacheHit: boolean }): void {
    this.results = response.results.slice(0, this.maxResults);
    this.state.cacheHit = response.cacheHit;
    this.state.error = null;
    this.isDropdownOpen = this.results.length > 0 || this.state.lastQuery.length >= this.minQueryLength;

    this.announceResults();
    this.cdr.markForCheck();

    this.search.emit({
      query: response.query,
      results: this.results,
      total: response.totalCount,
      cacheHit: this.state.cacheHit
    });
  }

  private handleSearchError(error: SearchError): void {
    this.state.error = error;
    this.state.error.retryCount = this.retryCount;
    this.results = [];
    this.isDropdownOpen = true;

    this.announceError();
    this.cdr.markForCheck();

    this.error.emit({
      error: this.state.error,
      query: this.state.lastQuery
    });
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputControl.setValue(target.value);
  }

  onFocus(): void {
    this.hasFocus = true;
    this.focusChange.emit(true);

    if (this.showDropdownOnFocus && this.results.length > 0) {
      this.isDropdownOpen = true;
    }
  }

  onBlur(event: FocusEvent): void {
    // Check if focus moved within the component before closing dropdown
    setTimeout(() => {
      const activeElement = document.activeElement;
      const withinComponent = this.elementRef.nativeElement.contains(activeElement);

      if (!withinComponent) {
        this.hasFocus = false;
        this.closeDropdown();
        this.focusChange.emit(false);
        this.onTouched();
      }
    }, 100); // Reduced delay to improve responsiveness
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateDown();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateUp();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
          this.selectResult(this.results[this.selectedIndex], this.selectedIndex, 'keyboard');
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        this.searchInputRef.nativeElement.blur();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  selectResult(result: SearchResult<T>, index: number, method: 'click' | 'keyboard' | 'programmatic'): void {
    if (this.clearOnSelect) {
      this.inputControl.setValue('');
    } else {
      this.inputControl.setValue(result.displayValue);
    }

    this.closeDropdown();
    this.searchInputRef.nativeElement.focus();

    this.select.emit({ result, index, method });
    this.announceSelection(result);
  }

  retry(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.state.error = null;

      // Implement exponential backoff delay
      const baseDelay = 1000; // 1 second
      const maxDelay = 5000; // 5 seconds
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.retryCount - 1), maxDelay);

      // Show loading state during retry delay
      this.state.isLoading = true;
      this.cdr.markForCheck();

      timer(exponentialDelay).subscribe(() => {
        this.inputControl.setValue(this.state.lastQuery, { emitEvent: true });
      });
    }
  }

  private navigateDown(): void {
    if (!this.isDropdownOpen || this.results.length === 0) return;

    this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
    this.announceNavigation();
    this.scrollToSelected();
  }

  private navigateUp(): void {
    if (!this.isDropdownOpen || this.results.length === 0) return;

    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.announceNavigation();
    this.scrollToSelected();
  }

  private scrollToSelected(): void {
    if (this.selectedIndex < 0) return;

    const resultElement = document.getElementById(this.getResultId(this.selectedIndex));
    if (resultElement) {
      resultElement.scrollIntoView({ block: 'nearest' });
    }
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex = index;
  }

  getResultId(index: number): string {
    return `${this.dropdownId}-result-${index}`;
  }

  private resetSelection(): void {
    this.selectedIndex = -1;
  }

  private closeDropdown(): void {
    this.isDropdownOpen = false;
    this.resetSelection();
  }

  private cancelCurrentRequest(): void {
    if (this.searchController) {
      this.searchController.abort();
      this.searchController = undefined;
    }
  }

  private announceResults(): void {
    const count = this.results.length;
    if (count === 0) {
      this.currentAnnouncement = `No results found for ${this.state.lastQuery}`;
    } else {
      this.currentAnnouncement = `${count} result${count !== 1 ? 's' : ''} available for ${this.state.lastQuery}`;
    }
  }

  private announceError(): void {
    this.currentAnnouncement = `Search error: ${this.state.error?.message}`;
  }

  private announceSelection(result: SearchResult<T>): void {
    this.currentAnnouncement = `Selected ${result.displayValue}`;
  }

  private announceNavigation(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      const result = this.results[this.selectedIndex];
      this.currentAnnouncement = `${this.selectedIndex + 1} of ${this.results.length}: ${result.displayValue}`;
    }
  }
}