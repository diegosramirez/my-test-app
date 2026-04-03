import { Component, EventEmitter, Output, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WeatherService } from '../services/weather.service';
import { WeatherData, WeatherSearchState, ApiError } from '../models/weather.interface';

@Component({
  selector: 'app-weather-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="search-container">
      <h1>Weather Search</h1>

      <form (ngSubmit)="onSearch()" class="search-form">
        <div class="input-group">
          <label for="city-input" class="sr-only">Enter city name</label>
          <input
            id="city-input"
            type="text"
            [formControl]="cityControl"
            placeholder="Enter city name (e.g., New York, NY)"
            class="search-input"
            [class.error]="showValidationError()"
            [attr.aria-describedby]="showValidationError() ? 'input-error' : null"
            [attr.aria-invalid]="showValidationError()"
            maxlength="50"
          />
          <button
            type="submit"
            class="search-button"
            [disabled]="!canSubmit()"
            [attr.aria-label]="searchState().loading ? 'Searching for weather data' : 'Search for weather'"
          >
            @if (searchState().loading) {
              <span class="loading-text">Searching...</span>
            } @else {
              Search
            }
          </button>
        </div>

        <div class="input-footer">
          <div class="character-count" [class.warning]="(cityControl.value?.length || 0) >= 45">
            {{ cityControl.value?.length || 0 }}/50 characters
          </div>

          @if (showValidationError()) {
            <div id="input-error" class="error-message" role="alert" aria-live="polite">
              {{ getValidationError() }}
            </div>
          }
        </div>
      </form>

      @if (searchState().loading) {
        <div class="loading-states" aria-live="polite" aria-label="Loading status">
          @switch (searchState().loadingStage) {
            @case ('acknowledgment') {
              <div class="loading-acknowledgment">Starting search...</div>
            }
            @case ('searching') {
              <div class="loading-searching">Searching for weather data...</div>
            }
            @case ('spinner') {
              <div class="loading-spinner">
                <div class="spinner" role="status" aria-label="Loading weather data"></div>
                <span>Getting weather information...</span>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./weather-search.component.css']
})
export class WeatherSearchComponent {
  @Output() weatherData = new EventEmitter<WeatherData>();
  @Output() searchError = new EventEmitter<ApiError>();

  private destroyRef = inject(DestroyRef);
  private weatherService = inject(WeatherService);

  cityControl = new FormControl('', [
    Validators.required,
    Validators.maxLength(50)
  ]);

  searchState = signal<WeatherSearchState>({
    loading: false,
    loadingStage: 'idle',
    error: null,
    data: null
  });

  private lastSearchTerm = '';
  private searchingTimeout?: number;
  private spinnerTimeout?: number;

  showValidationError = computed(() => {
    const control = this.cityControl;
    return control.invalid && (control.dirty || control.touched);
  });

  canSubmit = computed(() => {
    return this.cityControl.valid &&
           !this.searchState().loading &&
           this.cityControl.value?.trim() !== this.lastSearchTerm;
  });

  constructor() {
    this.setupInputDebouncing();
  }

  private setupInputDebouncing() {
    this.cityControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(value => {
        const validation = this.weatherService.validateInput(value || '');
        return validation.valid && value?.trim() !== this.lastSearchTerm;
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      // Auto-search when conditions are met after debounce
      if (value?.trim()) {
        this.onSearch();
      }
    });
  }

  onSearch() {
    const cityName = this.cityControl.value?.trim();
    if (!cityName || !this.canSubmit()) {
      return;
    }

    const validation = this.weatherService.validateInput(cityName);
    if (!validation.valid) {
      this.searchError.emit({
        type: 'validation',
        message: validation.message || 'Invalid input'
      });
      return;
    }

    this.lastSearchTerm = cityName;
    this.performSearch(cityName);
  }

  private performSearch(cityName: string) {
    // Clear any existing timeouts
    this.clearSearchTimeouts();

    // Immediate acknowledgment
    this.updateSearchState('acknowledgment');

    // Show "Searching..." after 500ms
    this.searchingTimeout = window.setTimeout(() => {
      if (this.searchState().loading) {
        this.updateSearchState('searching');
      }
    }, 500);

    // Show spinner after 1 second
    this.spinnerTimeout = window.setTimeout(() => {
      if (this.searchState().loading) {
        this.updateSearchState('spinner');
      }
    }, 1000);

    this.weatherService.getWeatherByCity(cityName).pipe(
      finalize(() => {
        this.clearSearchTimeouts();
        this.searchState.update(state => ({
          ...state,
          loading: false,
          loadingStage: 'idle'
        }));
      }),
      catchError(error => {
        this.searchError.emit(error);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      if (data) {
        this.weatherData.emit(data);
        this.searchState.update(state => ({ ...state, data, error: null }));
      }
    });
  }

  private clearSearchTimeouts() {
    if (this.searchingTimeout) {
      clearTimeout(this.searchingTimeout);
      this.searchingTimeout = undefined;
    }
    if (this.spinnerTimeout) {
      clearTimeout(this.spinnerTimeout);
      this.spinnerTimeout = undefined;
    }
  }

  private updateSearchState(stage: WeatherSearchState['loadingStage']) {
    this.searchState.update(state => ({
      ...state,
      loading: true,
      loadingStage: stage,
      error: null
    }));
  }

  getValidationError(): string {
    const control = this.cityControl;
    if (control.errors?.['required']) {
      return 'City name is required';
    }
    if (control.errors?.['maxlength']) {
      return 'City name must be 50 characters or less';
    }
    return '';
  }
}