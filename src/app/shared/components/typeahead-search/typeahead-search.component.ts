import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
  catchError,
  tap,
  delay
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SearchService } from '../../services/search.service';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { SearchResult, DeviceInfo, SearchState } from '../../models/search.models';

@Component({
  selector: 'app-typeahead-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule, HighlightPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="typeahead-container" [attr.data-testid]="'typeahead-' + componentId">
      <!-- Search Input -->
      <div class="input-container">
        <input
          #searchInput
          type="text"
          class="search-input"
          [placeholder]="placeholder"
          [value]="state().query"
          [attr.aria-expanded]="isDropdownOpen()"
          [attr.aria-owns]="'search-results-' + componentId"
          [attr.aria-describedby]="'search-description-' + componentId"
          [attr.aria-label]="ariaLabel"
          [attr.aria-autocomplete]="'list'"
          role="combobox"
          autocomplete="off"
          (input)="onInputChange($event)"
          (keydown)="onKeyDown($event)"
          (focus)="onInputFocus()"
          (blur)="onInputBlur($event)"
        />

        <!-- Loading Spinner -->
        <div
          class="loading-spinner"
          [class.visible]="state().loading"
          [attr.aria-hidden]="!state().loading"
          role="status"
          [attr.aria-label]="'Searching for ' + state().query"
        >
          <div class="spinner"></div>
        </div>

        <!-- Clear Button -->
        <button
          *ngIf="state().query"
          class="clear-button"
          type="button"
          (click)="clearSearch()"
          [attr.aria-label]="'Clear search'"
        >
          ✕
        </button>
      </div>

      <!-- Hidden description for screen readers -->
      <div
        [id]="'search-description-' + componentId"
        class="sr-only"
      >
        Start typing to search. Use arrow keys to navigate results, Enter to select, Escape to close.
      </div>

      <!-- Error Message -->
      <div
        *ngIf="state().error"
        class="error-message"
        role="alert"
        [attr.aria-live]="'assertive'"
      >
        <span class="error-text">{{ state().error }}</span>
        <button
          class="retry-button"
          type="button"
          (click)="retrySearch()"
          [attr.aria-label]="'Retry search'"
        >
          Retry
        </button>
      </div>

      <!-- Results Dropdown -->
      <div
        *ngIf="isDropdownOpen()"
        class="results-dropdown"
        [id]="'search-results-' + componentId"
        role="listbox"
        [attr.aria-label]="'Search results for ' + state().query + ', ' + state().results.length + ' results'"
      >
        <!-- Results Counter -->
        <div
          class="results-summary"
          [attr.aria-live]="'polite'"
          role="status"
        >
          {{ state().results.length }} result{{ state().results.length !== 1 ? 's' : '' }}
          {{ state().results.length > 0 ? 'found' : '' }}
        </div>

        <!-- Virtual Scrolling for Large Result Sets -->
        <cdk-virtual-scroll-viewport
          *ngIf="state().results.length > virtualScrollThreshold; else normalResults"
          class="virtual-scroll-viewport"
          itemSize="60"
          [maxBufferPx]="600"
          [minBufferPx]="200"
        >
          <div
            *cdkVirtualFor="let result of state().results; let i = index; trackBy: trackByResultId"
            class="result-item"
            [class.selected]="state().selectedIndex === i"
            [attr.aria-selected]="state().selectedIndex === i"
            [attr.id]="'result-' + componentId + '-' + i"
            role="option"
            (click)="selectResult(result, i)"
            (mouseenter)="setSelectedIndex(i)"
          >
            <div class="result-title" [innerHTML]="result.title | highlight: state().query"></div>
            <div class="result-description" [innerHTML]="result.description | highlight: state().query"></div>
          </div>
        </cdk-virtual-scroll-viewport>

        <!-- Normal Results (< 50 items) -->
        <ng-template #normalResults>
          <div class="results-list">
            <div
              *ngFor="let result of state().results; let i = index; trackBy: trackByResultId"
              class="result-item"
              [class.selected]="state().selectedIndex === i"
              [attr.aria-selected]="state().selectedIndex === i"
              [attr.id]="'result-' + componentId + '-' + i"
              role="option"
              (click)="selectResult(result, i)"
              (mouseenter)="setSelectedIndex(i)"
            >
              <div class="result-title" [innerHTML]="result.title | highlight: state().query"></div>
              <div class="result-description" [innerHTML]="result.description | highlight: state().query"></div>
            </div>
          </div>
        </ng-template>

        <!-- No Results -->
        <div
          *ngIf="state().results.length === 0 && !state().loading && state().query.length >= 2"
          class="no-results"
          role="status"
          [attr.aria-live]="'polite'"
        >
          No results found for "{{ state().query }}"
        </div>
      </div>
    </div>
  `,
  styles: [`
    .typeahead-container {
      position: relative;
      width: 100%;
      max-width: 500px;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      padding: 12px 40px 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      line-height: 1.5;
      transition: all 0.15s ease;
      background: white;
    }

    .search-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .loading-spinner {
      position: absolute;
      right: 40px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
      visibility: hidden;
      transition: all 0.15s ease;
    }

    .loading-spinner.visible {
      opacity: 1;
      visibility: visible;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #1976d2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .clear-button {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 16px;
      color: #666;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      transition: all 0.15s ease;
    }

    .clear-button:hover {
      background-color: #f5f5f5;
      color: #333;
    }

    .clear-button:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }

    .error-message {
      margin-top: 8px;
      padding: 12px;
      background-color: #ffebee;
      border: 1px solid #f44336;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .error-text {
      color: #c62828;
      font-size: 14px;
    }

    .retry-button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .retry-button:hover {
      background: #1565c0;
    }

    .retry-button:focus {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }

    .results-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 400px;
      overflow: hidden;
    }

    .results-summary {
      padding: 8px 16px;
      font-size: 12px;
      color: #666;
      border-bottom: 1px solid #f0f0f0;
      background-color: #fafafa;
    }

    .virtual-scroll-viewport {
      height: 300px;
    }

    .results-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .result-item {
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .result-item:hover,
    .result-item.selected {
      background-color: #f5f5f5;
    }

    .result-item.selected {
      background-color: #e3f2fd;
      border-left: 3px solid #1976d2;
    }

    .result-item:focus {
      outline: 2px solid #1976d2;
      outline-offset: -2px;
    }

    .result-title {
      font-weight: 500;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .result-description {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }

    .no-results {
      padding: 16px;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* WCAG AA compliant highlight styles */
    :host ::ng-deep .search-highlight {
      background-color: #fff3cd !important;
      color: #856404 !important;
      text-decoration: underline !important;
      font-weight: 500 !important;
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .search-input {
        font-size: 16px; /* Prevents zoom on iOS */
        padding: 14px 40px 14px 16px;
      }

      .results-dropdown {
        max-height: 300px;
      }

      .virtual-scroll-viewport {
        height: 250px;
      }

      .results-list {
        max-height: 250px;
      }
    }
  `]
})
export class TypeaheadSearchComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Type to search...';
  @Input() ariaLabel = 'Search';
  @Input() debounceTimeMs?: number;
  @Input() virtualScrollThreshold = 50;

  @Output() resultSelected = new EventEmitter<SearchResult>();
  @Output() queryChanged = new EventEmitter<string>();

  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild(CdkVirtualScrollViewport) virtualScrollViewport?: CdkVirtualScrollViewport;

  private searchService = inject(SearchService);
  private elementRef = inject(ElementRef);

  // State management with signals
  state = signal<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    selectedIndex: -1
  });

  // Device detection
  private deviceInfo = signal<DeviceInfo>({
    isMobile: this.detectMobile(),
    debounceTime: this.detectMobile() ? 200 : 300
  });

  // Component ID for unique ARIA relationships
  componentId = Math.random().toString(36).substr(2, 9);

  // Observables
  private searchQuery$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  private minLoadingTime = 150; // Minimum loading time to prevent flicker

  // Computed properties
  isDropdownOpen = computed(() => {
    const currentState = this.state();
    return currentState.query.length >= 2 &&
           (currentState.results.length > 0 || currentState.loading);
  });

  ngOnInit(): void {
    this.setupSearchStream();
    this.updateDebounceTimeFromInput();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchStream(): void {
    const debounceTime = this.debounceTimeMs ?? this.deviceInfo().debounceTime;

    this.searchQuery$.pipe(
      debounceTime(debounceTime),
      distinctUntilChanged(),
      filter(query => query.length >= 2),
      tap(() => this.setLoadingState(true)),
      switchMap(query => {
        const startTime = Date.now();
        return this.searchService.search(query).pipe(
          // Ensure minimum loading time to prevent flicker
          delay(Math.max(0, this.minLoadingTime - (Date.now() - startTime))),
          catchError(error => {
            this.handleSearchError(error);
            return [];
          })
        );
      }),
      takeUntilDestroyedOperator()
    ).subscribe(response => {
      this.handleSearchSuccess(response);
    });

    // Clear results when query is too short
    this.searchQuery$.pipe(
      filter(query => query.length < 2),
      takeUntilDestroyedOperator()
    ).subscribe(() => {
      this.clearResults();
    });
  }

  private updateDebounceTimeFromInput(): void {
    if (this.debounceTimeMs) {
      this.deviceInfo.update(info => ({
        ...info,
        debounceTime: this.debounceTimeMs!
      }));
    }
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;

    this.state.update(state => ({
      ...state,
      query,
      selectedIndex: -1,
      error: null
    }));

    this.searchQuery$.next(query);
    this.queryChanged.emit(query);
  }

  onInputFocus(): void {
    // Restore dropdown if there are results
    if (this.state().results.length > 0) {
      // Force dropdown open by ensuring state consistency
    }
  }

  onInputBlur(event: FocusEvent): void {
    // Delay hiding dropdown to allow for result selection
    setTimeout(() => {
      if (!this.elementRef.nativeElement.contains(event.relatedTarget as Node)) {
        this.closeDropdown();
      }
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    const currentState = this.state();

    if (!this.isDropdownOpen() || currentState.results.length === 0) {
      return;
    }

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
        this.selectCurrentResult();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToFirst();
        break;
      case 'End':
        event.preventDefault();
        this.navigateToLast();
        break;
    }
  }

  private navigateDown(): void {
    const currentState = this.state();
    const newIndex = currentState.selectedIndex < currentState.results.length - 1
      ? currentState.selectedIndex + 1
      : 0;

    this.setSelectedIndex(newIndex);
    this.scrollToSelected();
  }

  private navigateUp(): void {
    const currentState = this.state();
    const newIndex = currentState.selectedIndex > 0
      ? currentState.selectedIndex - 1
      : currentState.results.length - 1;

    this.setSelectedIndex(newIndex);
    this.scrollToSelected();
  }

  private navigateToFirst(): void {
    this.setSelectedIndex(0);
    this.scrollToSelected();
  }

  private navigateToLast(): void {
    const currentState = this.state();
    this.setSelectedIndex(currentState.results.length - 1);
    this.scrollToSelected();
  }

  private scrollToSelected(): void {
    const selectedIndex = this.state().selectedIndex;
    if (selectedIndex >= 0 && this.virtualScrollViewport) {
      this.virtualScrollViewport.scrollToIndex(selectedIndex);
    }
  }

  setSelectedIndex(index: number): void {
    this.state.update(state => ({
      ...state,
      selectedIndex: index
    }));
  }

  selectResult(result: SearchResult, index: number): void {
    this.setSelectedIndex(index);
    this.selectCurrentResult();
  }

  private selectCurrentResult(): void {
    const currentState = this.state();
    if (currentState.selectedIndex >= 0 && currentState.selectedIndex < currentState.results.length) {
      const selectedResult = currentState.results[currentState.selectedIndex];
      this.resultSelected.emit(selectedResult);
      this.closeDropdown();
      this.focusInput();
    }
  }

  clearSearch(): void {
    this.state.update(state => ({
      ...state,
      query: '',
      results: [],
      selectedIndex: -1,
      error: null,
      loading: false
    }));

    this.searchQuery$.next('');
    this.focusInput();
    this.queryChanged.emit('');
  }

  retrySearch(): void {
    const currentQuery = this.state().query;
    if (currentQuery.length >= 2) {
      this.state.update(state => ({
        ...state,
        error: null
      }));
      this.searchQuery$.next(currentQuery);
    }
  }

  private closeDropdown(): void {
    this.setSelectedIndex(-1);
  }

  private focusInput(): void {
    this.searchInput.nativeElement.focus();
  }

  private setLoadingState(loading: boolean): void {
    this.state.update(state => ({
      ...state,
      loading,
      error: loading ? null : state.error
    }));
  }

  private handleSearchSuccess(response: any): void {
    this.state.update(state => ({
      ...state,
      results: response?.results || response || [],
      loading: false,
      error: null,
      selectedIndex: -1
    }));
  }

  private handleSearchError(error: any): void {
    this.state.update(state => ({
      ...state,
      results: [],
      loading: false,
      error: error?.error || error?.message || 'Search failed. Please try again.',
      selectedIndex: -1
    }));
  }

  private clearResults(): void {
    this.state.update(state => ({
      ...state,
      results: [],
      loading: false,
      error: null,
      selectedIndex: -1
    }));
  }

  trackByResultId(index: number, item: SearchResult): string {
    return item.id;
  }

  private detectMobile(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    return false;
  }
}