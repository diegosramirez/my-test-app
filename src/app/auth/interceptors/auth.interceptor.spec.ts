import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches Authorization header to /api/ requests when token exists', () => {
    localStorage.setItem('auth_token', 'my-token');
    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('does not attach header to non-/api/ requests', () => {
    localStorage.setItem('auth_token', 'my-token');
    http.get('/other/data').subscribe();
    const req = httpMock.expectOne('/other/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach header when no token', () => {
    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('calls logout on 401 from /api/ endpoint', () => {
    vi.spyOn(authService, 'logout');
    http.get('/api/protected').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(authService.logout).toHaveBeenCalled();
  });

  it('does not call logout on 401 from non-/api/ endpoint', () => {
    vi.spyOn(authService, 'logout');
    http.get('/external/thing').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/external/thing');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('does not call logout on non-401 errors from /api/', () => {
    vi.spyOn(authService, 'logout');
    http.get('/api/data').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/data');
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('re-throws the error after 401 logout', () => {
    vi.spyOn(authService, 'logout');
    let errorCaught = false;
    http.get('/api/protected').subscribe({
      error: () => { errorCaught = true; }
    });
    httpMock.expectOne('/api/protected').flush('', { status: 401, statusText: 'Unauthorized' });
    expect(errorCaught).toBe(true);
  });
});
