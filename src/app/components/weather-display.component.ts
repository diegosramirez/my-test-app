import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherData } from '../models/weather.interface';

@Component({
  selector: 'app-weather-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (weatherData) {
      <div class="weather-card" role="region" aria-label="Weather information">
        <div class="weather-header">
          <h2 class="city-name">{{ weatherData.city }}</h2>
        </div>

        <div class="weather-content">
          <div class="temperature-section">
            <div class="temperature" aria-label="Temperature">
              {{ weatherData.temperature }}°F
            </div>
            <div class="condition">{{ weatherData.condition }}</div>
          </div>

          <div class="weather-details">
            <div class="description">{{ weatherData.description }}</div>

            @if (weatherData.humidity !== undefined || weatherData.windSpeed !== undefined) {
              <div class="additional-info">
                @if (weatherData.humidity !== undefined) {
                  <div class="info-item">
                    <span class="info-label">Humidity:</span>
                    <span class="info-value">{{ weatherData.humidity }}%</span>
                  </div>
                }

                @if (weatherData.windSpeed !== undefined) {
                  <div class="info-item">
                    <span class="info-label">Wind Speed:</span>
                    <span class="info-value">{{ weatherData.windSpeed }} m/s</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="weather-footer">
          <button
            type="button"
            class="new-search-button"
            (click)="onNewSearch()"
            aria-label="Start a new weather search"
          >
            Search Another City
          </button>
        </div>
      </div>
    }
  `,
  styleUrls: ['./weather-display.component.css']
})
export class WeatherDisplayComponent {
  @Input() weatherData: WeatherData | null = null;

  onNewSearch() {
    // This could emit an event or be handled by parent component
    // For simplicity, we'll let the parent handle clearing the data
  }
}