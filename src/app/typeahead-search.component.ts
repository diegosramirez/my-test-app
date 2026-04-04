import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError, delay, filter, finalize } from 'rxjs/operators';
import { of, timer, EMPTY } from 'rxjs';
import { SearchService } from './search.service';
import { SearchResult, SearchState } from './search-result.interface';
import { HighlightPipe } from './highlight.pipe';

@Component({
  selector: 'app-typeahead-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, HighlightPipe],
  templateUrl: './typeahead-search.component.html',
  styleUrls: ['./typeahead-search.component.scss']
})
export class TypeaheadSearchComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Search...';
  @Input() searchEndpoint: string = '/api/search';
  @Output() resultSelected = new EventEmitter<SearchResult>();

  @ViewChild('searchInput', { static: true }) searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdown', { static: false }) dropdown!: ElementRef<HTMLDivElement>;

  searchControl = new FormControl('');
  searchState: SearchState = {
    query: '',
    loading: false,
    error: null,
    results: []
  };

  showDropdown = false;
  selectedIndex = -1;
  loadingStartTime: number = 0;
  errorDismissTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private searchService: SearchService,
    private elementRef: ElementRef
  ) {
    this.initializeSearch();
  }

  ngOnInit() {
    // Focus the input element
    setTimeout(() => this.searchInput.nativeElement.focus(), 0);
  }

  private initializeSearch() {
    this.searchControl.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(300),
      distinctUntilChanged(),
      filter(query => query !== null),
      switchMap(query => {
        const trimmedQuery = query?.trim() || '';

        if (trimmedQuery.length === 0) {
          this.resetSearch();
          return EMPTY;
        }

        this.searchState.query = trimmedQuery;
        this.searchState.error = null;
        this.loadingStartTime = Date.now();

        // Set loading after 100ms delay to avoid flicker for fast requests
        const loadingTimer = timer(100).subscribe(() => {
          if (this.searchState.query === trimmedQuery) {
            this.searchState.loading = true;
          }
        });

        return this.searchService.search(trimmedQuery, this.searchEndpoint).pipe(
          catchError(error => {
            this.handleSearchError(error.message);
            return of([]);
          }),
          finalize(() => {
            loadingTimer.unsubscribe();
            if (this.searchState.query === trimmedQuery) {
              this.searchState.loading = false;
            }
          })
        );
      })
    ).subscribe(results => {
      this.searchState.results = results;
      this.showDropdown = results.length > 0;
      this.selectedIndex = -1;
      this.updateDropdownPosition();
    });
  }

  private resetSearch() {
    this.searchState = {
      query: '',
      loading: false,
      error: null,
      results: []
    };
    this.showDropdown = false;
    this.selectedIndex = -1;
    this.clearErrorTimeout();
  }

  private handleSearchError(errorMessage: string) {
    this.searchState.loading = false;
    this.searchState.error = errorMessage;
    this.showDropdown = false;

    // Auto-dismiss error after 5 seconds
    this.errorDismissTimeout = setTimeout(() => {
      this.searchState.error = null;
    }, 5000);
  }

  private clearErrorTimeout() {
    if (this.errorDismissTimeout) {
      clearTimeout(this.errorDismissTimeout);
      this.errorDismissTimeout = undefined;
    }
  }

  ngOnDestroy() {
    // Cleanup handled by takeUntilDestroyed()
    this.clearErrorTimeout();
  }

  private updateDropdownPosition() {
    if (!this.dropdown) return;

    setTimeout(() => {
      const inputRect = this.searchInput.nativeElement.getBoundingClientRect();
      const dropdownElement = this.dropdown.nativeElement;
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdownElement.offsetHeight;

      // Check if dropdown would go beyond viewport
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        // Position above input
        dropdownElement.style.top = 'auto';
        dropdownElement.style.bottom = '100%';
        dropdownElement.style.marginBottom = '4px';
        dropdownElement.style.marginTop = '0';
      } else {
        // Position below input (default)
        dropdownElement.style.top = '100%';
        dropdownElement.style.bottom = 'auto';
        dropdownElement.style.marginTop = '4px';
        dropdownElement.style.marginBottom = '0';
      }
    }, 0);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.showDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchState.results.length - 1);
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.scrollToSelected();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.searchState.results.length) {
          this.selectResult(this.searchState.results[this.selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.showDropdown = false;
        this.selectedIndex = -1;
        this.searchInput.nativeElement.blur();
        break;
    }
  }

  private scrollToSelected() {
    if (!this.dropdown || this.selectedIndex < 0) return;

    const selectedElement = this.dropdown.nativeElement.querySelector(`[data-index="${this.selectedIndex}"]`) as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }

  selectResult(result: SearchResult) {
    this.resultSelected.emit(result);
    this.searchControl.setValue(result.title);
    this.showDropdown = false;
    this.selectedIndex = -1;
  }

  retrySearch() {
    this.clearErrorTimeout();
    this.searchState.error = null;

    const currentQuery = this.searchControl.value;
    if (currentQuery) {
      // Trigger search again by updating the form control
      this.searchControl.setValue('');
      setTimeout(() => this.searchControl.setValue(currentQuery), 10);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.showDropdown = false;
      this.selectedIndex = -1;
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.showDropdown) {
      this.updateDropdownPosition();
    }
  }
}