import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WeatherSearchComponent } from './components/weather-search.component';
import { WeatherDisplayComponent } from './components/weather-display.component';
import { ErrorDisplayComponent } from './components/error-display.component';
import { WeatherData, ApiError } from './models/weather.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    WeatherSearchComponent,
    WeatherDisplayComponent,
    ErrorDisplayComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  currentWeatherData = signal<WeatherData | null>(null);
  currentError = signal<ApiError | null>(null);

  onWeatherData(data: WeatherData) {
    this.currentWeatherData.set(data);
    this.currentError.set(null);
  }

  onSearchError(error: ApiError) {
    this.currentError.set(error);
    this.currentWeatherData.set(null);
  }

  onRetrySearch() {
    this.currentError.set(null);
    // The search component will handle the retry
  }

  onDismissError() {
    this.currentError.set(null);
  }

  onNewSearch() {
    this.currentWeatherData.set(null);
    this.currentError.set(null);
  }
}
