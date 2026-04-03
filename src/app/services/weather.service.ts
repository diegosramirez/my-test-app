import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout, catchError, map } from 'rxjs';
import { WeatherData, ApiError, OpenWeatherMapResponse } from '../models/weather.interface';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly API_KEY = 'demo_key'; // In production, use environment variable
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
  private readonly TIMEOUT_MS = 2000;

  constructor(private http: HttpClient) {}

  getWeatherByCity(cityName: string): Observable<WeatherData> {
    const sanitizedCity = this.sanitizeInput(cityName);
    const url = `${this.BASE_URL}?q=${encodeURIComponent(sanitizedCity)}&appid=${this.API_KEY}`;

    return this.http.get<OpenWeatherMapResponse>(url).pipe(
      timeout(this.TIMEOUT_MS),
      map(response => this.transformWeatherData(response)),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  private sanitizeInput(input: string): string {
    // Remove special characters except spaces, commas, and hyphens
    return input.replace(/[^a-zA-Z0-9\s,.-]/g, '').trim();
  }

  private transformWeatherData(response: OpenWeatherMapResponse): WeatherData {
    return {
      city: response.name,
      temperature: this.kelvinToFahrenheit(response.main.temp),
      condition: response.weather[0]?.main || 'Unknown',
      description: response.weather[0]?.description || 'No description available',
      humidity: response.main.humidity,
      windSpeed: response.wind?.speed
    };
  }

  private kelvinToFahrenheit(kelvin: number): number {
    return Math.round((kelvin - 273.15) * 9/5 + 32);
  }

  private handleError(error: any): ApiError {
    if (error.name === 'TimeoutError') {
      return {
        type: 'timeout',
        message: 'Request timed out, please try again'
      };
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 404:
          return {
            type: 'not_found',
            message: 'City not found. Try checking spelling or use format like "New York, NY"',
            statusCode: 404
          };
        case 429:
          return {
            type: 'rate_limit',
            message: 'Too many requests, please wait a moment',
            statusCode: 429
          };
        case 0:
          return {
            type: 'network',
            message: 'Unable to connect. Please check your internet connection',
            statusCode: 0
          };
        default:
          return {
            type: 'unknown',
            message: 'An unexpected error occurred. Please try again',
            statusCode: error.status
          };
      }
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again'
    };
  }

  validateInput(input: string): { valid: boolean; message?: string } {
    if (!input || input.trim().length === 0) {
      return { valid: false, message: 'City name cannot be empty' };
    }

    if (input.length > 50) {
      return { valid: false, message: 'City name must be 50 characters or less' };
    }

    return { valid: true };
  }
}