import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherData, WeatherSearchState, WeatherErrorType } from '../../models/weather.interface';

@Component({
  selector: 'app-weather-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather-display.component.html',
  styleUrl: './weather-display.component.css'
})
export class WeatherDisplayComponent {
  @Input() searchState = signal<WeatherSearchState>({
    isLoading: false,
    weatherData: null,
    error: null,
    hasSearched: false
  });

  @Output() retrySearch = new EventEmitter<void>();
  @Output() clearResults = new EventEmitter<void>();

  // Computed properties for template
  isLoading = computed(() => this.searchState().isLoading);
  weatherData = computed(() => this.searchState().weatherData);
  error = computed(() => this.searchState().error);
  hasSearched = computed(() => this.searchState().hasSearched);
  hasData = computed(() => !!this.searchState().weatherData);
  hasError = computed(() => !!this.searchState().error);

  // Error type checking
  isNetworkError = computed(() =>
    this.error()?.includes('network') || this.error()?.includes('connection')
  );

  isInvalidCityError = computed(() =>
    this.error()?.includes('not found') || this.error()?.includes('spelling')
  );

  isRateLimitError = computed(() =>
    this.error()?.includes('rate') || this.error()?.includes('many requests')
  );

  onRetryClick(): void {
    this.retrySearch.emit();
  }

  onClearClick(): void {
    this.clearResults.emit();
  }

  getTemperatureColor(temp: number): string {
    if (temp <= 0) return '#3b82f6'; // Blue for freezing
    if (temp <= 10) return '#06b6d4'; // Cyan for cold
    if (temp <= 20) return '#10b981'; // Green for mild
    if (temp <= 30) return '#f59e0b'; // Yellow for warm
    return '#ef4444'; // Red for hot
  }

  getWindDescription(speed: number): string {
    if (speed < 1) return 'Calm';
    if (speed < 5) return 'Light breeze';
    if (speed < 10) return 'Gentle breeze';
    if (speed < 15) return 'Moderate breeze';
    if (speed < 20) return 'Fresh breeze';
    return 'Strong breeze';
  }

  getHumidityDescription(humidity: number): string {
    if (humidity < 30) return 'Low';
    if (humidity < 60) return 'Comfortable';
    if (humidity < 80) return 'High';
    return 'Very high';
  }

  formatTemperature(temp: number): string {
    return `${temp}°C`;
  }

  capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getErrorIcon(): string {
    if (this.isNetworkError()) return '📡';
    if (this.isInvalidCityError()) return '🏙️';
    if (this.isRateLimitError()) return '⏱️';
    return '❌';
  }

  getRetryButtonText(): string {
    if (this.isNetworkError()) return 'Check Connection & Retry';
    if (this.isInvalidCityError()) return 'Try Different City';
    if (this.isRateLimitError()) return 'Try Again Later';
    return 'Retry Search';
  }

  getSuggestionText(): string {
    if (this.isInvalidCityError()) {
      return 'Try checking the spelling or using a different city name format';
    }
    if (this.isNetworkError()) {
      return 'Please check your internet connection and try again';
    }
    if (this.isRateLimitError()) {
      return 'Please wait a moment before searching again';
    }
    return 'Please try your search again';
  }
}