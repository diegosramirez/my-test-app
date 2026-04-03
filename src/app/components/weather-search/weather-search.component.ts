import { Component, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { WeatherService } from '../../services/weather.service';

@Component({
  selector: 'app-weather-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './weather-search.component.html',
  styleUrl: './weather-search.component.css'
})
export class WeatherSearchComponent implements OnInit, OnDestroy {
  private readonly weatherService = inject(WeatherService);
  private destroy$ = new Subject<void>();

  @Output() searchSubmitted = new EventEmitter<string>();
  @Output() inputValidationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();

  searchControl = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.pattern(/^[a-zA-Z\s\-']+$/)
  ]);

  recentSearches = signal<string[]>([]);
  showRecentSearches = signal(false);
  validationErrors = signal<string[]>([]);

  ngOnInit(): void {
    // Load recent searches
    this.weatherService.loadRecentSearches();
    this.weatherService.recentSearches$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(searches => {
      this.recentSearches.set(searches);
    });

    // Setup debounced validation
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.validateInput();
    });

    // Setup focus/blur handlers for recent searches
    this.setupInputHandlers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.searchControl.valid && this.searchControl.value?.trim()) {
      const cityName = this.searchControl.value.trim();
      this.searchSubmitted.emit(cityName);
      this.weatherService.addToRecentSearches(cityName);
      this.hideRecentSearches();
    } else {
      this.validateInput();
      this.announceValidationErrors();
    }
  }

  onRecentSearchClick(cityName: string): void {
    this.searchControl.setValue(cityName);
    this.searchSubmitted.emit(cityName);
    this.hideRecentSearches();
  }

  onInputFocus(): void {
    if (this.recentSearches().length > 0 && !this.searchControl.value?.trim()) {
      this.showRecentSearches.set(true);
    }
  }

  onInputBlur(): void {
    // Delay hiding to allow recent search clicks
    setTimeout(() => {
      this.showRecentSearches.set(false);
    }, 150);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    } else if (event.key === 'Escape') {
      this.hideRecentSearches();
    }
  }

  clearRecentSearches(): void {
    this.weatherService.clearRecentSearches();
    this.hideRecentSearches();
  }

  private setupInputHandlers(): void {
    // Additional input handling if needed
  }

  private validateInput(): void {
    const errors: string[] = [];
    const value = this.searchControl.value?.trim() || '';

    if (this.searchControl.hasError('required') && value === '') {
      errors.push('Please enter a city name');
    } else if (this.searchControl.hasError('minlength')) {
      errors.push('City name must be at least 2 characters');
    } else if (this.searchControl.hasError('pattern')) {
      errors.push('City name can only contain letters, spaces, hyphens, and apostrophes');
    }

    this.validationErrors.set(errors);
    this.inputValidationChange.emit({
      isValid: this.searchControl.valid && value.length > 0,
      errors
    });
  }

  private hideRecentSearches(): void {
    this.showRecentSearches.set(false);
  }

  private announceValidationErrors(): void {
    // Announce validation errors to screen readers
    const errorMessage = this.validationErrors().join('. ');
    if (errorMessage) {
      const announcement = document.getElementById('validation-announcer');
      if (announcement) {
        announcement.textContent = errorMessage;
      }
    }
  }
}