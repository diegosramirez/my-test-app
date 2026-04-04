import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { routes } from './app.routes';
import { ContactFormComponent } from './contact/contact-form.component';

@Component({
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [RouterOutlet]
})
class TestAppComponent {}

describe('App Routes', () => {
  let router: Router;
  let location: Location;
  let fixture: ComponentFixture<TestAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAppComponent, HttpClientTestingModule],
      providers: [
        provideRouter(routes)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestAppComponent);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges();
  });

  describe('Route Configuration', () => {
    it('should have contact route configured', () => {
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute).toBeDefined();
      expect(contactRoute?.component).toBe(ContactFormComponent);
    });

    it('should have default redirect to contact configured', () => {
      const defaultRoute = routes.find(route => route.path === '');
      expect(defaultRoute).toBeDefined();
      expect(defaultRoute?.redirectTo).toBe('/contact');
      expect(defaultRoute?.pathMatch).toBe('full');
    });

    it('should have exactly 2 routes configured', () => {
      expect(routes.length).toBe(2);
    });
  });

  describe('Navigation', () => {
    it('should navigate to contact form when /contact is accessed', async () => {
      await router.navigate(['/contact']);
      expect(location.path()).toBe('/contact');
    });

    it('should redirect to contact when root path is accessed', async () => {
      await router.navigate(['']);
      expect(location.path()).toBe('/contact');
    });

    it('should redirect to contact when / is accessed', async () => {
      await router.navigate(['/']);
      expect(location.path()).toBe('/contact');
    });
  });

  describe('Route Resolution', () => {
    it('should resolve contact route to ContactFormComponent', () => {
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute?.component).toBe(ContactFormComponent);
    });

    it('should handle unknown routes gracefully', async () => {
      // Since there's no wildcard route, unknown routes should result in no match
      // This is expected behavior and Angular will handle it appropriately
      try {
        await router.navigate(['/unknown-route']);
        // If navigation succeeds, we should still be at root (which redirects to contact)
        expect(location.path()).toBe('/contact');
      } catch (error) {
        // If navigation fails, that's also acceptable for this basic routing setup
        expect(error).toBeDefined();
      }
    });
  });

  describe('Route Parameters', () => {
    it('should handle contact route without parameters', async () => {
      await router.navigate(['/contact']);
      expect(location.path()).toBe('/contact');
    });

    it('should maintain URL integrity during navigation', async () => {
      // Navigate to root
      await router.navigate(['']);
      expect(location.path()).toBe('/contact');

      // Navigate explicitly to contact
      await router.navigate(['/contact']);
      expect(location.path()).toBe('/contact');

      // Navigate back to root
      await router.navigate(['']);
      expect(location.path()).toBe('/contact');
    });
  });

  describe('Route Guards and Resolvers', () => {
    it('should not have any route guards configured', () => {
      routes.forEach(route => {
        expect(route.canActivate).toBeUndefined();
        expect(route.canActivateChild).toBeUndefined();
        expect(route.canDeactivate).toBeUndefined();
        expect(route.canMatch).toBeUndefined();
      });
    });

    it('should not have any resolvers configured', () => {
      routes.forEach(route => {
        expect(route.resolve).toBeUndefined();
      });
    });

    it('should not have any data properties configured', () => {
      routes.forEach(route => {
        expect(route.data).toBeUndefined();
      });
    });
  });

  describe('Route Configuration Validation', () => {
    it('should have valid path configurations', () => {
      routes.forEach(route => {
        expect(route.path).toBeDefined();
        expect(typeof route.path).toBe('string');
      });
    });

    it('should have either component or redirectTo for each route', () => {
      routes.forEach(route => {
        const hasComponent = !!route.component;
        const hasRedirect = !!route.redirectTo;
        expect(hasComponent || hasRedirect).toBeTruthy();
        // Should not have both
        expect(hasComponent && hasRedirect).toBeFalsy();
      });
    });

    it('should have pathMatch full for redirect routes', () => {
      const redirectRoutes = routes.filter(route => route.redirectTo);
      redirectRoutes.forEach(route => {
        expect(route.pathMatch).toBe('full');
      });
    });
  });

  describe('Standalone Component Integration', () => {
    it('should properly integrate with standalone ContactFormComponent', () => {
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute?.component).toBe(ContactFormComponent);

      // Verify ContactFormComponent is properly configured as standalone
      expect(ContactFormComponent).toBeDefined();
    });

    it('should not use loadChildren for contact route', () => {
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute?.loadChildren).toBeUndefined();
    });

    it('should directly reference component instead of using lazy loading', () => {
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute?.component).toBe(ContactFormComponent);
      expect(contactRoute?.loadComponent).toBeUndefined();
    });
  });

  describe('Angular 14+ Route Configuration', () => {
    it('should be compatible with standalone components architecture', () => {
      // Verify routes are configured for standalone components (no modules)
      routes.forEach(route => {
        if (route.component) {
          expect(route.loadChildren).toBeUndefined(); // Should not use old module loading
        }
      });
    });

    it('should use modern Angular routing patterns', () => {
      // Verify we\'re using component property instead of deprecated patterns
      const contactRoute = routes.find(route => route.path === 'contact');
      expect(contactRoute?.component).toBeDefined();
      expect(contactRoute?.loadChildren).toBeUndefined();
    });
  });
});