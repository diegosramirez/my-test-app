import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsService, AnalyticsEvent } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;
  let originalNavigatorOnLine: boolean;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService]
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
    originalNavigatorOnLine = navigator.onLine;
  });

  afterEach(() => {
    httpMock.verify();
    // Restore original navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigatorOnLine
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Event Tracking', () => {
    it('should track step_started event with correct properties', () => {
      const sessionId = 'test-session-123';

      service.trackStepStarted(1, 'Personal', sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      expect(req.request.method).toBe('POST');

      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('step_started');
      expect(event.properties['step_number']).toBe(1);
      expect(event.properties['step_name']).toBe('Personal');
      expect(event.properties['session_id']).toBe(sessionId);
      expect(event.sessionId).toBe(sessionId);
      expect(event.timestamp).toBeInstanceOf(Date);

      req.flush({ success: true });
    });

    it('should track step_completed event with correct properties', () => {
      const sessionId = 'test-session-456';
      const validationErrors = 2;
      const timeSpent = 45000; // 45 seconds

      service.trackStepCompleted(2, validationErrors, timeSpent, sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      expect(req.request.method).toBe('POST');

      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('step_completed');
      expect(event.properties['step_number']).toBe(2);
      expect(event.properties['validation_errors']).toBe(validationErrors);
      expect(event.properties['time_spent']).toBe(timeSpent);
      expect(event.properties['session_id']).toBe(sessionId);

      req.flush({ success: true });
    });

    it('should track wizard_completed event with correct properties', () => {
      const sessionId = 'test-session-789';
      const totalTime = 180000; // 3 minutes
      const errorCount = 5;
      const completionPath = 'personal->address->review';

      service.trackWizardCompleted(totalTime, errorCount, completionPath, sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('wizard_completed');
      expect(event.properties['total_time']).toBe(totalTime);
      expect(event.properties['error_count']).toBe(errorCount);
      expect(event.properties['completion_path']).toBe(completionPath);
      expect(event.properties['session_id']).toBe(sessionId);

      req.flush({ success: true });
    });

    it('should track session_restored event with correct properties', () => {
      const sessionId = 'test-session-restored';
      const stepNumber = 2;
      const dataAgeMinutes = 15;

      service.trackSessionRestored(stepNumber, dataAgeMinutes, sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('session_restored');
      expect(event.properties['step_number']).toBe(stepNumber);
      expect(event.properties['data_age_minutes']).toBe(dataAgeMinutes);
      expect(event.properties['session_id']).toBe(sessionId);

      req.flush({ success: true });
    });

    it('should track contextual_help_used event with correct properties', () => {
      const sessionId = 'test-session-help';
      const fieldName = 'phone';
      const stepNumber = 1;

      service.trackContextualHelpUsed(fieldName, stepNumber, sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('contextual_help_used');
      expect(event.properties['field_name']).toBe(fieldName);
      expect(event.properties['step_number']).toBe(stepNumber);
      expect(event.properties['session_id']).toBe(sessionId);

      req.flush({ success: true });
    });

    it('should track validation_failed event with correct properties', () => {
      const sessionId = 'test-session-validation';
      const fieldName = 'email';
      const errorType = 'invalid_format';
      const stepNumber = 1;

      service.trackValidationFailed(fieldName, errorType, stepNumber, sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      const event: AnalyticsEvent = req.request.body;
      expect(event.eventName).toBe('validation_failed');
      expect(event.properties['field_name']).toBe(fieldName);
      expect(event.properties['error_type']).toBe(errorType);
      expect(event.properties['step_number']).toBe(stepNumber);
      expect(event.properties['session_id']).toBe(sessionId);

      req.flush({ success: true });
    });
  });

  describe('Offline Handling', () => {
    beforeEach(() => {
      // Mock navigator.onLine to be false (offline)
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should queue events when offline', () => {
      const sessionId = 'test-session-offline';

      service.trackStepStarted(1, 'Personal', sessionId);

      // Should not make HTTP request when offline
      httpMock.expectNone('/api/analytics/track-event');

      // Verify event is queued by checking if it gets sent when coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Simulate coming back online
      window.dispatchEvent(new Event('online'));

      // Should now send the queued event
      const req = httpMock.expectOne('/api/analytics/track-event');
      expect(req.request.body.eventName).toBe('step_started');
      req.flush({ success: true });
    });

    it('should queue multiple events when offline and send them when online', () => {
      const sessionId = 'test-session-multiple';

      // Track multiple events while offline
      service.trackStepStarted(1, 'Personal', sessionId);
      service.trackValidationFailed('email', 'required', 1, sessionId);
      service.trackStepCompleted(1, 1, 30000, sessionId);

      // No HTTP requests should be made while offline
      httpMock.expectNone('/api/analytics/track-event');

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));

      // Should send all queued events
      const requests = [
        httpMock.expectOne('/api/analytics/track-event'),
        httpMock.expectOne('/api/analytics/track-event'),
        httpMock.expectOne('/api/analytics/track-event')
      ];

      expect(requests[0].request.body.eventName).toBe('step_started');
      expect(requests[1].request.body.eventName).toBe('validation_failed');
      expect(requests[2].request.body.eventName).toBe('step_completed');

      requests.forEach(req => req.flush({ success: true }));
    });
  });

  describe('Error Handling', () => {
    it('should queue events when HTTP request fails', () => {
      const sessionId = 'test-session-error';

      service.trackStepStarted(1, 'Personal', sessionId);

      const req = httpMock.expectOne('/api/analytics/track-event');
      req.error(new ProgressEvent('Network error'));

      // Event should be queued after failure
      // Verify by simulating retry on network recovery
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));

      const retryReq = httpMock.expectOne('/api/analytics/track-event');
      expect(retryReq.request.body.eventName).toBe('step_started');
      retryReq.flush({ success: true });
    });

    it('should handle repeated failures gracefully', () => {
      const sessionId = 'test-session-repeated-error';

      // Set up offline then online scenario
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      service.trackStepStarted(1, 'Personal', sessionId);

      // Come online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));

      // First attempt fails
      const firstReq = httpMock.expectOne('/api/analytics/track-event');
      firstReq.error(new ProgressEvent('Network error'));

      // Second attempt should happen on next online event
      window.dispatchEvent(new Event('online'));

      const secondReq = httpMock.expectOne('/api/analytics/track-event');
      secondReq.flush({ success: true });
    });
  });

  describe('Event Queue Management', () => {
    it('should stop processing queue when event fails during flush', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const sessionId = 'test-session-queue';

      // Add multiple events to queue
      service.trackStepStarted(1, 'Personal', sessionId);
      service.trackStepCompleted(1, 0, 30000, sessionId);
      service.trackStepStarted(2, 'Address', sessionId);

      // Come online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));

      // First request should be made
      const firstReq = httpMock.expectOne('/api/analytics/track-event');
      expect(firstReq.request.body.eventName).toBe('step_started');

      // Fail the first request
      firstReq.error(new ProgressEvent('Network error'));

      // No more requests should be made (queue processing should stop)
      httpMock.expectNone('/api/analytics/track-event');
    });
  });

  describe('Browser Event Listeners', () => {
    it('should update online status when offline event fires', () => {
      // Initially online
      expect((service as any).isOnline).toBe(true);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));

      expect((service as any).isOnline).toBe(false);
    });

    it('should update online status and flush queue when online event fires', () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
      expect((service as any).isOnline).toBe(false);

      // Add event to queue
      service.trackStepStarted(1, 'Personal', 'test-session');
      httpMock.expectNone('/api/analytics/track-event');

      // Come online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));

      expect((service as any).isOnline).toBe(true);

      // Should flush queue
      const req = httpMock.expectOne('/api/analytics/track-event');
      req.flush({ success: true });
    });
  });
});