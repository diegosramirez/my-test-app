import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { NormalizedApiError } from '../models/api-error.model';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('normalizes 400 with structured field errors', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(
      {
        detail: [
          { field: 'password_confirmation', message: 'Passwords do not match' },
          { field: 'password', message: 'Password must be between 8 and 128 characters' },
        ],
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(err!.status).toBe(400);
    expect(err!.errors).toEqual([
      { field: 'password_confirmation', message: 'Passwords do not match' },
      { field: 'password', message: 'Password must be between 8 and 128 characters' },
    ]);
  });

  it('normalizes 409 with string detail', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(
      { detail: 'An account with this email already exists' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(err!.status).toBe(409);
    expect(err!.errors).toEqual([
      { field: 'general', message: 'An account with this email already exists' },
    ]);
  });

  it('normalizes 429 with Retry-After header', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(
      { detail: 'Too many signup attempts. Please try again shortly.' },
      { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '60' } }
    );

    expect(err!.status).toBe(429);
    expect(err!.retryAfter).toBe(60);
    expect(err!.errors[0].message).toBe('Too many signup attempts. Please try again shortly.');
  });

  it('strips password fields from error detail array', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(
      {
        detail: [
          { field: 'password_confirmation', message: 'Passwords do not match', password: 'secret123' },
        ],
      },
      { status: 400, statusText: 'Bad Request' }
    );

    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('secret123');
    expect(err!.errors[0].field).toBe('password_confirmation');
  });

  it('provides fallback error when body is empty', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(err!.errors).toEqual([{ field: 'general', message: 'An unexpected error occurred' }]);
  });

  it('handles non-400/409/429 errors too', () => {
    let err: NormalizedApiError | undefined;
    http.post('/api/signup/step1', {}).subscribe({ error: (e) => { err = e; } });

    httpMock.expectOne('/api/signup/step1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(err!.status).toBe(500);
  });

  it('passes successful responses through', () => {
    let result: unknown;
    http.post('/api/signup/step1', {}).subscribe({ next: (r) => { result = r; } });

    httpMock.expectOne('/api/signup/step1').flush({ user_id: 'uuid', step: 1 }, { status: 201, statusText: 'Created' });

    expect(result).toEqual({ user_id: 'uuid', step: 1 });
  });
});
