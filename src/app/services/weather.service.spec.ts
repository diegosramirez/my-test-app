import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { WeatherData, ApiError } from '../models/weather.model';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.weatherApi.baseUrl;
  const apiKey = environment.weatherApi.apiKey;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WeatherService]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getWeatherByCity', () => {
    const mockApiResponse = {
      name: 'London',
      main: {
        temp: 15.5,
        humidity: 75
      },
      weather: [
        {
          description: 'partly cloudy',
          main: 'Clouds'
        }
      ],
      wind: {
        speed: 3.2
      }
    };

    const expectedWeatherData: WeatherData = {
      city: 'London',
      temperature: 16,
      description: 'partly cloudy',
      humidity: 75,
      windSpeed: 3.2
    };

    it('should return weather data for valid city', (done) => {
      const cityName = 'London';

      service.getWeatherByCity(cityName).subscribe(data => {
        expect(data).toEqual(expectedWeatherData);
        done();
      });

      const req = httpMock.expectOne(req =>
        req.url === `${baseUrl}/weather` &&
        req.params.get('q') === cityName &&
        req.params.get('appid') === apiKey &&
        req.params.get('units') === 'metric'
      );

      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should round temperature to nearest integer', (done) => {
      const cityName = 'Paris';
      const responseWithDecimals = {
        ...mockApiResponse,
        name: 'Paris',
        main: {
          ...mockApiResponse.main,
          temp: 23.7
        }
      };

      service.getWeatherByCity(cityName).subscribe(data => {
        expect(data.temperature).toBe(24);
        done();
      });

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush(responseWithDecimals);
    });

    it('should handle 404 error for non-existent city', (done) => {
      const cityName = 'NonExistentCity';

      service.getWeatherByCity(cityName).subscribe({
        next: () => {
          done.fail('Expected error but got success');
        },
        error: (error: ApiError) => {
          expect(error.type).toBe('not-found');
          expect(error.message).toContain('City not found');
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 429 rate limit error', (done) => {
      const cityName = 'London';

      service.getWeatherByCity(cityName).subscribe({
        next: () => {
          done.fail('Expected error but got success');
        },
        error: (error: ApiError) => {
          expect(error.type).toBe('rate-limit');
          expect(error.message).toContain('Too many requests');
          done();
        }
      });

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush('Rate Limited', { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle 500 server error', async () => {
      const cityName = 'London';

      const weatherPromise = service.getWeatherByCity(cityName);

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      await expect(firstValueFrom(weatherPromise)).rejects.toMatchObject({
        type: 'server-error',
        message: expect.stringContaining('temporarily unavailable')
      });
    });

    it('should handle network connectivity issues', async () => {
      const cityName = 'London';

      const weatherPromise = service.getWeatherByCity(cityName);

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush('Network Error', { status: 0, statusText: 'Unknown Error' });

      await expect(firstValueFrom(weatherPromise)).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('Unable to connect')
      });
    });

    it('should handle empty city name', async () => {
      const weatherPromise = service.getWeatherByCity('');

      await expect(firstValueFrom(weatherPromise)).rejects.toMatchObject({
        type: 'validation',
        message: expect.stringContaining('City name is required')
      });

      httpMock.expectNone(`${baseUrl}/weather`);
    });

    it('should trim whitespace from city name', async () => {
      const cityName = '  London  ';

      const weatherPromise = service.getWeatherByCity(cityName);

      const req = httpMock.expectOne(req =>
        req.params.get('q') === 'London'
      );
      req.flush(mockApiResponse);

      const data = await firstValueFrom(weatherPromise);
      expect(data.city).toBe('London');
    });

    it('should handle timeout errors', async () => {
      const cityName = 'London';

      const weatherPromise = service.getWeatherByCity(cityName);

      // Simulate timeout by not responding to the request
      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      // Don't flush the response to simulate timeout
      setTimeout(() => {
        req.error(new ProgressEvent('timeout'), { status: 0, statusText: 'Timeout' });
      }, 100);

      await expect(firstValueFrom(weatherPromise)).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('Request timed out')
      });
    });

    it('should include additional weather information when available', async () => {
      const cityName = 'Tokyo';
      const fullResponse = {
        ...mockApiResponse,
        name: 'Tokyo',
        main: {
          temp: 25.3,
          humidity: 80
        },
        wind: {
          speed: 5.1
        }
      };

      const weatherPromise = service.getWeatherByCity(cityName);

      const req = httpMock.expectOne(req => req.url === `${baseUrl}/weather`);
      req.flush(fullResponse);

      const data = await firstValueFrom(weatherPromise);
      expect(data.city).toBe('Tokyo');
      expect(data.temperature).toBe(25);
      expect(data.humidity).toBe(80);
      expect(data.windSpeed).toBe(5.1);
    });
  });
});