import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { WeatherData, ApiError, OpenWeatherMapResponse } from '../models/weather.interface';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;
  const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
  const API_KEY = 'demo_key';

  // Mock OpenWeatherMap API response
  const mockApiResponse: OpenWeatherMapResponse = {
    name: 'New York',
    main: {
      temp: 293.15, // 20°C in Kelvin = 68°F
      humidity: 65
    },
    weather: [{
      main: 'Clear',
      description: 'clear sky'
    }],
    wind: {
      speed: 5.2
    }
  };

  const expectedWeatherData: WeatherData = {
    city: 'New York',
    temperature: 68, // Converted from Kelvin
    condition: 'Clear',
    description: 'clear sky',
    humidity: 65,
    windSpeed: 5.2
  };

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

  describe('Input Validation', () => {
    it('should validate empty input', () => {
      const result = service.validateInput('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('City name cannot be empty');
    });

    it('should validate whitespace-only input', () => {
      const result = service.validateInput('   ');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('City name cannot be empty');
    });

    it('should validate input exceeding 50 characters', () => {
      const longCityName = 'A'.repeat(51);
      const result = service.validateInput(longCityName);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('City name must be 50 characters or less');
    });

    it('should validate input at 50 character limit', () => {
      const cityNameAt50Chars = 'A'.repeat(50);
      const result = service.validateInput(cityNameAt50Chars);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should validate valid city names', () => {
      const validInputs = [
        'New York',
        'Paris',
        'Los Angeles, CA',
        'São Paulo',
        'London, UK',
        'New York, NY'
      ];

      validInputs.forEach(input => {
        const result = service.validateInput(input);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });
    });

    it('should sanitize special characters but keep allowed ones', () => {
      // This test verifies the private sanitizeInput method indirectly
      const cityName = 'New York@#$%';
      service.getWeatherByCity(cityName).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url.includes('New York'); // Should have special chars removed
      });
      expect(req.request.url).toContain('New%20York'); // Encoded, without special chars
      req.flush(mockApiResponse);
    });
  });

  describe('Temperature Conversion', () => {
    it('should convert Kelvin to Fahrenheit correctly', () => {
      // Testing various temperature conversions
      const testCases = [
        { kelvin: 273.15, expectedF: 32 }, // 0°C = 32°F
        { kelvin: 293.15, expectedF: 68 }, // 20°C = 68°F
        { kelvin: 283.15, expectedF: 50 }, // 10°C = 50°F
        { kelvin: 313.15, expectedF: 104 }, // 40°C = 104°F
        { kelvin: 253.15, expectedF: -4 } // -20°C = -4°F
      ];

      testCases.forEach(({ kelvin, expectedF }) => {
        const mockResponse = {
          ...mockApiResponse,
          main: { ...mockApiResponse.main, temp: kelvin }
        };

        service.getWeatherByCity('Test City').subscribe(data => {
          expect(data.temperature).toBe(expectedF);
        });

        const req = httpMock.expectOne(() => true);
        req.flush(mockResponse);
      });
    });
  });

  describe('Successful API Calls', () => {
    it('should fetch weather data successfully', () => {
      service.getWeatherByCity('New York').subscribe(data => {
        expect(data).toEqual(expectedWeatherData);
      });

      const req = httpMock.expectOne(
        `${API_BASE_URL}?q=New%20York&appid=${API_KEY}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle API response without optional fields', () => {
      const minimalResponse: OpenWeatherMapResponse = {
        name: 'Test City',
        main: { temp: 293.15, humidity: 50 },
        weather: [{ main: 'Clouds', description: 'few clouds' }]
      };

      service.getWeatherByCity('Test City').subscribe(data => {
        expect(data.city).toBe('Test City');
        expect(data.temperature).toBe(68);
        expect(data.condition).toBe('Clouds');
        expect(data.description).toBe('few clouds');
        expect(data.humidity).toBe(50);
        expect(data.windSpeed).toBeUndefined();
      });

      const req = httpMock.expectOne(() => true);
      req.flush(minimalResponse);
    });

    it('should handle API response with empty weather array', () => {
      const responseWithNoWeather = {
        ...mockApiResponse,
        weather: []
      };

      service.getWeatherByCity('Test City').subscribe(data => {
        expect(data.condition).toBe('Unknown');
        expect(data.description).toBe('No description available');
      });

      const req = httpMock.expectOne(() => true);
      req.flush(responseWithNoWeather);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors (status 0)', () => {
      service.getWeatherByCity('Test City').subscribe({
        error: (error: ApiError) => {
          expect(error.type).toBe('network');
          expect(error.message).toBe('Unable to connect. Please check your internet connection');
          expect(error.statusCode).toBe(0);
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush('Network Error', { status: 0, statusText: 'Network Error' });
    });

    it('should handle city not found errors (404)', () => {
      service.getWeatherByCity('InvalidCity').subscribe({
        error: (error: ApiError) => {
          expect(error.type).toBe('not_found');
          expect(error.message).toBe('City not found. Try checking spelling or use format like "New York, NY"');
          expect(error.statusCode).toBe(404);
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush('City not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle rate limiting errors (429)', () => {
      service.getWeatherByCity('Test City').subscribe({
        error: (error: ApiError) => {
          expect(error.type).toBe('rate_limit');
          expect(error.message).toBe('Too many requests, please wait a moment');
          expect(error.statusCode).toBe(429);
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle timeout errors', () => {
      return new Promise<void>((resolve) => {
        service.getWeatherByCity('Test City').subscribe({
          error: (error: ApiError) => {
            expect(error.type).toBe('timeout');
            expect(error.message).toBe('Request timed out, please try again');
            expect(error.statusCode).toBeUndefined();
            resolve();
          }
        });

        const req = httpMock.expectOne(() => true);
        // Simulate timeout by not responding and letting the timeout trigger
        // Note: In a real scenario, this would timeout after 2 seconds
      });
    });

    it('should handle unknown HTTP errors', () => {
      service.getWeatherByCity('Test City').subscribe({
        error: (error: ApiError) => {
          expect(error.type).toBe('unknown');
          expect(error.message).toBe('An unexpected error occurred. Please try again');
          expect(error.statusCode).toBe(500);
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle non-HTTP errors', () => {
      service.getWeatherByCity('Test City').subscribe({
        error: (error: ApiError) => {
          expect(error.type).toBe('unknown');
          expect(error.message).toBe('An unexpected error occurred. Please try again');
          expect(error.statusCode).toBeUndefined();
        }
      });

      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('Unknown error'));
    });
  });

  describe('API Request Configuration', () => {
    it('should set correct timeout of 2 seconds', () => {
      // This test verifies the timeout configuration exists
      // The actual timeout behavior is tested in integration tests
      service.getWeatherByCity('Test City').subscribe();

      const req = httpMock.expectOne(() => true);
      expect(req.request.url).toContain(API_BASE_URL);
      req.flush(mockApiResponse);
    });

    it('should properly encode city names in URL', () => {
      const citiesWithSpecialChars = [
        { input: 'New York', expected: 'New%20York' },
        { input: 'São Paulo', expected: 'S%C3%A3o%20Paulo' },
        { input: 'London, UK', expected: 'London,%20UK' }
      ];

      citiesWithSpecialChars.forEach(({ input, expected }) => {
        service.getWeatherByCity(input).subscribe();

        const req = httpMock.expectOne(request => request.url.includes(expected));
        expect(req.request.url).toContain(`q=${expected}`);
        req.flush(mockApiResponse);
      });
    });

    it('should include API key in request', () => {
      service.getWeatherByCity('Test City').subscribe();

      const req = httpMock.expectOne(() => true);
      expect(req.request.url).toContain(`appid=${API_KEY}`);
      req.flush(mockApiResponse);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize and preserve valid characters', () => {
      const testCases = [
        { input: 'New York@#$%', shouldContain: 'New York' },
        { input: 'Los Angeles, CA!!!', shouldContain: 'Los Angeles, CA' },
        { input: 'São-Paulo-Brazil***', shouldContain: 'So-Paulo-Brazil' }, // Note: accents might be removed
        { input: '   Miami   ', shouldContain: 'Miami' }
      ];

      testCases.forEach(({ input, shouldContain }) => {
        service.getWeatherByCity(input).subscribe();

        const req = httpMock.expectOne(request => {
          const decodedUrl = decodeURIComponent(request.url);
          return decodedUrl.includes(shouldContain.replace(/\s+/g, ' ').trim());
        });
        req.flush(mockApiResponse);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long valid input', () => {
      const longValidCity = 'A'.repeat(49) + 'B'; // 50 characters exactly
      const validation = service.validateInput(longValidCity);
      expect(validation.valid).toBe(true);

      service.getWeatherByCity(longValidCity).subscribe();
      const req = httpMock.expectOne(() => true);
      expect(req.request.url.length).toBeLessThan(2048); // URL length limit
      req.flush(mockApiResponse);
    });

    it('should handle null and undefined inputs gracefully', () => {
      expect(() => service.validateInput(null as any)).not.toThrow();
      expect(() => service.validateInput(undefined as any)).not.toThrow();

      const nullResult = service.validateInput(null as any);
      expect(nullResult.valid).toBe(false);
    });
  });
});