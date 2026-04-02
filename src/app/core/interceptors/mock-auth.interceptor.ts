import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';

interface MockUser {
  id: string;
  username: string;
  email: string;
  password: string;
}

const MOCK_USERS: MockUser[] = [];
const MOCK_TOKENS = new Map<string, MockUser>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateToken(userId: string): string {
  const token = `mock-jwt-${userId}-${Date.now()}`;
  return token;
}

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/auth/')) {
    return next(req);
  }

  const DELAY_MS = 300;

  // POST /api/auth/register
  if (req.url.endsWith('/api/auth/register') && req.method === 'POST') {
    const body = req.body as { username: string; email: string; password: string; confirmPassword: string };

    if (!body.username || !body.email || !body.password || !body.confirmPassword) {
      const details: Record<string, string> = {};
      if (!body.username) details['username'] = 'Username is required';
      if (!body.email) details['email'] = 'Email is required';
      if (!body.password) details['password'] = 'Password is required';
      if (!body.confirmPassword) details['confirmPassword'] = 'Confirm password is required';
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { error: 'VALIDATION_ERROR', details },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    if (body.password.length < 8) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { error: 'VALIDATION_ERROR', details: { password: 'Password must be at least 8 characters' } },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    if (body.password !== body.confirmPassword) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { error: 'VALIDATION_ERROR', details: { confirmPassword: 'Passwords do not match' } },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    if (MOCK_USERS.some(u => u.email === body.email)) {
      return throwError(() => new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: { error: 'DUPLICATE_ENTRY', field: 'email', message: 'Email already registered' },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    const userId = generateId();
    MOCK_USERS.push({ id: userId, username: body.username, email: body.email, password: body.password });
    return of(new HttpResponse({
      status: 201,
      body: { message: 'Registration successful', userId }
    })).pipe(delay(DELAY_MS));
  }

  // POST /api/auth/login
  if (req.url.endsWith('/api/auth/login') && req.method === 'POST') {
    const body = req.body as { email: string; password: string };
    const user = MOCK_USERS.find(u => u.email === body.email && u.password === body.password);

    if (!user) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    const token = generateToken(user.id);
    MOCK_TOKENS.set(token, user);
    return of(new HttpResponse({
      status: 200,
      body: { token, user: { id: user.id, username: user.username, email: user.email } }
    })).pipe(delay(DELAY_MS));
  }

  // GET /api/auth/me
  if (req.url.endsWith('/api/auth/me') && req.method === 'GET') {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { error: 'UNAUTHORIZED', message: 'Token is invalid or expired' },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    const user = MOCK_TOKENS.get(token);
    if (!user) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { error: 'UNAUTHORIZED', message: 'Token is invalid or expired' },
        url: req.url
      })).pipe(delay(DELAY_MS));
    }

    return of(new HttpResponse({
      status: 200,
      body: { id: user.id, username: user.username, email: user.email }
    })).pipe(delay(DELAY_MS));
  }

  return next(req);
};
