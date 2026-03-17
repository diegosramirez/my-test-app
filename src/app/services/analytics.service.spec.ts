import { TestBed } from '@angular/core/testing';
import {
  AnalyticsService,
  getPasswordLengthCategory,
  extractEmailDomain,
  PASSWORD_LENGTH_BUCKETS,
} from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  describe('getPasswordLengthCategory', () => {
    it('returns short for 8-11 chars', () => {
      expect(getPasswordLengthCategory(8)).toBe('short');
      expect(getPasswordLengthCategory(11)).toBe('short');
    });
    it('returns medium for 12-19 chars', () => {
      expect(getPasswordLengthCategory(12)).toBe('medium');
      expect(getPasswordLengthCategory(19)).toBe('medium');
    });
    it('returns long for 20+ chars', () => {
      expect(getPasswordLengthCategory(20)).toBe('long');
      expect(getPasswordLengthCategory(128)).toBe('long');
    });
  });

  describe('extractEmailDomain', () => {
    it('extracts domain from valid email', () => {
      expect(extractEmailDomain('user@example.com')).toBe('example.com');
    });
    it('returns empty string for invalid email', () => {
      expect(extractEmailDomain('nope')).toBe('');
    });
  });

  describe('trackSignupAttempted', () => {
    it('records event with email_domain and password_length_category', () => {
      service.trackSignupAttempted('user@test.io', 10);
      const events = service.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('signup_step1_attempted');
      expect(events[0].properties['email_domain']).toBe('test.io');
      expect(events[0].properties['password_length_category']).toBe('short');
    });

    it('never includes actual password value in properties', () => {
      service.trackSignupAttempted('u@x.com', 15);
      const props = service.getEvents()[0].properties;
      // Should not have a 'password' key — only 'password_length_category'
      expect(props).not.toHaveProperty('password');
      expect(props['password_length_category']).toBe('medium');
    });
  });

  describe('trackSignupValidationFailed', () => {
    it('records mismatch error type', () => {
      service.trackSignupValidationFailed('mismatch');
      expect(service.getEvents()[0].properties['error_type']).toBe('mismatch');
    });
    it('records whitespace_only error type', () => {
      service.trackSignupValidationFailed('whitespace_only');
      expect(service.getEvents()[0].properties['error_type']).toBe('whitespace_only');
    });
    it('records length error type', () => {
      service.trackSignupValidationFailed('length');
      expect(service.getEvents()[0].properties['error_type']).toBe('length');
    });
    it('records format error type', () => {
      service.trackSignupValidationFailed('format');
      expect(service.getEvents()[0].properties['error_type']).toBe('format');
    });
  });

  describe('trackSignupCompleted', () => {
    it('records user_id and step', () => {
      service.trackSignupCompleted('uuid-123', 1);
      const e = service.getEvents()[0];
      expect(e.name).toBe('signup_step1_completed');
      expect(e.properties['user_id']).toBe('uuid-123');
      expect(e.properties['step']).toBe(1);
    });
  });

  describe('trackRateLimitExceeded', () => {
    it('records attempt_count without IP', () => {
      service.trackRateLimitExceeded(6);
      const e = service.getEvents()[0];
      expect(e.name).toBe('signup_rate_limit_exceeded');
      expect(e.properties['attempt_count']).toBe(6);
      expect(e.properties).not.toHaveProperty('ip');
    });
  });

  describe('no PII leakage', () => {
    it('never stores password values across all event types', () => {
      const password = 'MySecret123!';
      service.trackSignupAttempted('u@x.com', password.length);
      service.trackSignupValidationFailed('mismatch');
      service.trackSignupCompleted('id', 1);
      service.trackRateLimitExceeded(5);

      const allProps = service.getEvents().map(e => JSON.stringify(e.properties)).join('');
      expect(allProps).not.toContain(password);
    });
  });
});
