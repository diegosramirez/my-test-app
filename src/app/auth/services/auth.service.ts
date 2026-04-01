import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthUser, AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.models';
import { trackEvent } from '../../shared/utils/analytics';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * AuthService is the single source of truth for authentication state.
 *
 * Tradeoffs documented:
 * - localStorage is used for JWT storage (XSS vector). Follow-up story will migrate to httpOnly cookies.
 * - On bootstrap, the JWT is trusted locally (no /api/auth/me call). The interceptor's 401 catch
 *   handles server-side rejection of stale/revoked tokens.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject: BehaviorSubject<AuthUser | null>;
  readonly currentUser$: Observable<AuthUser | null>;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(this.hydrateUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const request: LoginRequest = { email: email.toLowerCase().trim(), password };
    trackEvent('auth_login_attempt', { timestamp: Date.now() });

    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
        trackEvent('auth_login_success', { userId: response.user.id });
      })
    );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    const request: RegisterRequest = { name: name.trim(), email: email.toLowerCase().trim(), password };
    trackEvent('auth_register_attempt', { timestamp: Date.now() });

    return this.http.post<AuthResponse>('/api/auth/register', request).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
        trackEvent('auth_register_success', { userId: response.user.id });
      })
    );
  }

  logout(): void {
    const userId = this.currentUser?.id;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
    if (userId) {
      trackEvent('auth_logout', { userId });
    }
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  /**
   * Synchronously hydrate user from localStorage on construction.
   * If token is expired, malformed, or decoding throws, clear storage silently.
   */
  private hydrateUser(): AuthUser | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (!token || !userJson) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp <= Date.now() / 1000) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return JSON.parse(userJson) as AuthUser;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
