import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { WeatherService } from './weather.service';
import { WeatherData, WeatherApiResponse, WeatherErrorType } from '../models/weather.interface';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let localStorageSpy: jasmine.SpyObj<Storage>;

  const mockApiResponse: WeatherApiResponse = {
    name: 'London',
    sys: { country: 'GB' },
    main: { temp: 15.5, humidity: 65 },
    weather: [{
      main: 'Clouds',
      description: 'partly cloudy',
      icon: '02d'
    }],
    wind: { speed: 3.5 }
  };

  const expectedWeatherData: WeatherData = {
    cityName: 'London',
    temperature: 16,
    condition: 'Clouds',
    description: 'partly cloudy',
    humidity: 65,
    windSpeed: 3.5,
    icon: '02d',
    country: 'GB'
  };

  beforeEach(() => {
    const httpSpy = jasmine.createSpyObj('HttpClient', ['get']);

    // Mock localStorage
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem', 'removeItem']);
    spyOnProperty(window, 'localStorage', 'get').and.returnValue(localStorageSpy);

    TestBed.configureTestingModule({
      providers: [
        WeatherService,
        { provide: HttpClient, useValue: httpSpy }
      ]
    });

    service = TestBed.inject(WeatherService);
    httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
  });

  afterEach(() => {
    localStorageSpy.getItem.calls.reset();
    localStorageSpy.setItem.calls.reset();
    localStorageSpy.removeItem.calls.reset();
  });

  describe('getWeatherData', () => {
    it('should return weather data for valid city name', (done: DoneFn) => {
      // Arrange
      httpClientSpy.get.and.returnValue(of(mockApiResponse));

      // Act
      service.getWeatherData('London').subscribe({
        next: (data) => {
          // Assert
          expect(data).toEqual(expectedWeatherData);
          expect(httpClientSpy.get).toHaveBeenCalledWith(
            'https://api.openweathermap.org/data/2.5/weather',
            {
              params: {
                q: 'London',
                appid: 'demo_key',
                units: 'metric'
              }
            }
          );
          done();
        },
        error: done.fail
      });
    });

    it('should trim city name before making request', (done: DoneFn) => {
      // Arrange
      httpClientSpy.get.and.returnValue(of(mockApiResponse));

      // Act
      service.getWeatherData('  London  ').subscribe({
        next: (data) => {
          // Assert
          expect(httpClientSpy.get).toHaveBeenCalledWith(
            'https://api.openweathermap.org/data/2.5/weather',
            {
              params: {
                q: 'London',
                appid: 'demo_key',
                units: 'metric'
              }
            }
          );
          done();
        },
        error: done.fail
      });
    });

    it('should round temperature to nearest integer', (done: DoneFn) => {
      // Arrange
      const responseWithDecimal = { ...mockApiResponse, main: { temp: 15.7, humidity: 65 } };
      httpClientSpy.get.and.returnValue(of(responseWithDecimal));

      // Act
      service.getWeatherData('London').subscribe({
        next: (data) => {
          // Assert
          expect(data.temperature).toBe(16);
          done();
        },
        error: done.fail
      });
    });

    describe('input validation', () => {
      it('should reject empty city name', (done: DoneFn) => {
        // Act
        service.getWeatherData('').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            // Assert
            expect(error.type).toBe(WeatherErrorType.INVALID_CITY);
            expect(error.message).toBe('City name must be at least 2 characters long');
            expect(httpClientSpy.get).not.toHaveBeenCalled();
            done();
          }
        });
      });

      it('should reject city name with only whitespace', (done: DoneFn) => {
        // Act
        service.getWeatherData('   ').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            // Assert
            expect(error.type).toBe(WeatherErrorType.INVALID_CITY);
            expect(error.message).toBe('City name must be at least 2 characters long');
            done();
          }
        });
      });

      it('should reject city name with less than 2 characters', (done: DoneFn) => {
        // Act
        service.getWeatherData('L').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            // Assert
            expect(error.type).toBe(WeatherErrorType.INVALID_CITY);
            expect(error.message).toBe('City name must be at least 2 characters long');
            done();
          }
        });
      });

      it('should reject city name with invalid characters', (done: DoneFn) => {
        // Act
        service.getWeatherData('London123').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            // Assert
            expect(error.type).toBe(WeatherErrorType.INVALID_CITY);
            expect(error.message).toBe('City name contains invalid characters');
            done();
          }
        });
      });

      it('should accept city names with spaces, hyphens, and apostrophes', (done: DoneFn) => {
        // Arrange
        httpClientSpy.get.and.returnValue(of(mockApiResponse));

        // Act
        service.getWeatherData("New York-sur-Seine's District").subscribe({
          next: (data) => {
            // Assert
            expect(httpClientSpy.get).toHaveBeenCalledWith(
              'https://api.openweathermap.org/data/2.5/weather',
              {
                params: {
                  q: "New York-sur-Seine's District",
                  appid: 'demo_key',
                  units: 'metric'
                }
              }
            );
            done();
          },
          error: done.fail
        });
      });
    });

    describe('error handling', () => {
      it('should handle 404 city not found error', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('InvalidCity').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.INVALID_CITY);
            expect(err.message).toBe('City not found. Please check the spelling and try again.');
            done();
          }
        });
      });

      it('should handle 401 authentication error', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.API_RATE_LIMIT);
            expect(err.message).toBe('API authentication failed. Please try again later.');
            done();
          }
        });
      });

      it('should handle 429 rate limit error', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.API_RATE_LIMIT);
            expect(err.message).toBe('Too many requests. Please wait a moment and try again.');
            done();
          }
        });
      });

      it('should handle network connectivity errors', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.NETWORK_ERROR);
            expect(err.message).toBe('Unable to connect to weather service. Please check your internet connection.');
            done();
          }
        });
      });

      it('should handle 500 server errors', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.NETWORK_ERROR);
            expect(err.message).toBe('Unable to connect to weather service. Please check your internet connection.');
            done();
          }
        });
      });

      it('should handle timeout errors', (done: DoneFn) => {
        // Arrange
        const timeoutError = { name: 'TimeoutError' };
        httpClientSpy.get.and.returnValue(throwError(() => timeoutError));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.TIMEOUT_ERROR);
            expect(err.message).toBe('Request timed out. Please check your connection and try again.');
            done();
          }
        });
      });

      it('should handle unknown errors', (done: DoneFn) => {
        // Arrange
        const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.UNKNOWN_ERROR);
            expect(err.message).toBe('An unexpected error occurred. Please try again.');
            done();
          }
        });
      });

      it('should handle non-HTTP errors as network errors', (done: DoneFn) => {
        // Arrange
        const error = new Error('Network failure');
        httpClientSpy.get.and.returnValue(throwError(() => error));

        // Act
        service.getWeatherData('London').subscribe({
          next: () => done.fail('Should have failed'),
          error: (err) => {
            // Assert
            expect(err.type).toBe(WeatherErrorType.NETWORK_ERROR);
            expect(err.message).toBe('Network error. Please check your internet connection.');
            done();
          }
        });
      });
    });
  });

  describe('Recent Searches Management', () => {
    beforeEach(() => {
      localStorageSpy.getItem.and.returnValue(null);
      localStorageSpy.setItem.and.stub();
      localStorageSpy.removeItem.and.stub();
    });

    describe('addToRecentSearches', () => {
      it('should add new city to empty recent searches', (done: DoneFn) => {
        // Act
        service.addToRecentSearches('London');

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual(['London']);
          expect(localStorageSpy.setItem).toHaveBeenCalledWith(
            'weather_recent_searches',
            JSON.stringify(['London'])
          );
          done();
        });
      });

      it('should add new city to beginning of list', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue(JSON.stringify(['Paris', 'Tokyo']));
        service.loadRecentSearches();

        // Act
        service.addToRecentSearches('London');

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual(['London', 'Paris', 'Tokyo']);
          done();
        });
      });

      it('should move existing city to top', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue(JSON.stringify(['London', 'Paris', 'Tokyo']));
        service.loadRecentSearches();

        // Act
        service.addToRecentSearches('Paris');

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual(['Paris', 'London', 'Tokyo']);
          done();
        });
      });

      it('should limit recent searches to 5 items', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue(
          JSON.stringify(['City1', 'City2', 'City3', 'City4', 'City5'])
        );
        service.loadRecentSearches();

        // Act
        service.addToRecentSearches('NewCity');

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches.length).toBe(5);
          expect(searches).toEqual(['NewCity', 'City1', 'City2', 'City3', 'City4']);
          done();
        });
      });

      it('should handle localStorage errors gracefully', () => {
        // Arrange
        localStorageSpy.setItem.and.throwError('Storage quota exceeded');

        // Act & Assert - should not throw
        expect(() => service.addToRecentSearches('London')).not.toThrow();
      });
    });

    describe('loadRecentSearches', () => {
      it('should load searches from localStorage', (done: DoneFn) => {
        // Arrange
        const storedSearches = ['London', 'Paris', 'Tokyo'];
        localStorageSpy.getItem.and.returnValue(JSON.stringify(storedSearches));

        // Act
        service.loadRecentSearches();

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual(storedSearches);
          expect(localStorageSpy.getItem).toHaveBeenCalledWith('weather_recent_searches');
          done();
        });
      });

      it('should handle empty localStorage', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue(null);

        // Act
        service.loadRecentSearches();

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual([]);
          done();
        });
      });

      it('should handle invalid JSON in localStorage', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue('invalid json');

        // Act
        service.loadRecentSearches();

        // Assert - should not throw and maintain empty array
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual([]);
          done();
        });
      });

      it('should handle localStorage access errors', () => {
        // Arrange
        localStorageSpy.getItem.and.throwError('SecurityError');

        // Act & Assert - should not throw
        expect(() => service.loadRecentSearches()).not.toThrow();
      });
    });

    describe('clearRecentSearches', () => {
      it('should clear recent searches and localStorage', (done: DoneFn) => {
        // Arrange
        localStorageSpy.getItem.and.returnValue(JSON.stringify(['London', 'Paris']));
        service.loadRecentSearches();

        // Act
        service.clearRecentSearches();

        // Assert
        service.recentSearches$.subscribe(searches => {
          expect(searches).toEqual([]);
          expect(localStorageSpy.removeItem).toHaveBeenCalledWith('weather_recent_searches');
          done();
        });
      });

      it('should handle localStorage removal errors gracefully', () => {
        // Arrange
        localStorageSpy.removeItem.and.throwError('Storage error');

        // Act & Assert - should not throw
        expect(() => service.clearRecentSearches()).not.toThrow();
      });
    });
  });
});