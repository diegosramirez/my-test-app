import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  HostListener
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Observable,
  BehaviorSubject,
  Subject,
  combineLatest,
  timer,
  EMPTY,
  of
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  startWith,
  filter,
  catchError,
  retry,
  delay,
  takeUntil,
  tap
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SearchResult, TypeaheadState, SearchError } from '../../interfaces/search-result.interface';
import { HighlightTextPipe } from '../../pipes/highlight-text.pipe';

@Component({
  selector: 'app-typeahead',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HighlightTextPipe],
  template: `
    <div class="typeahead-container" [class.focused]="isDropdownOpen" *ngIf="state | async as currentState">
      <div class="input-wrapper"
           [class.has-error]="currentState.error"
           [class.is-loading]="currentState.loading">

        <input
          #searchInput
          [formControl]="searchControl"
          type="text"
          class="typeahead-input"
          [attr.aria-expanded]="isDropdownOpen"
          [attr.aria-haspopup]="true"
          [attr.aria-activedescendant]="selectedResultId"
          [attr.aria-describedby]="errorId"
          role="combobox"
          autocomplete="off"
          [placeholder]="placeholder"
          (focus)="onFocus()"
          (blur)="onBlur($event)"
          (keydown)="onKeyDown($event)"
          (touchstart)="onTouchStart($event)"
        />

        <div class="input-actions">
          <div *ngIf="currentState.loading" class="loading-spinner" aria-hidden="true">
            <div class="spinner"></div>
          </div>

          <button
            *ngIf="searchControl.value && !currentState.loading"
            type="button"
            class="clear-button"
            (click)="clearSearch()"
            aria-label="Clear search"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Dropdown Results -->
      <div
        *ngIf="isDropdownOpen"
        class="dropdown-container"
        role="listbox"
        [attr.id]="dropdownId"
      >
        <!-- Error State -->
        <div
          *ngIf="currentState.error"
          class="error-state"
          [attr.id]="errorId"
          role="alert"
        >
          <div class="error-message">{{ currentState.error }}</div>
          <button
            type="button"
            class="retry-button"
            (click)="retrySearch()"
            [disabled]="isRetrying"
          >
            {{ isRetrying ? 'Retrying...' : 'Try Again' }}
          </button>
        </div>

        <!-- Results -->
        <div *ngIf="!currentState.error && currentState.results.length > 0" class="results-container">
          <div *ngIf="totalResults > currentState.results.length" class="result-count">
            Showing {{ currentState.results.length }} of {{ totalResults }} results
          </div>

          <div
            *ngFor="let result of currentState.results; let i = index; trackBy: trackByResultId"
            class="result-item"
            [class.selected]="i === currentState.selectedIndex"
            [attr.id]="getResultId(i)"
            [attr.aria-selected]="i === currentState.selectedIndex"
            role="option"
            (click)="selectResult(result, 'mouse')"
            (touchend)="selectResult(result, 'touch')"
          >
            <div class="result-title" [innerHTML]="result.title | highlightText:currentState.query"></div>
            <div *ngIf="result.description"
                 class="result-description"
                 [innerHTML]="result.description | highlightText:currentState.query">
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div
          *ngIf="!currentState.error && !currentState.loading && currentState.results.length === 0 && currentState.hasMinimumLength"
          class="no-results"
        >
          No results found for "{{ currentState.query }}"
        </div>

        <!-- Minimum Length Message -->
        <div
          *ngIf="!currentState.hasMinimumLength && searchControl.value && searchControl.value.trim().length > 0"
          class="minimum-length-message"
        >
          Type at least {{ minimumQueryLength }} characters to search
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./typeahead.component.scss']
})
export class TypeaheadComponent implements OnInit, OnDestroy {
  @Input() searchFunction!: (query: string) => Observable<SearchResult[]>;
  @Input() placeholder = 'Search...';
  @Input() minimumQueryLength = 2;
  @Input() debounceTime = this.getAdaptiveDebounceTime();
  @Input() loadingDelay = 75; // 50-100ms as specified
  @Input() totalResults = 0;

  @Output() resultSelected = new EventEmitter<{
    result: SearchResult;
    selectionMethod: 'mouse' | 'keyboard' | 'touch';
  }>();

  @Output() searchStarted = new EventEmitter<{
    query: string;
    debounceTime: number;
    deviceType: 'mobile' | 'desktop';
  }>();

  @Output() searchCompleted = new EventEmitter<{
    query: string;
    resultCount: number;
    responseTime: number;
    deviceType: 'mobile' | 'desktop';
  }>();

  @Output() searchError = new EventEmitter<{
    query: string;
    errorType: string;
    retryAttempted: boolean;
    deviceType: 'mobile' | 'desktop';
  }>();

  @Output() keyboardNavigation = new EventEmitter<{
    query: string;
    navigationDirection: 'up' | 'down' | 'escape';
    currentPosition: number;
  }>();

  @Output() accessibilityInteraction = new EventEmitter<{
    query: string;
    assistiveTechType: string;
    interactionSuccess: boolean;
  }>();

  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;

  searchControl = new FormControl('');
  private stateSubject = new BehaviorSubject<TypeaheadState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    hasMinimumLength: false,
    selectedIndex: -1
  });

  state = this.stateSubject.asObservable();
  private destroy$ = new Subject<void>();
  private dropdownOpen$ = new BehaviorSubject<boolean>(false);
  private retryAttempts = 0;
  private maxRetryAttempts = 3;
  private searchStartTime = 0;
  private touchStarted = false;

  isDropdownOpen = false;
  isRetrying = false;
  dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;
  errorId = `error-${Math.random().toString(36).substr(2, 9)}`;

  get selectedResultId(): string | null {
    const currentState = this.stateSubject.value;
    if (currentState.selectedIndex >= 0 && currentState.selectedIndex < currentState.results.length) {
      return this.getResultId(currentState.selectedIndex);
    }
    return null;
  }

  ngOnInit(): void {
    this.setupSearchLogic();
    this.setupStateSubscription();
    this.setupKeyboardNavigation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchLogic(): void {
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      distinctUntilChanged(),
      tap(query => this.updateState({
        query: query || '',
        selectedIndex: -1,
        hasMinimumLength: this.hasMinimumLength(query || '')
      })),
      filter(query => this.isValidQuery(query)),
      debounceTime(this.debounceTime),
      tap(query => {
        this.searchStartTime = Date.now();
        this.emitSearchStarted(query || '');
        this.showLoadingWithDelay();
      }),
      switchMap(query => this.performSearch(query || '')),
      takeUntilDestroyed()
    );

    search$.subscribe();
  }

  private setupStateSubscription(): void {
    this.state.pipe(takeUntilDestroyed()).subscribe(state => {
      this.isDropdownOpen = (state.hasMinimumLength && (state.results.length > 0 || state.loading || state.error !== null)) ||
                           (!state.hasMinimumLength && state.query.trim().length > 0);
    });
  }

  private setupKeyboardNavigation(): void {
    this.dropdownOpen$.pipe(
      switchMap(isOpen => {
        if (!isOpen) return EMPTY;
        return this.searchInput.nativeElement ?
          new Observable(subscriber => {
            const keydownHandler = (event: KeyboardEvent) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                this.navigateResults(event.key === 'ArrowDown' ? 'down' : 'up');
              }
            };
            this.searchInput.nativeElement.addEventListener('keydown', keydownHandler);
            return () => this.searchInput.nativeElement?.removeEventListener('keydown', keydownHandler);
          }) : EMPTY;
      }),
      takeUntilDestroyed()
    ).subscribe();
  }

  private getAdaptiveDebounceTime(): number {
    // Simple mobile detection for adaptive debouncing
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth < 768;
    return isMobile ? 200 : 300;
  }

  private hasMinimumLength(query: string): boolean {
    return query.trim().length >= this.minimumQueryLength;
  }

  private isValidQuery(query: string | null): boolean {
    if (!query) return false;
    return this.hasMinimumLength(query) && query.trim().length > 0;
  }

  private showLoadingWithDelay(): void {
    timer(this.loadingDelay).pipe(
      tap(() => this.updateState({ loading: true })),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private performSearch(query: string): Observable<SearchResult[]> {
    return this.searchFunction(query).pipe(
      delay(0), // Ensure async execution
      tap(results => {
        const responseTime = Date.now() - this.searchStartTime;
        this.updateState({
          results,
          loading: false,
          error: null
        });
        this.retryAttempts = 0;
        this.emitSearchCompleted(query, results.length, responseTime);
      }),
      catchError(error => {
        this.handleSearchError(query, error);
        return of([]);
      })
    );
  }

  private handleSearchError(query: string, error: any): void {
    const errorMessage = this.getErrorMessage(error);
    const shouldRetry = this.retryAttempts < this.maxRetryAttempts;

    this.updateState({
      loading: false,
      error: errorMessage,
      results: []
    });

    this.emitSearchError(query, error.name || 'UnknownError', shouldRetry);

    if (shouldRetry) {
      this.scheduleRetry(query);
    }
  }

  private getErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return 'Connection timeout - please check your internet connection';
    } else if (error.status === 503) {
      return 'Service temporarily unavailable - please try again later';
    } else if (error.status === 500) {
      return 'Server error - please try again';
    } else if (error.status === 429) {
      return 'Too many requests - please wait a moment';
    }
    return 'Search failed - please try again';
  }

  private scheduleRetry(query: string): void {
    const retryDelay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
    this.retryAttempts++;

    timer(retryDelay).pipe(
      tap(() => this.performRetry(query)),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private performRetry(query: string): void {
    if (this.searchControl.value === query) {
      this.searchStartTime = Date.now();
      this.updateState({ loading: true, error: null });
      this.performSearch(query).subscribe();
    }
  }

  private updateState(partial: Partial<TypeaheadState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partial });
  }

  onKeyDown(event: KeyboardEvent): void {
    const currentState = this.stateSubject.value;

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (currentState.selectedIndex >= 0 && currentState.selectedIndex < currentState.results.length) {
          this.selectResult(currentState.results[currentState.selectedIndex], 'keyboard');
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.clearSearch();
        this.searchInput.nativeElement.blur();
        this.emitKeyboardNavigation(currentState.query, 'escape', currentState.selectedIndex);
        break;

      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        // Handled by setupKeyboardNavigation
        break;
    }
  }

  private navigateResults(direction: 'up' | 'down'): void {
    const currentState = this.stateSubject.value;
    let newIndex = currentState.selectedIndex;

    if (direction === 'down') {
      newIndex = Math.min(currentState.results.length - 1, newIndex + 1);
    } else {
      newIndex = Math.max(-1, newIndex - 1);
    }

    this.updateState({ selectedIndex: newIndex });
    this.emitKeyboardNavigation(currentState.query, direction, newIndex);
  }

  onFocus(): void {
    this.dropdownOpen$.next(true);
  }

  onBlur(event: FocusEvent): void {
    // Delay to allow click events to fire
    setTimeout(() => {
      if (!this.touchStarted) {
        this.dropdownOpen$.next(false);
      }
      this.touchStarted = false;
    }, 200);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStarted = true;
  }

  selectResult(result: SearchResult, method: 'mouse' | 'keyboard' | 'touch'): void {
    this.resultSelected.emit({ result, selectionMethod: method });
    this.clearSearch();
    this.dropdownOpen$.next(false);

    // Emit tracking event
    const currentState = this.stateSubject.value;
    // Additional tracking logic would go here
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.updateState({
      query: '',
      results: [],
      loading: false,
      error: null,
      hasMinimumLength: false,
      selectedIndex: -1
    });
  }

  retrySearch(): void {
    const currentState = this.stateSubject.value;
    this.isRetrying = true;
    this.retryAttempts = 0;
    this.performSearch(currentState.query).subscribe(() => {
      this.isRetrying = false;
    });
  }

  getResultId(index: number): string {
    return `${this.dropdownId}-result-${index}`;
  }

  trackByResultId(index: number, item: SearchResult): string {
    return item.id;
  }

  // Event emitters
  private emitSearchStarted(query: string): void {
    this.searchStarted.emit({
      query,
      debounceTime: this.debounceTime,
      deviceType: this.getDeviceType()
    });
  }

  private emitSearchCompleted(query: string, resultCount: number, responseTime: number): void {
    this.searchCompleted.emit({
      query,
      resultCount,
      responseTime,
      deviceType: this.getDeviceType()
    });
  }

  private emitSearchError(query: string, errorType: string, retryAttempted: boolean): void {
    this.searchError.emit({
      query,
      errorType,
      retryAttempted,
      deviceType: this.getDeviceType()
    });
  }

  private emitKeyboardNavigation(query: string, direction: 'up' | 'down' | 'escape', position: number): void {
    this.keyboardNavigation.emit({
      query,
      navigationDirection: direction,
      currentPosition: position
    });
  }

  private getDeviceType(): 'mobile' | 'desktop' {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768 ? 'mobile' : 'desktop';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.searchInput.nativeElement.contains(event.target as Node)) {
      this.dropdownOpen$.next(false);
    }
  }
}