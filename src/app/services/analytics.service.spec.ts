import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { beforeEach, describe, it, expect } from 'vitest';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockRouter: any;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    routerEventsSubject = new Subject();

    mockRouter = {
      events: routerEventsSubject.asObservable(),
      url: '/test-path'
    };

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AnalyticsService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with initialized flag as false', () => {
      expect(service.isInitialized).toBe(false);
    });

    it('should have empty event queue initially', () => {
      expect(service.queueLength).toBe(0);
    });
  });

  describe('Event Queueing', () => {
    it('should queue page views before initialization', () => {
      service.trackPageView('/test-page');
      expect(service.queueLength).toBe(1);
    });

    it('should queue custom events before initialization', () => {
      service.trackEvent('test_event', { prop: 'value' });
      expect(service.queueLength).toBe(1);
    });

    it('should queue multiple events', () => {
      service.trackEvent('event1');
      service.trackEvent('event2');
      service.trackPageView('/page1');
      expect(service.queueLength).toBe(3);
    });
  });

  describe('Router Integration', () => {
    it('should handle router navigation events without errors', () => {
      expect(() => {
        const navigationEvent = new NavigationEnd(1, '/new-route', '/new-route');
        routerEventsSubject.next(navigationEvent);
      }).not.toThrow();
    });
  });

  describe('User Identity Management', () => {
    it('should accept user identity data without errors', () => {
      expect(() => {
        service.identify({
          distinctId: 'user123',
          properties: { name: 'Test User' }
        });
      }).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    it('should accept reset calls without errors', () => {
      expect(() => {
        service.reset();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle trackPageView calls gracefully', () => {
      expect(() => {
        service.trackPageView();
        service.trackPageView('/custom-path');
      }).not.toThrow();
    });

    it('should handle trackEvent calls gracefully', () => {
      expect(() => {
        service.trackEvent('test_event');
        service.trackEvent('test_event_with_props', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Service Interface', () => {
    it('should expose required public methods', () => {
      expect(typeof service.trackPageView).toBe('function');
      expect(typeof service.trackEvent).toBe('function');
      expect(typeof service.identify).toBe('function');
      expect(typeof service.reset).toBe('function');
    });

    it('should expose testing getters', () => {
      expect(typeof service.isInitialized).toBe('boolean');
      expect(typeof service.queueLength).toBe('number');
    });
  });
});