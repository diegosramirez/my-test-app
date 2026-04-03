import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { WeatherDisplayComponent } from './weather-display.component';
import { WeatherData, WeatherSearchState } from '../../models/weather.interface';

describe('WeatherDisplayComponent', () => {
  let component: WeatherDisplayComponent;
  let fixture: ComponentFixture<WeatherDisplayComponent>;

  const mockWeatherData: WeatherData = {
    cityName: 'London',
    temperature: 15,
    condition: 'Clouds',
    description: 'partly cloudy',
    humidity: 65,
    windSpeed: 3.5,
    icon: '02d',
    country: 'GB'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherDisplayComponent, CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default search state', () => {
      expect(component.searchState()()).toEqual({
        isLoading: false,
        weatherData: null,
        error: null,
        hasSearched: false
      });
    });

    it('should initialize computed properties correctly', () => {
      expect(component.isLoading()).toBe(false);
      expect(component.weatherData()).toBeNull();
      expect(component.error()).toBeNull();
      expect(component.hasSearched()).toBe(false);
      expect(component.hasData()).toBe(false);
      expect(component.hasError()).toBe(false);
    });
  });

  describe('Search State Management', () => {
    it('should update computed properties when search state changes to loading', () => {
      // Act
      const loadingState: WeatherSearchState = {
        isLoading: true,
        weatherData: null,
        error: null,
        hasSearched: true
      };
      component.searchState.set(signal(loadingState));

      // Assert
      expect(component.isLoading()).toBe(true);
      expect(component.hasSearched()).toBe(true);
      expect(component.hasData()).toBe(false);
      expect(component.hasError()).toBe(false);
    });

    it('should update computed properties when search state has weather data', () => {
      // Act
      const successState: WeatherSearchState = {
        isLoading: false,
        weatherData: mockWeatherData,
        error: null,
        hasSearched: true
      };
      component.searchState.set(signal(successState));

      // Assert
      expect(component.isLoading()).toBe(false);
      expect(component.weatherData()).toEqual(mockWeatherData);
      expect(component.hasSearched()).toBe(true);
      expect(component.hasData()).toBe(true);
      expect(component.hasError()).toBe(false);
    });

    it('should update computed properties when search state has error', () => {
      // Act
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'City not found. Please check the spelling and try again.',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));

      // Assert
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBe('City not found. Please check the spelling and try again.');
      expect(component.hasSearched()).toBe(true);
      expect(component.hasData()).toBe(false);
      expect(component.hasError()).toBe(true);
    });
  });

  describe('Error Type Detection', () => {
    it('should detect network errors', () => {
      // Act
      const networkErrorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Unable to connect to weather service. Please check your internet connection.',
        hasSearched: true
      };
      component.searchState.set(signal(networkErrorState));

      // Assert
      expect(component.isNetworkError()).toBe(true);
      expect(component.isInvalidCityError()).toBe(false);
      expect(component.isRateLimitError()).toBe(false);
    });

    it('should detect invalid city errors', () => {
      // Act
      const invalidCityErrorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'City not found. Please check the spelling and try again.',
        hasSearched: true
      };
      component.searchState.set(signal(invalidCityErrorState));

      // Assert
      expect(component.isNetworkError()).toBe(false);
      expect(component.isInvalidCityError()).toBe(true);
      expect(component.isRateLimitError()).toBe(false);
    });

    it('should detect rate limit errors', () => {
      // Act
      const rateLimitErrorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Too many requests. Please wait a moment and try again.',
        hasSearched: true
      };
      component.searchState.set(signal(rateLimitErrorState));

      // Assert
      expect(component.isNetworkError()).toBe(false);
      expect(component.isInvalidCityError()).toBe(false);
      expect(component.isRateLimitError()).toBe(true);
    });

    it('should handle errors with connection keyword', () => {
      // Act
      const connectionErrorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Connection timeout occurred.',
        hasSearched: true
      };
      component.searchState.set(signal(connectionErrorState));

      // Assert
      expect(component.isNetworkError()).toBe(true);
    });

    it('should handle errors with rate keyword', () => {
      // Act
      const rateErrorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'API rate limit exceeded.',
        hasSearched: true
      };
      component.searchState.set(signal(rateErrorState));

      // Assert
      expect(component.isRateLimitError()).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should emit retrySearch on retry button click', () => {
      // Arrange
      spyOn(component.retrySearch, 'emit');

      // Act
      component.onRetryClick();

      // Assert
      expect(component.retrySearch.emit).toHaveBeenCalled();
    });

    it('should emit clearResults on clear button click', () => {
      // Arrange
      spyOn(component.clearResults, 'emit');

      // Act
      component.onClearClick();

      // Assert
      expect(component.clearResults.emit).toHaveBeenCalled();
    });
  });

  describe('Data Formatting and Display Helpers', () => {
    describe('getTemperatureColor', () => {
      it('should return blue for freezing temperatures', () => {
        expect(component.getTemperatureColor(-5)).toBe('#3b82f6');
        expect(component.getTemperatureColor(0)).toBe('#3b82f6');
      });

      it('should return cyan for cold temperatures', () => {
        expect(component.getTemperatureColor(5)).toBe('#06b6d4');
        expect(component.getTemperatureColor(10)).toBe('#06b6d4');
      });

      it('should return green for mild temperatures', () => {
        expect(component.getTemperatureColor(15)).toBe('#10b981');
        expect(component.getTemperatureColor(20)).toBe('#10b981');
      });

      it('should return yellow for warm temperatures', () => {
        expect(component.getTemperatureColor(25)).toBe('#f59e0b');
        expect(component.getTemperatureColor(30)).toBe('#f59e0b');
      });

      it('should return red for hot temperatures', () => {
        expect(component.getTemperatureColor(35)).toBe('#ef4444');
        expect(component.getTemperatureColor(45)).toBe('#ef4444');
      });
    });

    describe('getWindDescription', () => {
      it('should describe wind speeds correctly', () => {
        expect(component.getWindDescription(0)).toBe('Calm');
        expect(component.getWindDescription(3)).toBe('Light breeze');
        expect(component.getWindDescription(7)).toBe('Gentle breeze');
        expect(component.getWindDescription(12)).toBe('Moderate breeze');
        expect(component.getWindDescription(18)).toBe('Fresh breeze');
        expect(component.getWindDescription(25)).toBe('Strong breeze');
      });
    });

    describe('getHumidityDescription', () => {
      it('should describe humidity levels correctly', () => {
        expect(component.getHumidityDescription(20)).toBe('Low');
        expect(component.getHumidityDescription(45)).toBe('Comfortable');
        expect(component.getHumidityDescription(70)).toBe('High');
        expect(component.getHumidityDescription(90)).toBe('Very high');
      });
    });

    describe('formatTemperature', () => {
      it('should format temperature with Celsius unit', () => {
        expect(component.formatTemperature(15)).toBe('15°C');
        expect(component.formatTemperature(-5)).toBe('-5°C');
        expect(component.formatTemperature(0)).toBe('0°C');
      });
    });

    describe('capitalizeFirst', () => {
      it('should capitalize first letter of string', () => {
        expect(component.capitalizeFirst('partly cloudy')).toBe('Partly cloudy');
        expect(component.capitalizeFirst('clear')).toBe('Clear');
        expect(component.capitalizeFirst('RAIN')).toBe('RAIN');
      });

      it('should handle empty string', () => {
        expect(component.capitalizeFirst('')).toBe('');
      });

      it('should handle single character', () => {
        expect(component.capitalizeFirst('a')).toBe('A');
      });
    });
  });

  describe('Error Display Helpers', () => {
    beforeEach(() => {
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: '',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
    });

    describe('getErrorIcon', () => {
      it('should return network icon for network errors', () => {
        const networkState = {
          ...component.searchState()(),
          error: 'Unable to connect to weather service. Please check your internet connection.'
        };
        component.searchState.set(signal(networkState));
        expect(component.getErrorIcon()).toBe('📡');
      });

      it('should return city icon for invalid city errors', () => {
        const cityState = {
          ...component.searchState()(),
          error: 'City not found. Please check the spelling and try again.'
        };
        component.searchState.set(signal(cityState));
        expect(component.getErrorIcon()).toBe('🏙️');
      });

      it('should return clock icon for rate limit errors', () => {
        const rateState = {
          ...component.searchState()(),
          error: 'Too many requests. Please wait a moment and try again.'
        };
        component.searchState.set(signal(rateState));
        expect(component.getErrorIcon()).toBe('⏱️');
      });

      it('should return generic error icon for unknown errors', () => {
        const unknownState = {
          ...component.searchState()(),
          error: 'Some unknown error occurred'
        };
        component.searchState.set(signal(unknownState));
        expect(component.getErrorIcon()).toBe('❌');
      });
    });

    describe('getRetryButtonText', () => {
      it('should return appropriate text for network errors', () => {
        const networkState = {
          ...component.searchState()(),
          error: 'Unable to connect to weather service. Please check your internet connection.'
        };
        component.searchState.set(signal(networkState));
        expect(component.getRetryButtonText()).toBe('Check Connection & Retry');
      });

      it('should return appropriate text for invalid city errors', () => {
        const cityState = {
          ...component.searchState()(),
          error: 'City not found. Please check the spelling and try again.'
        };
        component.searchState.set(signal(cityState));
        expect(component.getRetryButtonText()).toBe('Try Different City');
      });

      it('should return appropriate text for rate limit errors', () => {
        const rateState = {
          ...component.searchState()(),
          error: 'Too many requests. Please wait a moment and try again.'
        };
        component.searchState.set(signal(rateState));
        expect(component.getRetryButtonText()).toBe('Try Again Later');
      });

      it('should return generic text for unknown errors', () => {
        const unknownState = {
          ...component.searchState()(),
          error: 'Some unknown error occurred'
        };
        component.searchState.set(signal(unknownState));
        expect(component.getRetryButtonText()).toBe('Retry Search');
      });
    });

    describe('getSuggestionText', () => {
      it('should return spelling suggestion for invalid city errors', () => {
        const cityState = {
          ...component.searchState()(),
          error: 'City not found. Please check the spelling and try again.'
        };
        component.searchState.set(signal(cityState));
        expect(component.getSuggestionText())
          .toBe('Try checking the spelling or using a different city name format');
      });

      it('should return connection suggestion for network errors', () => {
        const networkState = {
          ...component.searchState()(),
          error: 'Unable to connect to weather service. Please check your internet connection.'
        };
        component.searchState.set(signal(networkState));
        expect(component.getSuggestionText())
          .toBe('Please check your internet connection and try again');
      });

      it('should return wait suggestion for rate limit errors', () => {
        const rateState = {
          ...component.searchState()(),
          error: 'Too many requests. Please wait a moment and try again.'
        };
        component.searchState.set(signal(rateState));
        expect(component.getSuggestionText())
          .toBe('Please wait a moment before searching again');
      });

      it('should return generic suggestion for unknown errors', () => {
        const unknownState = {
          ...component.searchState()(),
          error: 'Some unknown error occurred'
        };
        component.searchState.set(signal(unknownState));
        expect(component.getSuggestionText()).toBe('Please try your search again');
      });
    });
  });

  describe('Template Integration', () => {
    it('should not display anything when no search has been performed', () => {
      // Assert
      const compiled = fixture.nativeElement;
      expect(compiled.textContent.trim()).toBe('');
    });

    it('should display loading state with proper accessibility', () => {
      // Arrange
      const loadingState: WeatherSearchState = {
        isLoading: true,
        weatherData: null,
        error: null,
        hasSearched: true
      };
      component.searchState.set(signal(loadingState));
      fixture.detectChanges();

      // Assert
      const compiled = fixture.nativeElement;
      const loadingElement = compiled.querySelector('[role="status"]');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.getAttribute('aria-live')).toBe('polite');
      expect(compiled.textContent).toContain('Loading weather data');
    });

    it('should display weather data when available', () => {
      // Arrange
      const successState: WeatherSearchState = {
        isLoading: false,
        weatherData: mockWeatherData,
        error: null,
        hasSearched: true
      };
      component.searchState.set(signal(successState));
      fixture.detectChanges();

      // Assert
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('London, GB');
      expect(compiled.textContent).toContain('15°C');
      expect(compiled.textContent).toContain('Partly cloudy');
    });

    it('should display error state with proper accessibility', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'City not found. Please check the spelling and try again.',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      // Assert
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(compiled.textContent).toContain('City not found');
    });

    it('should have retry button with proper accessibility in error state', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'City not found. Please check the spelling and try again.',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      // Assert
      const compiled = fixture.nativeElement;
      const retryButton = compiled.querySelector('button');
      expect(retryButton).toBeTruthy();
      expect(retryButton.getAttribute('aria-label')).toContain('retry');
      expect(retryButton.textContent).toContain('Try Different City');
    });

    it('should trigger retry event when retry button is clicked', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Network error occurred',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      spyOn(component.retrySearch, 'emit');

      // Act
      const retryButton = fixture.nativeElement.querySelector('button');
      retryButton.click();

      // Assert
      expect(component.retrySearch.emit).toHaveBeenCalled();
    });

    it('should meet minimum touch target size requirements (44px)', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Network error occurred',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      // Assert
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        const computedStyle = getComputedStyle(button);
        const height = parseInt(computedStyle.height, 10);
        const width = parseInt(computedStyle.width, 10);

        // Touch targets should be at least 44px in one dimension
        expect(Math.max(height, width)).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should announce loading state to screen readers', () => {
      // Arrange
      const loadingState: WeatherSearchState = {
        isLoading: true,
        weatherData: null,
        error: null,
        hasSearched: true
      };
      component.searchState.set(signal(loadingState));
      fixture.detectChanges();

      // Assert
      const statusElement = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusElement).toBeTruthy();
      expect(statusElement.getAttribute('aria-live')).toBe('polite');
      expect(statusElement.getAttribute('aria-atomic')).toBe('true');
    });

    it('should announce errors to screen readers', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Test error message',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      // Assert
      const alertElement = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertElement).toBeTruthy();
      expect(alertElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should provide contextual aria-labels for interactive elements', () => {
      // Arrange
      const errorState: WeatherSearchState = {
        isLoading: false,
        weatherData: null,
        error: 'Network error',
        hasSearched: true
      };
      component.searchState.set(signal(errorState));
      fixture.detectChanges();

      // Assert
      const buttons = fixture.nativeElement.querySelectorAll('button[aria-label]');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button: HTMLElement) => {
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
      });
    });
  });
});