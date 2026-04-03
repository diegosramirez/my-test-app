import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, BehaviorSubject } from 'rxjs';
import { WeatherSearchComponent } from './weather-search.component';
import { WeatherService } from '../../services/weather.service';

describe('WeatherSearchComponent', () => {
  let component: WeatherSearchComponent;
  let fixture: ComponentFixture<WeatherSearchComponent>;
  let weatherServiceSpy: jasmine.SpyObj<WeatherService>;
  let recentSearchesSubject: BehaviorSubject<string[]>;

  beforeEach(async () => {
    recentSearchesSubject = new BehaviorSubject<string[]>([]);
    weatherServiceSpy = jasmine.createSpyObj('WeatherService', [
      'loadRecentSearches',
      'addToRecentSearches',
      'clearRecentSearches'
    ], {
      recentSearches$: recentSearchesSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [WeatherSearchComponent, CommonModule, ReactiveFormsModule],
      providers: [
        { provide: WeatherService, useValue: weatherServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherSearchComponent);
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

    it('should load recent searches on init', () => {
      expect(weatherServiceSpy.loadRecentSearches).toHaveBeenCalled();
    });

    it('should initialize with empty search control', () => {
      expect(component.searchControl.value).toBe('');
    });

    it('should setup form validation rules', () => {
      const control = component.searchControl;

      // Test required validation
      control.setValue('');
      expect(control.hasError('required')).toBe(true);

      // Test minLength validation
      control.setValue('L');
      expect(control.hasError('minlength')).toBe(true);

      // Test pattern validation
      control.setValue('London123');
      expect(control.hasError('pattern')).toBe(true);

      // Test valid input
      control.setValue('London');
      expect(control.valid).toBe(true);
    });

    it('should subscribe to recent searches updates', () => {
      // Arrange
      const searches = ['London', 'Paris'];

      // Act
      recentSearchesSubject.next(searches);

      // Assert
      expect(component.recentSearches()).toEqual(searches);
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      // Spy on the validation change emission
      spyOn(component.inputValidationChange, 'emit');
    });

    it('should validate empty input after debounce', fakeAsync(() => {
      // Act
      component.searchControl.setValue('');
      tick(300); // Wait for debounce

      // Assert
      expect(component.inputValidationChange.emit).toHaveBeenCalledWith({
        isValid: false,
        errors: ['Please enter a city name']
      });
      expect(component.validationErrors()).toEqual(['Please enter a city name']);
    }));

    it('should validate input too short after debounce', fakeAsync(() => {
      // Act
      component.searchControl.setValue('L');
      tick(300);

      // Assert
      expect(component.inputValidationChange.emit).toHaveBeenCalledWith({
        isValid: false,
        errors: ['City name must be at least 2 characters']
      });
    }));

    it('should validate invalid characters after debounce', fakeAsync(() => {
      // Act
      component.searchControl.setValue('London123');
      tick(300);

      // Assert
      expect(component.inputValidationChange.emit).toHaveBeenCalledWith({
        isValid: false,
        errors: ['City name can only contain letters, spaces, hyphens, and apostrophes']
      });
    }));

    it('should accept valid city names', fakeAsync(() => {
      // Act
      component.searchControl.setValue('New York-sur-Seine');
      tick(300);

      // Assert
      expect(component.inputValidationChange.emit).toHaveBeenCalledWith({
        isValid: true,
        errors: []
      });
      expect(component.validationErrors()).toEqual([]);
    }));

    it('should debounce validation for 300ms', fakeAsync(() => {
      // Act - rapid typing simulation
      component.searchControl.setValue('L');
      tick(100);
      component.searchControl.setValue('Lo');
      tick(100);
      component.searchControl.setValue('Lon');
      tick(100);
      component.searchControl.setValue('Lond');
      tick(100);
      component.searchControl.setValue('London');
      tick(300);

      // Assert - should only validate once after debounce period
      expect(component.inputValidationChange.emit).toHaveBeenCalledTimes(1);
      expect(component.inputValidationChange.emit).toHaveBeenCalledWith({
        isValid: true,
        errors: []
      });
    }));

    it('should not validate duplicate consecutive values', fakeAsync(() => {
      // Act
      component.searchControl.setValue('London');
      tick(300);
      component.searchControl.setValue('London'); // Same value
      tick(300);

      // Assert - should only validate once due to distinctUntilChanged
      expect(component.inputValidationChange.emit).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      spyOn(component.searchSubmitted, 'emit');
    });

    it('should emit searchSubmitted with trimmed city name on valid submission', () => {
      // Arrange
      component.searchControl.setValue('  London  ');

      // Act
      component.onSubmit();

      // Assert
      expect(component.searchSubmitted.emit).toHaveBeenCalledWith('London');
      expect(weatherServiceSpy.addToRecentSearches).toHaveBeenCalledWith('London');
    });

    it('should not submit when form is invalid', () => {
      // Arrange
      component.searchControl.setValue('L'); // Too short

      // Act
      component.onSubmit();

      // Assert
      expect(component.searchSubmitted.emit).not.toHaveBeenCalled();
      expect(weatherServiceSpy.addToRecentSearches).not.toHaveBeenCalled();
    });

    it('should not submit when input is empty after trim', () => {
      // Arrange
      component.searchControl.setValue('   '); // Only whitespace

      // Act
      component.onSubmit();

      // Assert
      expect(component.searchSubmitted.emit).not.toHaveBeenCalled();
    });

    it('should validate and announce errors on invalid submission', () => {
      // Arrange
      component.searchControl.setValue('');
      const announcerElement = document.createElement('div');
      announcerElement.id = 'validation-announcer';
      document.body.appendChild(announcerElement);

      // Act
      component.onSubmit();

      // Assert
      expect(component.validationErrors()).toEqual(['Please enter a city name']);
      expect(announcerElement.textContent).toBe('Please enter a city name');

      // Cleanup
      document.body.removeChild(announcerElement);
    });

    it('should hide recent searches on successful submission', () => {
      // Arrange
      component.searchControl.setValue('London');
      component.showRecentSearches.set(true);

      // Act
      component.onSubmit();

      // Assert
      expect(component.showRecentSearches()).toBe(false);
    });
  });

  describe('Recent Searches', () => {
    beforeEach(() => {
      spyOn(component.searchSubmitted, 'emit');
    });

    it('should show recent searches on focus when input is empty', () => {
      // Arrange
      recentSearchesSubject.next(['London', 'Paris']);
      component.searchControl.setValue('');

      // Act
      component.onInputFocus();

      // Assert
      expect(component.showRecentSearches()).toBe(true);
    });

    it('should not show recent searches on focus when input has value', () => {
      // Arrange
      recentSearchesSubject.next(['London', 'Paris']);
      component.searchControl.setValue('New York');

      // Act
      component.onInputFocus();

      // Assert
      expect(component.showRecentSearches()).toBe(false);
    });

    it('should not show recent searches when list is empty', () => {
      // Arrange
      recentSearchesSubject.next([]);
      component.searchControl.setValue('');

      // Act
      component.onInputFocus();

      // Assert
      expect(component.showRecentSearches()).toBe(false);
    });

    it('should hide recent searches on blur with delay', fakeAsync(() => {
      // Arrange
      component.showRecentSearches.set(true);

      // Act
      component.onInputBlur();
      tick(100); // Before delay
      expect(component.showRecentSearches()).toBe(true);

      tick(60); // After delay (150ms total)
      expect(component.showRecentSearches()).toBe(false);
    }));

    it('should submit search when recent search item is clicked', () => {
      // Act
      component.onRecentSearchClick('London');

      // Assert
      expect(component.searchControl.value).toBe('London');
      expect(component.searchSubmitted.emit).toHaveBeenCalledWith('London');
      expect(component.showRecentSearches()).toBe(false);
    });

    it('should clear recent searches', () => {
      // Arrange
      component.showRecentSearches.set(true);

      // Act
      component.clearRecentSearches();

      // Assert
      expect(weatherServiceSpy.clearRecentSearches).toHaveBeenCalled();
      expect(component.showRecentSearches()).toBe(false);
    });
  });

  describe('Keyboard Interactions', () => {
    beforeEach(() => {
      spyOn(component.searchSubmitted, 'emit');
      component.searchControl.setValue('London');
    });

    it('should submit on Enter key press', () => {
      // Arrange
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(enterEvent, 'preventDefault');

      // Act
      component.onKeyDown(enterEvent);

      // Assert
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(component.searchSubmitted.emit).toHaveBeenCalledWith('London');
    });

    it('should hide recent searches on Escape key press', () => {
      // Arrange
      component.showRecentSearches.set(true);
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      // Act
      component.onKeyDown(escapeEvent);

      // Assert
      expect(component.showRecentSearches()).toBe(false);
    });

    it('should not handle other keys', () => {
      // Arrange
      component.showRecentSearches.set(true);
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });

      // Act
      component.onKeyDown(tabEvent);

      // Assert
      expect(component.showRecentSearches()).toBe(true); // Should remain unchanged
      expect(component.searchSubmitted.emit).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      // Arrange
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    it('should render search form with proper accessibility attributes', () => {
      const compiled = fixture.nativeElement;
      const form = compiled.querySelector('form');
      const input = compiled.querySelector('#city-search');
      const button = compiled.querySelector('button[type="submit"]');

      expect(form).toBeTruthy();
      expect(form.getAttribute('role')).toBe('search');

      expect(input).toBeTruthy();
      expect(input.getAttribute('aria-describedby')).toContain('search-help');
      expect(input.getAttribute('aria-describedby')).toContain('validation-errors');

      expect(button).toBeTruthy();
      expect(button.getAttribute('aria-label')).toBe('Search for weather data');
    });

    it('should disable submit button when form is invalid', () => {
      // Arrange
      component.searchControl.setValue('L'); // Invalid input
      fixture.detectChanges();

      // Assert
      const button = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      // Arrange
      component.searchControl.setValue('London');
      fixture.detectChanges();

      // Assert
      const button = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(false);
    });

    it('should show validation errors in template', () => {
      // Arrange
      component.validationErrors.set(['Test error message']);
      fixture.detectChanges();

      // Assert
      const errorDiv = fixture.nativeElement.querySelector('.validation-errors');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.getAttribute('role')).toBe('alert');
      expect(errorDiv.getAttribute('aria-live')).toBe('polite');
      expect(errorDiv.textContent).toContain('Test error message');
    });

    it('should show recent searches dropdown when enabled', () => {
      // Arrange
      recentSearchesSubject.next(['London', 'Paris']);
      component.showRecentSearches.set(true);
      fixture.detectChanges();

      // Assert
      const dropdown = fixture.nativeElement.querySelector('.recent-searches');
      expect(dropdown).toBeTruthy();
      expect(dropdown.getAttribute('role')).toBe('listbox');
      expect(dropdown.getAttribute('aria-label')).toBe('Recent searches');

      const items = fixture.nativeElement.querySelectorAll('.recent-search-item');
      expect(items.length).toBe(2);
      expect(items[0].textContent.trim()).toBe('London');
      expect(items[1].textContent.trim()).toBe('Paris');
    });

    it('should have proper ARIA attributes for recent search items', () => {
      // Arrange
      recentSearchesSubject.next(['London']);
      component.showRecentSearches.set(true);
      fixture.detectChanges();

      // Assert
      const item = fixture.nativeElement.querySelector('.recent-search-item');
      expect(item.getAttribute('role')).toBe('option');
      expect(item.getAttribute('aria-label')).toBe('Search for weather in London');
    });

    it('should update aria-expanded attribute based on recent searches visibility', () => {
      // Assert initial state
      let input = fixture.nativeElement.querySelector('#city-search');
      expect(input.getAttribute('aria-expanded')).toBe('false');

      // Arrange & Act
      component.showRecentSearches.set(true);
      fixture.detectChanges();

      // Assert expanded state
      input = fixture.nativeElement.querySelector('#city-search');
      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('should update aria-invalid attribute based on form validity', () => {
      // Arrange - valid input
      component.searchControl.setValue('London');
      component.searchControl.markAsTouched();
      fixture.detectChanges();

      // Assert
      let input = fixture.nativeElement.querySelector('#city-search');
      expect(input.getAttribute('aria-invalid')).toBe('false');

      // Arrange - invalid input
      component.searchControl.setValue('L');
      fixture.detectChanges();

      // Assert
      input = fixture.nativeElement.querySelector('#city-search');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have screen reader announcer element', () => {
      const announcer = fixture.nativeElement.querySelector('#validation-announcer');
      expect(announcer).toBeTruthy();
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(announcer.getAttribute('aria-atomic')).toBe('true');
      expect(announcer.classList.contains('sr-only')).toBe(true);
    });
  });
});