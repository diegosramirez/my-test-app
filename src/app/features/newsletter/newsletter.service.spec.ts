import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NewsletterService } from './newsletter.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NewsletterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should map 200 response to success', () => {
    service.subscribe('test@example.com').subscribe((result) => {
      expect(result.status).toBe('success');
      expect(result.message).toContain('subscribed');
    });

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com' });
    req.flush({});
  });

  it('should map 409 response to duplicate', () => {
    service.subscribe('dup@example.com').subscribe((result) => {
      expect(result.status).toBe('duplicate');
      expect(result.message).toContain('already subscribed');
    });

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.flush({}, { status: 409, statusText: 'Conflict' });
  });

  it('should map 500 response to error', () => {
    service.subscribe('err@example.com').subscribe((result) => {
      expect(result.status).toBe('error');
      expect(result.message).toContain('Something went wrong');
    });

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should map network error to error', () => {
    service.subscribe('net@example.com').subscribe((result) => {
      expect(result.status).toBe('error');
      expect(result.message).toContain('Something went wrong');
    });

    const req = httpMock.expectOne('/api/newsletter/subscribe');
    req.error(new ProgressEvent('error'));
  });

  it('should read and write localStorage for subscription flag', () => {
    const store: Record<string, string> = {};
    vi.spyOn(service, 'getStorageItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(service, 'setStorageItem').mockImplementation((key, val) => { store[key] = val; });

    expect(service.isSubscribed()).toBe(false);
    service.setSubscribed();
    expect(service.isSubscribed()).toBe(true);
  });
});
