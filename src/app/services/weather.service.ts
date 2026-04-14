import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WeatherData, ApiError, OpenWeatherMapResponse } from '../models/weather.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly baseUrl = environment.weatherApi.baseUrl;
  private readonly apiKey = environment.weatherApi.apiKey;
  private readonly timeoutMs = 10000; // 10 second timeout

  constructor(private http: HttpClient) {}

  getWeatherByCity(city: string): Observable<WeatherData> {
    if (!city.trim()) {
      return throwError(() => this.createApiError('validation', 'City name is required'));
    }

    const url = `${this.baseUrl}/weather`;
    const params = {
      q: city.trim(),
      appid: this.apiKey,
      units: 'metric' // Get temperature in Celsius
    };

    return this.http.get<OpenWeatherMapResponse>(url, { params })
      .pipe(
        timeout(this.timeoutMs),
        map(response => this.transformResponse(response)),
        catchError(error => this.handleError(error))
      );
  }

  private transformResponse(response: OpenWeatherMapResponse): WeatherData {
    return {
      city: response.name,
      temperature: Math.round(response.main.temp),
      description: response.weather[0].description,
      humidity: response.main.humidity,
      windSpeed: response.wind.speed
    };
  }

  private handleError(error: HttpErrorResponse | Error): Observable<never> {
    let apiError: ApiError;

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 404:
          apiError = this.createApiError('not-found',
            'City not found. Please check the city name and try again.');
          break;
        case 429:
          apiError = this.createApiError('rate-limit',
            'Too many requests. Please wait a moment and try again.');
          break;
        case 500:
        case 502:
        case 503:
          apiError = this.createApiError('server-error',
            'Weather service is temporarily unavailable. Please try again later.');
          break;
        case 0:
          apiError = this.createApiError('network',
            'Unable to connect to weather service. Please check your internet connection.');
          break;
        default:
          apiError = this.createApiError('server-error',
            'An unexpected error occurred. Please try again.');
      }
    } else if (error.name === 'TimeoutError') {
      apiError = this.createApiError('network',
        'Request timed out. Please check your internet connection and try again.');
    } else {
      apiError = this.createApiError('network',
        'Network error occurred. Please check your connection and try again.');
    }

    return throwError(() => apiError);
  }

  private createApiError(type: ApiError['type'], message: string, originalError?: any): ApiError {
    return { type, message, originalError };
  }
}