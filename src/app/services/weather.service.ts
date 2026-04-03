import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { map, catchError, timeout, shareReplay } from 'rxjs/operators';
import { WeatherData, WeatherApiResponse, WeatherApiError, WeatherErrorType } from '../models/weather.interface';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly API_KEY = 'demo_key'; // In production, use environment variables
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
  private readonly TIMEOUT_DURATION = 8000; // 8 seconds timeout

  private recentSearchesSubject = new BehaviorSubject<string[]>([]);
  public recentSearches$ = this.recentSearchesSubject.asObservable();

  getWeatherData(cityName: string): Observable<WeatherData> {
    const trimmedCity = cityName.trim();

    if (!trimmedCity || trimmedCity.length < 2) {
      return throwError(() => ({
        type: WeatherErrorType.INVALID_CITY,
        message: 'City name must be at least 2 characters long'
      }));
    }

    // Validate city name format
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedCity)) {
      return throwError(() => ({
        type: WeatherErrorType.INVALID_CITY,
        message: 'City name contains invalid characters'
      }));
    }

    const params = {
      q: trimmedCity,
      appid: this.API_KEY,
      units: 'metric'
    };

    return this.http.get<WeatherApiResponse>(this.BASE_URL, { params }).pipe(
      timeout(this.TIMEOUT_DURATION),
      map(response => this.transformApiResponse(response)),
      catchError(error => this.handleApiError(error)),
      shareReplay(1)
    );
  }

  addToRecentSearches(cityName: string): void {
    const current = this.recentSearchesSubject.value;
    const updated = [cityName, ...current.filter(city => city !== cityName)].slice(0, 5);

    // Persist to localStorage
    try {
      localStorage.setItem('weather_recent_searches', JSON.stringify(updated));
    } catch (e) {
      // Handle localStorage errors silently
    }

    this.recentSearchesSubject.next(updated);
  }

  loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem('weather_recent_searches');
      if (stored) {
        const searches = JSON.parse(stored);
        this.recentSearchesSubject.next(searches);
      }
    } catch (e) {
      // Handle localStorage errors silently
    }
  }

  clearRecentSearches(): void {
    try {
      localStorage.removeItem('weather_recent_searches');
    } catch (e) {
      // Handle localStorage errors silently
    }
    this.recentSearchesSubject.next([]);
  }

  private transformApiResponse(response: WeatherApiResponse): WeatherData {
    return {
      cityName: response.name,
      temperature: Math.round(response.main.temp),
      condition: response.weather[0].main,
      description: response.weather[0].description,
      humidity: response.main.humidity,
      windSpeed: response.wind.speed,
      icon: response.weather[0].icon,
      country: response.sys.country
    };
  }

  private handleApiError(error: any): Observable<never> {
    let errorType: WeatherErrorType;
    let message: string;

    if (error.name === 'TimeoutError') {
      errorType = WeatherErrorType.TIMEOUT_ERROR;
      message = 'Request timed out. Please check your connection and try again.';
    } else if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          errorType = WeatherErrorType.API_RATE_LIMIT;
          message = 'API authentication failed. Please try again later.';
          break;
        case 404:
          errorType = WeatherErrorType.INVALID_CITY;
          message = 'City not found. Please check the spelling and try again.';
          break;
        case 429:
          errorType = WeatherErrorType.API_RATE_LIMIT;
          message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 0:
        case 500:
        case 502:
        case 503:
          errorType = WeatherErrorType.NETWORK_ERROR;
          message = 'Unable to connect to weather service. Please check your internet connection.';
          break;
        default:
          errorType = WeatherErrorType.UNKNOWN_ERROR;
          message = 'An unexpected error occurred. Please try again.';
      }
    } else {
      errorType = WeatherErrorType.NETWORK_ERROR;
      message = 'Network error. Please check your internet connection.';
    }

    return throwError(() => ({ type: errorType, message }));
  }
}