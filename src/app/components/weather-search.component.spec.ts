import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { of, throwError } from 'rxjs';
import { WeatherSearchComponent } from './weather-search.component';
import { WeatherService } from '../services/weather.service';
import { WeatherData, ApiError } from '../models/weather.model';
import { vi, MockedFunction } from 'vitest';

describe('WeatherSearchComponent', () => {
  let component: WeatherSearchComponent;
  let fixture: ComponentFixture<WeatherSearchComponent>;
  let weatherService: { getWeatherByCity: MockedFunction<any> };

  const mockWeatherData: WeatherData = {
    city: 'London',
    temperature: 15,
    description: 'partly cloudy',
    humidity: 75,
    windSpeed: 3.2
  };

  const mockApiError: ApiError = {
    type: 'not-found',
    message: 'City not found. Please check the city name and try again.'
  };

  beforeEach(async () => {
    const weatherServiceSpy = {
      getWeatherByCity: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [WeatherSearchComponent],
      providers: [
        { provide: WeatherService, useValue: weatherServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherSearchComponent);
    component = fixture.componentInstance;
    weatherService = TestBed.inject(WeatherService) as any;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with idle state', () => {
      expect(component.searchState()).toBe('idle');
      expect(component.weatherData()).toBeNull();
      expect(component.apiError()).toBeNull();
      expect(component.validationError()).toBeNull();
      expect(component.cityName).toBe('');
    });

    it('should render initial UI correctly', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Weather Search');
      expect(compiled.querySelector('.city-input')).toBeTruthy();
      expect(compiled.querySelector('.search-button')).toBeTruthy();
      expect(compiled.querySelector('.weather-display')).toBeFalsy();
      expect(compiled.querySelector('.error-container')).toBeFalsy();
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show validation error for empty input', async () => {
      component.cityName = '';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.validationError()).toBe('Please enter a city name');
      expect(fixture.debugElement.query(By.css('#validation-error'))).toBeTruthy();
      expect(weatherService.getWeatherByCity).not.toHaveBeenCalled();
    });

    it('should show validation error for whitespace-only input', async () => {
      component.cityName = '   ';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.validationError()).toBe('Please enter a city name');
      expect(weatherService.getWeatherByCity).not.toHaveBeenCalled();
    });

    it('should show validation error for input too short', async () => {
      component.cityName = 'a';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.validationError()).toBe('City name must be at least 2 characters long');
      expect(weatherService.getWeatherByCity).not.toHaveBeenCalled();
    });

    it('should show validation error for invalid characters', async () => {
      component.cityName = 'London123';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.validationError()).toBe('City name can only contain letters, spaces, hyphens, and apostrophes');
      expect(weatherService.getWeatherByCity).not.toHaveBeenCalled();
    });

    it('should accept valid city names with spaces, hyphens, and apostrophes', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = "New York";
      component.searchWeather();
      expect(component.validationError()).toBeNull();

      component.cityName = "Saint-Denis";
      component.searchWeather();
      expect(component.validationError()).toBeNull();

      component.cityName = "O'Connor";
      component.searchWeather();
      expect(component.validationError()).toBeNull();
    });

    it('should apply error styling to input field when validation fails', async () => {
      component.cityName = '';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const inputElement = fixture.debugElement.query(By.css('.city-input'));
      expect(inputElement.nativeElement.classList).toContain('error');
    });
  });

  describe('Successful Weather Search', () => {
    beforeEach(() => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));
      fixture.detectChanges();
    });

    it('should display weather data for valid city search', async () => {
      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.searchState()).toBe('success');
      expect(component.weatherData()).toEqual(mockWeatherData);
      expect(component.apiError()).toBeNull();
      expect(weatherService.getWeatherByCity).toHaveBeenCalledWith('London');
    });

    it('should render weather display card', async () => {
      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const weatherCard = fixture.debugElement.query(By.css('.weather-card'));
      expect(weatherCard).toBeTruthy();

      const cityName = weatherCard.query(By.css('h2'));
      expect(cityName.nativeElement.textContent.trim()).toBe('London');

      const temperature = weatherCard.query(By.css('.temperature'));
      expect(temperature.nativeElement.textContent.trim()).toBe('15°C');

      const description = weatherCard.query(By.css('.description'));
      expect(description.nativeElement.textContent.trim()).toBe('Partly Cloudy');
    });

    it('should display additional weather information when available', async () => {
      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const additionalInfo = fixture.debugElement.query(By.css('.additional-info'));
      expect(additionalInfo).toBeTruthy();

      const humiditySpan = additionalInfo.nativeElement.textContent;
      expect(humiditySpan).toContain('Humidity: 75%');
      expect(humiditySpan).toContain('Wind: 3.2 m/s');
    });

    it('should clear previous errors when search succeeds', async () => {
      // First, set an error state
      component.apiError.set(mockApiError);
      component.validationError.set('Some error');

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.apiError()).toBeNull();
      expect(component.validationError()).toBeNull();
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show loading state during API call', () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData).pipe());

      component.cityName = 'London';
      component.searchWeather();

      expect(component.searchState()).toBe('loading');
      expect(component.isLoading()).toBe(true);
    });

    it('should disable search button and input during loading', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();

      const searchButton = fixture.debugElement.query(By.css('.search-button'));
      const inputElement = fixture.debugElement.query(By.css('.city-input'));

      expect(searchButton.nativeElement.disabled).toBe(true);
      expect(inputElement.nativeElement.disabled).toBe(true);
    });

    it('should show loading spinner and text in button during search', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();

      const searchButton = fixture.debugElement.query(By.css('.search-button'));
      const spinner = searchButton.query(By.css('.loading-spinner'));

      expect(spinner).toBeTruthy();
      expect(searchButton.nativeElement.textContent.trim()).toContain('Searching...');
    });

    it('should re-enable controls after search completes', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const searchButton = fixture.debugElement.query(By.css('.search-button'));
      const inputElement = fixture.debugElement.query(By.css('.city-input'));

      expect(searchButton.nativeElement.disabled).toBe(false);
      expect(inputElement.nativeElement.disabled).toBe(false);
      expect(searchButton.nativeElement.textContent.trim()).toBe('Search');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle city not found error', async () => {
      const notFoundError: ApiError = {
        type: 'not-found',
        message: 'City not found. Please check the city name and try again.'
      };
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => notFoundError));

      component.cityName = 'NonExistentCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.searchState()).toBe('error');
      expect(component.apiError()).toEqual(notFoundError);
      expect(component.weatherData()).toBeNull();
    });

    it('should display error message in UI', async () => {
      const networkError: ApiError = {
        type: 'network',
        message: 'Unable to connect to weather service. Please check your internet connection.'
      };
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => networkError));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const errorContainer = fixture.debugElement.query(By.css('.error-container'));
      expect(errorContainer).toBeTruthy();
      expect(errorContainer.nativeElement.textContent).toContain(networkError.message);
    });

    it('should show retry button for recoverable errors', async () => {
      const networkError: ApiError = {
        type: 'network',
        message: 'Network error occurred. Please check your connection and try again.'
      };
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => networkError));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
    });

    it('should show retry button for not-found errors', async () => {
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => mockApiError));

      component.cityName = 'NonExistentCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
    });

    it('should handle rate limit error appropriately', async () => {
      const rateLimitError: ApiError = {
        type: 'rate-limit',
        message: 'Too many requests. Please wait a moment and try again.'
      };
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => rateLimitError));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.apiError()).toEqual(rateLimitError);
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent).toContain('Too many requests');
    });

    it('should handle server errors', async () => {
      const serverError: ApiError = {
        type: 'server-error',
        message: 'Weather service is temporarily unavailable. Please try again later.'
      };
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => serverError));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.apiError()).toEqual(serverError);
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent).toContain('temporarily unavailable');
    });
  });

  describe('Retry Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should retry last search when retry button is clicked', async () => {
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => mockApiError));

      // Initial failed search
      component.cityName = 'FailedCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      // Setup successful retry
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.nativeElement.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(weatherService.getWeatherByCity).toHaveBeenCalledWith('FailedCity');
      expect(weatherService.getWeatherByCity).toHaveBeenCalledTimes(2);
      expect(component.cityName).toBe('FailedCity');
    });

    it('should disable retry button during loading', async () => {
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => mockApiError));

      component.cityName = 'FailedCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      // Set loading state
      component.searchState.set('loading');
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Keyboard Interaction', () => {
    beforeEach(() => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));
      fixture.detectChanges();
    });

    it('should submit form when Enter is pressed in input field', async () => {
      component.cityName = 'London';
      fixture.detectChanges();

      const inputElement = fixture.debugElement.query(By.css('.city-input'));
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });

      vi.spyOn(component, 'searchWeather');
      inputElement.nativeElement.dispatchEvent(enterEvent);

      expect(component.searchWeather).toHaveBeenCalled();
    });

    it('should not submit for other key presses', () => {
      component.cityName = 'London';
      fixture.detectChanges();

      const inputElement = fixture.debugElement.query(By.css('.city-input'));
      const tabEvent = new KeyboardEvent('keypress', { key: 'Tab' });

      vi.spyOn(component, 'searchWeather');
      inputElement.nativeElement.dispatchEvent(tabEvent);

      expect(component.searchWeather).not.toHaveBeenCalled();
    });
  });

  describe('Form Interaction', () => {
    beforeEach(() => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));
      fixture.detectChanges();
    });

    it('should submit form when search button is clicked', async () => {
      component.cityName = 'London';
      fixture.detectChanges();

      const searchButton = fixture.debugElement.query(By.css('.search-button'));
      vi.spyOn(component, 'searchWeather');

      searchButton.nativeElement.click();

      expect(component.searchWeather).toHaveBeenCalled();
    });

    it('should submit form on form submit event', async () => {
      component.cityName = 'London';
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('form'));
      vi.spyOn(component, 'searchWeather');

      form.triggerEventHandler('ngSubmit', null);

      expect(component.searchWeather).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA labels', () => {
      const inputElement = fixture.debugElement.query(By.css('.city-input'));
      const searchButton = fixture.debugElement.query(By.css('.search-button'));

      expect(inputElement.nativeElement.getAttribute('aria-describedby')).toBe('validation-error');
      expect(searchButton.nativeElement.getAttribute('aria-label')).toBe('Search for weather');
    });

    it('should have proper label association', () => {
      const label = fixture.debugElement.query(By.css('label'));
      const input = fixture.debugElement.query(By.css('.city-input'));

      expect(label.nativeElement.getAttribute('for')).toBe('city-input');
      expect(input.nativeElement.getAttribute('id')).toBe('city-input');
    });

    it('should mark error messages with role="alert"', async () => {
      component.cityName = '';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const validationError = fixture.debugElement.query(By.css('#validation-error'));
      expect(validationError.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should mark API error containers with role="alert"', async () => {
      weatherService.getWeatherByCity.mockReturnValue(throwError(() => mockApiError));

      component.cityName = 'FailedCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const errorContainer = fixture.debugElement.query(By.css('.error-container'));
      expect(errorContainer.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should have screen reader only class for label', () => {
      const label = fixture.debugElement.query(By.css('label'));
      expect(label.nativeElement.classList).toContain('sr-only');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear previous results when starting new search', async () => {
      // Set some initial state
      component.weatherData.set(mockWeatherData);
      component.apiError.set(mockApiError);
      component.validationError.set('Some error');

      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = 'NewCity';
      component.searchWeather();

      // Errors should be cleared immediately when search starts
      expect(component.validationError()).toBeNull();
      expect(component.apiError()).toBeNull();
    });

    it('should maintain last searched city for retry functionality', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(mockWeatherData));

      component.cityName = 'TestCity';
      component.searchWeather();

      // Change the input value
      component.cityName = 'DifferentCity';

      // Retry should use the last searched city, not current input
      component.retryLastSearch();

      expect(component.cityName).toBe('TestCity');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle undefined weather data gracefully', async () => {
      weatherService.getWeatherByCity.mockReturnValue(of(null as any));

      component.cityName = 'London';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      // Should not crash the component
      expect(component).toBeTruthy();
    });

    it('should handle weather data without optional fields', async () => {
      const minimalWeatherData: WeatherData = {
        city: 'MinimalCity',
        temperature: 20,
        description: 'sunny'
        // humidity and windSpeed are optional
      };

      weatherService.getWeatherByCity.mockReturnValue(of(minimalWeatherData));

      component.cityName = 'MinimalCity';
      component.searchWeather();
      fixture.detectChanges();
      await fixture.whenStable();

      const weatherCard = fixture.debugElement.query(By.css('.weather-card'));
      expect(weatherCard).toBeTruthy();

      const additionalInfo = fixture.debugElement.query(By.css('.additional-info'));
      expect(additionalInfo).toBeFalsy(); // Should not render when no humidity
    });

    it('should handle retry when no last searched city exists', () => {
      expect(() => component.retryLastSearch()).not.toThrow();
      expect(weatherService.getWeatherByCity).not.toHaveBeenCalled();
    });
  });
});