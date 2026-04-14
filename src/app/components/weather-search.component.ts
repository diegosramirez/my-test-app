import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../services/weather.service';
import { WeatherData, ApiError, SearchState } from '../models/weather.model';

@Component({
  selector: 'app-weather-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="weather-app">
      <h1>Weather Search</h1>

      <div class="search-container">
        <form (ngSubmit)="searchWeather()" #searchForm="ngForm" novalidate>
          <div class="input-group">
            <label for="city-input" class="sr-only">Enter city name</label>
            <input
              id="city-input"
              type="text"
              [(ngModel)]="cityName"
              name="city"
              placeholder="Enter city name"
              class="city-input"
              [class.error]="validationError()"
              [disabled]="isLoading()"
              required
              autocomplete="off"
              aria-describedby="validation-error"
              (keypress)="onKeyPress($event)"
            />
            <button
              type="submit"
              class="search-button"
              [disabled]="isLoading()"
              aria-label="Search for weather"
            >
              @if (isLoading()) {
                <span class="loading-spinner" aria-hidden="true"></span>
                Searching...
              } @else {
                Search
              }
            </button>
          </div>

          @if (validationError()) {
            <div id="validation-error" class="error-message" role="alert">
              {{ validationError() }}
            </div>
          }
        </form>
      </div>

      @if (apiError()) {
        <div class="error-container" role="alert">
          <div class="error-message">
            {{ apiError()?.message }}
          </div>
          @if (apiError()?.type === 'not-found' || apiError()?.type === 'network') {
            <button
              class="retry-button"
              (click)="retryLastSearch()"
              [disabled]="isLoading()"
            >
              Try Again
            </button>
          }
        </div>
      }

      @if (weatherData()) {
        <div class="weather-display">
          <div class="weather-card">
            <h2>{{ weatherData()?.city }}</h2>
            <div class="temperature">
              {{ weatherData()?.temperature }}°C
            </div>
            <div class="description">
              {{ weatherData()?.description | titlecase }}
            </div>
            @if (weatherData()?.humidity) {
              <div class="additional-info">
                <span>Humidity: {{ weatherData()?.humidity }}%</span>
                @if (weatherData()?.windSpeed) {
                  <span>Wind: {{ weatherData()?.windSpeed }} m/s</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .weather-app {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      font-size: 2.5rem;
      font-weight: 300;
    }

    .search-container {
      margin-bottom: 30px;
    }

    .input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .city-input {
      flex: 1;
      padding: 12px 16px;
      font-size: 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.3s ease;
      min-height: 24px;
    }

    .city-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .city-input.error {
      border-color: #dc3545;
    }

    .city-input:disabled {
      background-color: #f8f9fa;
      cursor: not-allowed;
    }

    .search-button {
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
      color: white;
      background-color: #007bff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      min-width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .search-button:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .search-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-container {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .error-message {
      margin-bottom: 10px;
      font-weight: 500;
    }

    .retry-button {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s ease;
    }

    .retry-button:hover:not(:disabled) {
      background-color: #c82333;
    }

    .retry-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .weather-display {
      display: flex;
      justify-content: center;
    }

    .weather-card {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 280px;
    }

    .weather-card h2 {
      margin: 0 0 20px 0;
      font-size: 1.8rem;
      font-weight: 400;
    }

    .temperature {
      font-size: 4rem;
      font-weight: 300;
      margin: 20px 0;
      line-height: 1;
    }

    .description {
      font-size: 1.2rem;
      margin-bottom: 20px;
      opacity: 0.9;
    }

    .additional-info {
      display: flex;
      justify-content: space-around;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      font-size: 0.9rem;
      opacity: 0.8;
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

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .weather-app {
        padding: 15px;
      }

      h1 {
        font-size: 2rem;
      }

      .input-group {
        flex-direction: column;
      }

      .search-button {
        width: 100%;
        min-height: 48px;
      }

      .city-input {
        min-height: 48px;
      }

      .weather-card {
        padding: 25px 20px;
        min-width: auto;
      }

      .temperature {
        font-size: 3rem;
      }

      .additional-info {
        flex-direction: column;
        gap: 10px;
      }
    }
  `]
})
export class WeatherSearchComponent {
  cityName = '';
  private lastSearchedCity = '';

  // Signals for reactive state management
  searchState = signal<SearchState>('idle');
  weatherData = signal<WeatherData | null>(null);
  apiError = signal<ApiError | null>(null);
  validationError = signal<string | null>(null);

  constructor(private weatherService: WeatherService) {}

  // Computed properties for better template readability
  isLoading = () => this.searchState() === 'loading';

  searchWeather(): void {
    this.clearErrors();

    if (!this.validateInput()) {
      return;
    }

    this.performSearch(this.cityName);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchWeather();
    }
  }

  retryLastSearch(): void {
    if (this.lastSearchedCity) {
      this.cityName = this.lastSearchedCity;
      this.performSearch(this.lastSearchedCity);
    }
  }

  private validateInput(): boolean {
    const trimmedCity = this.cityName.trim();

    if (!trimmedCity) {
      this.validationError.set('Please enter a city name');
      return false;
    }

    if (trimmedCity.length < 2) {
      this.validationError.set('City name must be at least 2 characters long');
      return false;
    }

    if (!/^[a-zA-Z\s\-']+$/.test(trimmedCity)) {
      this.validationError.set('City name can only contain letters, spaces, hyphens, and apostrophes');
      return false;
    }

    return true;
  }

  private performSearch(city: string): void {
    this.searchState.set('loading');
    this.lastSearchedCity = city;

    this.weatherService.getWeatherByCity(city).subscribe({
      next: (data) => {
        this.weatherData.set(data);
        this.searchState.set('success');
      },
      error: (error: ApiError) => {
        this.apiError.set(error);
        this.searchState.set('error');
      }
    });
  }

  private clearErrors(): void {
    this.validationError.set(null);
    this.apiError.set(null);
  }
}