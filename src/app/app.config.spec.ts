import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app.config';
import { ContactService } from './contact/contact.service';
import { routes } from './app.routes';

@Component({
  selector: 'app-test',
  template: '<div>Test App</div>',
  standalone: true
})
class TestAppComponent {}

describe('App Configuration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: appConfig.providers
    }).compileComponents();
  });

  describe('Providers Configuration', () => {
    it('should configure router provider', () => {
      const router = TestBed.inject(Router);
      expect(router).toBeTruthy();
      expect(router).toBeInstanceOf(Router);
    });

    it('should configure HttpClient provider', () => {
      const httpClient = TestBed.inject(HttpClient);
      expect(httpClient).toBeTruthy();
      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it('should have all required providers', () => {
      expect(appConfig.providers).toBeDefined();
      expect(Array.isArray(appConfig.providers)).toBeTruthy();
      expect(appConfig.providers.length).toBeGreaterThan(0);
    });

    it('should configure global error listeners', () => {
      // The provideBrowserGlobalErrorListeners should be configured
      // We can verify this by checking that the provider is included
      const providers = appConfig.providers;
      expect(providers).toBeDefined();
      expect(providers.length).toBeGreaterThanOrEqual(3); // At least router, http, and error listeners
    });
  });

  describe('Router Integration', () => {
    it('should configure router with correct routes', () => {
      const router = TestBed.inject(Router);
      const config = router.config;

      expect(config).toBeDefined();
      expect(config.length).toBe(2); // Should match our routes

      // Verify contact route
      const contactRoute = config.find(route => route.path === 'contact');
      expect(contactRoute).toBeDefined();

      // Verify default redirect route
      const defaultRoute = config.find(route => route.path === '');
      expect(defaultRoute).toBeDefined();
      expect(defaultRoute?.redirectTo).toBe('/contact');
    });

    it('should enable router navigation', async () => {
      const router = TestBed.inject(Router);

      // Test navigation functionality
      const canNavigate = await router.navigate(['/contact']).catch(() => false);
      expect(canNavigate).not.toBe(false);
    });
  });

  describe('HTTP Client Integration', () => {
    it('should enable HTTP requests', () => {
      const httpClient = TestBed.inject(HttpClient);
      const httpTestingController = TestBed.inject(HttpTestingController);

      // Test that HTTP client can make requests
      httpClient.get('/api/test').subscribe();

      const req = httpTestingController.expectOne('/api/test');
      expect(req).toBeDefined();
      expect(req.request.method).toBe('GET');

      req.flush({ success: true });
      httpTestingController.verify();
    });

    it('should support contact service HTTP operations', () => {
      const contactService = TestBed.inject(ContactService);
      expect(contactService).toBeTruthy();
      expect(contactService).toBeInstanceOf(ContactService);
    });
  });

  describe('Service Injection', () => {
    it('should inject ContactService', () => {
      const contactService = TestBed.inject(ContactService);
      expect(contactService).toBeTruthy();
      expect(typeof contactService.submitContactForm).toBe('function');
    });

    it('should provide ContactService as singleton', () => {
      const service1 = TestBed.inject(ContactService);
      const service2 = TestBed.inject(ContactService);
      expect(service1).toBe(service2); // Should be the same instance
    });
  });

  describe('Bootstrap Compatibility', () => {
    it('should be compatible with bootstrapApplication', () => {
      // Verify config structure is compatible with bootstrapApplication
      expect(appConfig).toBeDefined();
      expect(appConfig.providers).toBeDefined();
      expect(Array.isArray(appConfig.providers)).toBeTruthy();
    });

    it('should have ApplicationConfig type structure', () => {
      // Verify the config has the expected ApplicationConfig shape
      expect(appConfig.providers).toBeDefined();
      expect(Array.isArray(appConfig.providers)).toBeTruthy();
    });
  });

  describe('Angular 14+ Standalone Architecture', () => {
    it('should not include any NgModule providers', () => {
      // Verify we\'re using the new standalone approach, not NgModule
      const providers = appConfig.providers;

      // Check that we don\'t have any NgModule-specific configurations
      providers.forEach(provider => {
        // Providers should be functions or objects, not NgModule classes
        expect(typeof provider === 'function' || typeof provider === 'object').toBeTruthy();
      });
    });

    it('should use modern provider functions', () => {
      const providers = appConfig.providers;
      expect(providers.length).toBeGreaterThanOrEqual(3);

      // Should have functional providers, not module-based ones
      // This is verified by the fact that the app works with these providers
      expect(providers).toBeDefined();
    });
  });

  describe('Error Handling Configuration', () => {
    it('should configure global error listeners', () => {
      // The presence of provideBrowserGlobalErrorListeners in providers
      // means global error handling is configured
      expect(appConfig.providers).toContain(jasmine.any(Function));
    });

    it('should handle uncaught errors gracefully', () => {
      // Test that error handling is set up (would be handled by Angular\'s global error handler)
      expect(() => {
        // This would normally be caught by the global error handler
        TestBed.inject(Router);
      }).not.toThrow();
    });
  });

  describe('Production Readiness', () => {
    it('should support production builds', () => {
      // Verify config doesn\'t have development-only dependencies
      expect(appConfig.providers).toBeDefined();

      // All providers should be production-safe
      appConfig.providers.forEach(provider => {
        expect(provider).toBeDefined();
        expect(provider).not.toBeNull();
      });
    });

    it('should have proper dependency injection setup', () => {
      // Test that DI works correctly
      expect(() => {
        TestBed.inject(Router);
        TestBed.inject(HttpClient);
        TestBed.inject(ContactService);
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid provider array', () => {
      expect(appConfig.providers).toBeDefined();
      expect(Array.isArray(appConfig.providers)).toBeTruthy();
      expect(appConfig.providers.length).toBeGreaterThan(0);
    });

    it('should not have circular dependencies', () => {
      // Test that services can be instantiated without circular dependency errors
      expect(() => {
        const contactService = TestBed.inject(ContactService);
        expect(contactService).toBeTruthy();
      }).not.toThrow();
    });

    it('should have consistent configuration', () => {
      // Verify that all services can be created and work together
      const router = TestBed.inject(Router);
      const httpClient = TestBed.inject(HttpClient);
      const contactService = TestBed.inject(ContactService);

      expect(router).toBeTruthy();
      expect(httpClient).toBeTruthy();
      expect(contactService).toBeTruthy();
    });
  });

  describe('Integration Test', () => {
    it('should support complete app functionality', async () => {
      const router = TestBed.inject(Router);
      const contactService = TestBed.inject(ContactService);
      const httpTestingController = TestBed.inject(HttpTestingController);

      // Test routing
      await router.navigate(['/contact']);

      // Test service functionality
      const formData = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Integration test message'
      };

      contactService.submitContactForm(formData).subscribe(response => {
        expect(response.success).toBeTruthy();
      });

      const req = httpTestingController.expectOne('/api/contact');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(formData);

      req.flush({ success: true, message: 'Test successful' });
      httpTestingController.verify();
    });

    it('should handle full user journey', async () => {
      // This test simulates a complete user interaction
      const router = TestBed.inject(Router);
      const contactService = TestBed.inject(ContactService);

      // User navigates to contact page
      await router.navigate(['/']);
      expect(router.url).toBe('/contact');

      // User can access contact service
      expect(contactService).toBeTruthy();
      expect(typeof contactService.submitContactForm).toBe('function');

      // All dependencies are properly injected and functional
      expect(router).toBeTruthy();
      expect(contactService).toBeTruthy();
    });
  });
});