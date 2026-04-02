import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, timeout, catchError, map, tap, distinctUntilChanged, take } from 'rxjs';
import { AuthState, AuthUser, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../models/auth.models';

const AUTH_TOKEN_KEY = 'auth_token';
const INITIAL_STATE: AuthState = { user: null, token: null, isAuthenticated: false };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly authState$ = new BehaviorSubject<AuthState>(INITIAL_STATE);
  private readonly authResolved$ = new BehaviorSubject<boolean | null>(null);

  /** In-memory fallback when localStorage is unavailable */
  private memoryToken: string | null = null;

  readonly user$ = this.authState$.pipe(map(s => s.user), distinctUntilChanged());
  readonly isAuthenticated$ = this.authState$.pipe(map(s => s.isAuthenticated), distinctUntilChanged());
  readonly isAuthResolved$ = this.authResolved$.asObservable();

  constructor() {
    this.listenForMultiTabSync();
  }

  getToken(): string | null {
    return this.authState$.getValue().token;
  }

  /** Clear auth state without navigating (used by interceptor to avoid double-redirect) */
  clearAuth(): void {
    this.clearToken();
    this.authState$.next(INITIAL_STATE);
  }

  initializeAuth(): Observable<boolean> {
    const token = this.retrieveToken();
    if (!token) {
      this.authResolved$.next(true);
      return of(true);
    }

    // Set token in state so the interceptor can attach it to the /api/auth/me request
    this.authState$.next({ user: null, token, isAuthenticated: false });

    return this.http.get<AuthUser>('/api/auth/me').pipe(
      timeout(3000),
      tap(user => {
        this.authState$.next({ user, token, isAuthenticated: true });
        this.authResolved$.next(true);
      }),
      map(() => true),
      catchError(() => {
        this.clearToken();
        this.authState$.next(INITIAL_STATE);
        this.authResolved$.next(true);
        return of(true);
      })
    );
  }

  login(req: LoginRequest): Observable<AuthUser> {
    return this.http.post<LoginResponse>('/api/auth/login', req).pipe(
      tap(res => {
        this.persistToken(res.token);
        this.authState$.next({ user: res.user, token: res.token, isAuthenticated: true });
        this.authResolved$.next(true);
      }),
      map(res => res.user)
    );
  }

  register(req: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', req);
  }

  logout(): void {
    const userId = this.authState$.getValue().user?.id;
    this.clearToken();
    this.authState$.next(INITIAL_STATE);
    this.router.navigate(['/login']);
  }

  /** Reset state when another tab clears the token */
  private listenForMultiTabSync(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_TOKEN_KEY && event.newValue === null) {
        this.ngZone.run(() => {
          this.authState$.next(INITIAL_STATE);
          this.router.navigate(['/login']);
        });
      }
    });
  }

  private persistToken(token: string): void {
    this.memoryToken = token;
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // Safari private browsing or quota exceeded — memory-only
    }
  }

  private retrieveToken(): string | null {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        this.memoryToken = token;
        return token;
      }
    } catch {
      // localStorage unavailable
    }
    return this.memoryToken;
  }

  private clearToken(): void {
    this.memoryToken = null;
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // localStorage unavailable
    }
  }
}
