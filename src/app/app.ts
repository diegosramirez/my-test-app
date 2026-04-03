import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { WeatherSearchComponent } from './components/weather-search/weather-search.component';
import { WeatherDisplayComponent } from './components/weather-display/weather-display.component';
import { WeatherService } from './services/weather.service';
import { WeatherData, WeatherSearchState } from './models/weather.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    WeatherSearchComponent,
    WeatherDisplayComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly weatherService = inject(WeatherService);
  private destroy$ = new Subject<void>();

  searchState = signal<WeatherSearchState>({
    isLoading: false,
    weatherData: null,
    error: null,
    hasSearched: false
  });

  lastSearchCity = signal<string>('');

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchSubmitted(cityName: string): void {
    this.lastSearchCity.set(cityName);
    this.setLoadingState(true);

    this.weatherService.getWeatherData(cityName).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (weatherData: WeatherData) => {
        this.setSuccessState(weatherData);
        this.announceWeatherData(weatherData);
      },
      error: (error: any) => {
        this.setErrorState(error.message || 'An unexpected error occurred');
        this.announceError(error.message);
      }
    });
  }

  onRetrySearch(): void {
    if (this.lastSearchCity()) {
      this.onSearchSubmitted(this.lastSearchCity());
    }
  }

  onClearResults(): void {
    this.searchState.set({
      isLoading: false,
      weatherData: null,
      error: null,
      hasSearched: false
    });
    this.lastSearchCity.set('');
  }

  onInputValidationChange(validation: { isValid: boolean; errors: string[] }): void {
    // Handle input validation changes if needed
    if (!validation.isValid && validation.errors.length > 0) {
      // Could announce validation errors to screen readers
    }
  }

  private setLoadingState(isLoading: boolean): void {
    this.searchState.update(state => ({
      ...state,
      isLoading,
      error: null,
      hasSearched: true
    }));
  }

  private setSuccessState(weatherData: WeatherData): void {
    this.searchState.set({
      isLoading: false,
      weatherData,
      error: null,
      hasSearched: true
    });
  }

  private setErrorState(error: string): void {
    this.searchState.update(state => ({
      ...state,
      isLoading: false,
      weatherData: null,
      error,
      hasSearched: true
    }));
  }

  private announceWeatherData(data: WeatherData): void {
    // Announce successful weather data load to screen readers
    const announcement = `Weather data loaded for ${data.cityName}. Current temperature is ${data.temperature} degrees Celsius with ${data.condition} conditions.`;
    this.announceToScreenReader(announcement);
  }

  private announceError(error: string): void {
    // Announce errors to screen readers
    this.announceToScreenReader(`Weather search error: ${error}`);
  }

  private announceToScreenReader(message: string): void {
    const announcer = document.getElementById('app-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }
}
