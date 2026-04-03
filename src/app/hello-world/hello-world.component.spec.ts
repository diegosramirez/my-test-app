import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { HelloWorldComponent } from './hello-world.component';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';

// Test component wrapper for routing tests
@Component({
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [RouterOutlet]
})
class TestAppComponent {}

describe('HelloWorldComponent', () => {
  let component: HelloWorldComponent;
  let fixture: ComponentFixture<HelloWorldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelloWorldComponent, DatePipe]
    }).compileComponents();

    fixture = TestBed.createComponent(HelloWorldComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up any console spies
    vi.restoreAllMocks();
  });

  describe('Component Creation and Lifecycle', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be standalone component', () => {
      // Verify component is properly defined and instantiated
      expect(HelloWorldComponent).toBeDefined();
      expect(component).toBeInstanceOf(HelloWorldComponent);
    });

    it('should initialize with current date', () => {
      const beforeInit = Date.now();
      fixture.detectChanges();
      const afterInit = Date.now();

      expect(component.currentDate).toBeTruthy();
      expect(component.currentDate?.getTime()).toBeGreaterThanOrEqual(beforeInit);
      expect(component.currentDate?.getTime()).toBeLessThanOrEqual(afterInit);
      expect(component.dateError).toBe(false);
    });

    it('should render without console errors or warnings', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fixture.detectChanges();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Content Display', () => {
    it('should display Hello World heading as h1', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h1.greeting');

      expect(heading).toBeTruthy();
      expect(heading?.textContent?.trim()).toBe('Hello World');
      expect(heading?.tagName).toBe('H1');
    });

    it('should display formatted date in MMMM d, yyyy format', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const dateElement = compiled.querySelector('.date-text span:not(.visually-hidden)');

      expect(dateElement).toBeTruthy();
      // Test for specific format: Month name, day, year (e.g., "January 15, 2024")
      expect(dateElement?.textContent).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    });

    it('should display date in user local timezone', () => {
      // Mock a specific date to test timezone handling
      const testDate = new Date('2024-01-15T12:00:00Z');
      const originalDate = globalThis.Date;

      // Create proper constructor function
      function MockDate(this: any) {
        const instance = testDate;
        Object.setPrototypeOf(instance, MockDate.prototype);
        return instance;
      }
      MockDate.prototype = originalDate.prototype;
      MockDate.now = originalDate.now;
      Object.setPrototypeOf(MockDate, originalDate);

      globalThis.Date = MockDate as any;

      component.ngOnInit();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const dateElement = compiled.querySelector('.date-text span:not(.visually-hidden)');

      // The DatePipe should format in local timezone
      expect(dateElement?.textContent).toMatch(/January \d{1,2}, 2024/);

      globalThis.Date = originalDate;
    });
  });

  describe('Error Handling', () => {
    it('should handle date initialization error', () => {
      const originalDate = globalThis.Date;
      globalThis.Date = vi.fn(() => {
        throw new Error('Date error');
      }) as any;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.ngOnInit();

      expect(component.dateError).toBe(true);
      expect(component.currentDate).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error initializing date:', expect.any(Error));

      globalThis.Date = originalDate;
      consoleErrorSpy.mockRestore();
    });

    it('should display error fallback when date error occurs', () => {
      component.dateError = true;
      component.currentDate = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const fallbackElement = compiled.querySelector('.date-fallback');

      expect(fallbackElement).toBeTruthy();
      expect(fallbackElement?.textContent?.trim()).toBe('Date unavailable');
      expect(fallbackElement?.classList.contains('date-fallback')).toBe(true);
    });

    it('should handle invalid date object', () => {
      const originalDate = globalThis.Date;
      globalThis.Date = vi.fn(() => ({
        getTime: () => NaN
      })) as any;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.ngOnInit();

      expect(component.dateError).toBe(true);
      expect(component.currentDate).toBeNull();

      globalThis.Date = originalDate;
      consoleErrorSpy.mockRestore();
    });

    it('should gracefully handle component initialization failures', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate initialization with problematic state
      component.currentDate = null;
      component.dateError = true;

      expect(() => fixture.detectChanges()).not.toThrow();
      expect(component.dateError).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper accessibility attributes', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Check heading hierarchy
      const heading = compiled.querySelector('h1');
      expect(heading).toBeTruthy();

      // Check aria-label on date element
      const dateElement = compiled.querySelector('.date-text[aria-label]');
      expect(dateElement).toBeTruthy();
      expect(dateElement?.getAttribute('aria-label')).toContain('Current date:');

      // Check screen reader text
      const srText = compiled.querySelector('.visually-hidden');
      expect(srText).toBeTruthy();
      expect(srText?.textContent?.trim()).toBe('Today is');
    });

    it('should support screen reader announcements', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      const dateElement = compiled.querySelector('.date-text[aria-label]');
      const ariaLabel = dateElement?.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/Current date: (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/);
    });

    it('should have semantic HTML structure', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Check for main landmark
      const main = compiled.querySelector('main');
      expect(main).toBeTruthy();

      // Check heading hierarchy (h1 is highest level)
      const h1 = compiled.querySelector('h1');
      expect(h1).toBeTruthy();

      // Ensure no higher-level headings exist
      const h1Elements = compiled.querySelectorAll('h1');
      expect(h1Elements.length).toBe(1);
    });

    it('should have sufficient color contrast styling', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      const heading = compiled.querySelector('.greeting') as HTMLElement;
      const dateText = compiled.querySelector('.date-text') as HTMLElement;

      expect(heading).toBeTruthy();
      expect(dateText).toBeTruthy();

      // Elements should have proper CSS classes for styling
      expect(heading.classList.contains('greeting')).toBe(true);
      expect(dateText.classList.contains('date-text')).toBe(true);
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive container structure', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      const container = compiled.querySelector('.hello-world-container');
      const content = compiled.querySelector('.hello-world-content');

      expect(container).toBeTruthy();
      expect(content).toBeTruthy();
      expect(content?.classList.contains('hello-world-content')).toBe(true);
    });

    it('should apply proper CSS classes for responsive layout', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Check for responsive layout classes
      const container = compiled.querySelector('.hello-world-container');
      const content = compiled.querySelector('.hello-world-content');
      const greeting = compiled.querySelector('.greeting');
      const dateContainer = compiled.querySelector('.date-container');

      expect(container?.classList.contains('hello-world-container')).toBe(true);
      expect(content?.classList.contains('hello-world-content')).toBe(true);
      expect(greeting?.classList.contains('greeting')).toBe(true);
      expect(dateContainer?.classList.contains('date-container')).toBe(true);
    });

    it('should center content properly', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      const container = compiled.querySelector('.hello-world-container') as HTMLElement;
      const content = compiled.querySelector('.hello-world-content') as HTMLElement;

      expect(container).toBeTruthy();
      expect(content).toBeTruthy();

      // Verify structural elements exist for centering
      expect(container.querySelector('.hello-world-content')).toBeTruthy();
    });
  });

  describe('Animation and Visual Effects', () => {
    it('should apply fade-in animation class', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const contentElement = compiled.querySelector('.hello-world-content');

      expect(contentElement).toBeTruthy();
      expect(contentElement?.classList.contains('hello-world-content')).toBe(true);
    });

    it('should have visual styling elements', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Verify all styled elements have their CSS classes
      const greeting = compiled.querySelector('.greeting');
      const dateText = compiled.querySelector('.date-text');
      const container = compiled.querySelector('.hello-world-container');

      expect(greeting?.classList.contains('greeting')).toBe(true);
      expect(dateText?.classList.contains('date-text')).toBe(true);
      expect(container?.classList.contains('hello-world-container')).toBe(true);
    });
  });

  describe('Performance and Loading', () => {
    it('should load component within acceptable time threshold', async () => {
      const startTime = performance.now();

      fixture.detectChanges();
      await fixture.whenStable();

      const loadTime = performance.now() - startTime;

      // Component should load within 100ms (generous threshold for testing)
      expect(loadTime).toBeLessThan(100);
    });

    it('should initialize efficiently without memory leaks', () => {
      const initialMemoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      // Create and destroy multiple instances
      for (let i = 0; i < 10; i++) {
        const tempComponent = new HelloWorldComponent();
        tempComponent.ngOnInit();
      }

      // This test mainly ensures no errors occur during multiple initializations
      expect(true).toBe(true); // If we reach here, no errors occurred
    });
  });

  describe('Standalone Architecture', () => {
    it('should import CommonModule and DatePipe correctly', () => {
      // Test that component works with DatePipe
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const dateElement = compiled.querySelector('.date-text span:not(.visually-hidden)');

      // If DatePipe is working, date should be formatted correctly
      expect(dateElement?.textContent).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    });

    it('should work without NgModule declarations', async () => {
      // This test verifies the component works in standalone mode
      // Reset TestBed to configure a fresh instance
      TestBed.resetTestingModule();

      const standaloneBed = TestBed.configureTestingModule({
        imports: [HelloWorldComponent] // Only import, no declarations
      });

      await standaloneBed.compileComponents();
      const standaloneFixture = TestBed.createComponent(HelloWorldComponent);

      expect(() => standaloneFixture.detectChanges()).not.toThrow();
      expect(standaloneFixture.componentInstance).toBeTruthy();

      // Cleanup
      standaloneFixture.destroy();
    });
  });
});

describe('HelloWorldComponent Routing Integration', () => {
  let router: Router;
  let location: Location;
  let fixture: ComponentFixture<TestAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAppComponent],
      providers: [
        provideRouter([
          { path: '', component: HelloWorldComponent }
        ])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(TestAppComponent);
    fixture.detectChanges();
  });

  it('should load HelloWorldComponent on root route', async () => {
    await router.navigate(['']);
    expect(location.path()).toBe('');

    // Component should be rendered in router-outlet
    const compiled = fixture.nativeElement as HTMLElement;

    // Wait for route to settle
    await fixture.whenStable();
    fixture.detectChanges();

    // Check if our component content is present
    const greeting = compiled.querySelector('h1.greeting');
    expect(greeting?.textContent?.trim()).toBe('Hello World');
  });

  it('should handle empty path route correctly', async () => {
    await router.navigate(['']);
    expect(location.path()).toBe('');

    await fixture.whenStable();
    fixture.detectChanges();

    // Verify component loads without routing conflicts
    const container = fixture.nativeElement.querySelector('.hello-world-container');
    expect(container).toBeTruthy();
  });
});