import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  HostListener,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  merge,
  Observable,
  of,
  Subject,
  timer
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
  catchError,
  delay
} from 'rxjs/operators';

import { SearchService } from './search.service';
import { HighlightPipe } from './highlight.pipe';
import {
  SearchResult,
  SearchRequest,
  SearchResponse,
  SearchError,
  SearchConfig,
  TypeaheadState
} from './search.interface';

interface ComponentState {
  query: string;
  loading: boolean;
  showSpinner: boolean;
  error: SearchError | null;
  results: SearchResult[];
  selectedIndex: number;
  isDropdownVisible: boolean;
  retryCount: number;
  characterCount: number;
}

@Component({
  selector: 'app-typeahead',
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightPipe],
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeaheadComponent),
      multi: true
    }
  ]
})
export class TypeaheadComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder = 'Search...';
  @Input() maxLength = 150;
  @Input() minQueryLength = 1;
  @Input() config: Partial<SearchConfig> = {};
  @Input() searchFn?: (request: SearchRequest) => Observable<SearchResponse>;

  @Output() resultSelected = new EventEmitter<SearchResult>();
  @Output() searchStarted = new EventEmitter<{ query: string; queryLength: number }>();
  @Output() searchCompleted = new EventEmitter<{
    responseTime: number;
    resultCount: number;
    query: string;
  }>();
  @Output() requestCancelled = new EventEmitter<{ reason: string; queryLength: number }>();
  @Output() searchError = new EventEmitter<{
    errorType: string;
    retryCount: number;
    query: string;
  }>();
  @Output() keyboardNavigation = new EventEmitter<{
    keyPressed: string;
    currentIndex: number;
  }>();

  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownRef') dropdownRef?: ElementRef<HTMLElement>;

  // State streams
  private readonly query$ = new BehaviorSubject<string>('');
  private readonly loading$ = new BehaviorSubject<boolean>(false);
  private readonly error$ = new BehaviorSubject<SearchError | null>(null);
  private readonly results$ = new BehaviorSubject<SearchResult[]>([]);
  readonly selectedIndex$ = new BehaviorSubject<number>(-1);
  private readonly retryCount$ = new BehaviorSubject<number>(0);
  private readonly destroy$ = new Subject<void>();

  // Combined state
  state$: Observable<ComponentState>;

  // ControlValueAccessor
  private onChange = (value: string) => {};
  onTouched = () => {};

  constructor(
    private searchService: SearchService,
    private cdr: ChangeDetectorRef
  ) {
    // Create spinner delay stream
    const showSpinner$ = this.loading$.pipe(
      switchMap(loading =>
        loading
          ? timer(200).pipe(map(() => true), startWith(false))
          : of(false)
      )
    );

    this.state$ = combineLatest([
      this.query$,
      this.loading$,
      this.error$,
      this.results$,
      this.selectedIndex$,
      this.retryCount$,
      showSpinner$
    ]).pipe(
      map(([query, loading, error, results, selectedIndex, retryCount, showSpinner]) => ({
        query,
        loading,
        showSpinner,
        error,
        results,
        selectedIndex,
        isDropdownVisible: query.length >= this.minQueryLength && (results.length > 0 || loading || error !== null),
        retryCount,
        characterCount: query.length
      }))
    );
  }

  ngOnInit(): void {
    this.setupSearchStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchStream(): void {
    this.query$.pipe(
      debounceTime(this.config.debounceMs || 300),
      distinctUntilChanged(),
      filter(query => query.trim().length >= this.minQueryLength || query.trim().length === 0),
      tap(query => {
        if (query.trim().length === 0) {
          this.results$.next([]);
          this.selectedIndex$.next(-1);
          this.loading$.next(false);
          this.error$.next(null);
          return;
        }

        this.loading$.next(true);
        this.error$.next(null);
        this.selectedIndex$.next(-1);

        const startTime = Date.now();
        this.searchStarted.emit({
          query,
          queryLength: query.length
        });
      }),
      switchMap(query => {
        if (query.trim().length === 0) {
          return EMPTY;
        }

        const searchFn = this.searchFn || ((req: SearchRequest) => this.searchService.search(req, this.config));
        const startTime = Date.now();

        return searchFn({ query: query.trim() }).pipe(
          tap(response => {
            const responseTime = Date.now() - startTime;
            this.searchCompleted.emit({
              responseTime,
              resultCount: response.results.length,
              query
            });
          }),
          catchError(error => {
            const retryCount = this.retryCount$.value;
            this.retryCount$.next(retryCount + 1);

            this.searchError.emit({
              errorType: error.errorCode || 'UNKNOWN',
              retryCount: retryCount + 1,
              query
            });

            this.error$.next(error);
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(response => {
      this.results$.next(response.results);
      this.loading$.next(false);
      this.retryCount$.next(0);
    });
  }


  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Enforce character limit
    if (value.length > this.maxLength) {
      input.value = value.substring(0, this.maxLength);
      return;
    }

    this.query$.next(value);
    this.onChange(value);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const currentState = this.getCurrentState();

    if (!currentState.isDropdownVisible) {
      return;
    }

    switch (event.code) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateDown(currentState);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.navigateUp(currentState);
        break;

      case 'Enter':
        event.preventDefault();
        this.selectCurrentResult(currentState);
        break;

      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;

      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  private navigateDown(state: ComponentState): void {
    const newIndex = state.selectedIndex < state.results.length - 1
      ? state.selectedIndex + 1
      : 0;

    this.selectedIndex$.next(newIndex);
    this.keyboardNavigation.emit({
      keyPressed: 'ArrowDown',
      currentIndex: newIndex
    });
    this.updateAriaActivedescendant(newIndex);
  }

  private navigateUp(state: ComponentState): void {
    const newIndex = state.selectedIndex > 0
      ? state.selectedIndex - 1
      : state.results.length - 1;

    this.selectedIndex$.next(newIndex);
    this.keyboardNavigation.emit({
      keyPressed: 'ArrowUp',
      currentIndex: newIndex
    });
    this.updateAriaActivedescendant(newIndex);
  }

  private selectCurrentResult(state: ComponentState): void {
    if (state.selectedIndex >= 0 && state.selectedIndex < state.results.length) {
      const result = state.results[state.selectedIndex];
      this.selectResult(result, 'keyboard');
    }
  }

  selectResult(result: SearchResult, method: 'keyboard' | 'mouse' = 'mouse'): void {
    this.query$.next(result.title);
    this.onChange(result.title);
    this.closeDropdown();
    this.resultSelected.emit(result);

    // Focus management
    this.inputRef.nativeElement.focus();
  }

  closeDropdown(): void {
    this.results$.next([]);
    this.selectedIndex$.next(-1);
    this.error$.next(null);
    this.loading$.next(false);
    this.updateAriaActivedescendant(-1);
  }

  retry(): void {
    const currentQuery = this.query$.value;
    if (currentQuery.trim()) {
      this.error$.next(null);
      this.query$.next(''); // Reset to trigger new search
      setTimeout(() => this.query$.next(currentQuery), 10);
    }
  }

  trackByResultId(index: number, result: SearchResult): string {
    return result.id;
  }

  getResultId(index: number): string {
    return `typeahead-result-${index}`;
  }

  onResultHover(index: number): void {
    this.selectedIndex$.next(index);
  }

  private updateAriaActivedescendant(index: number): void {
    const input = this.inputRef.nativeElement;
    if (index >= 0) {
      input.setAttribute('aria-activedescendant', this.getResultId(index));
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  private getCurrentState(): ComponentState {
    return {
      query: this.query$.value,
      loading: this.loading$.value,
      showSpinner: this.loading$.value,
      error: this.error$.value,
      results: this.results$.value,
      selectedIndex: this.selectedIndex$.value,
      isDropdownVisible: this.query$.value.length >= this.minQueryLength &&
        (this.results$.value.length > 0 || this.loading$.value || this.error$.value !== null),
      retryCount: this.retryCount$.value,
      characterCount: this.query$.value.length
    };
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.query$.next(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.inputRef) {
      this.inputRef.nativeElement.disabled = isDisabled;
    }
  }
}