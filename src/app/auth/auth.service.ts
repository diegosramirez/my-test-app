import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, timer } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthError {
  error: string;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly SESSION_WARNING_KEY = 'session_warning_shown';

  private authStateSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  private sessionWarningTimer?: ReturnType<typeof setTimeout>;
  private sessionExpiryTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient) {
    this.initializeAuth();
    this.setupStorageListener();
  }

  // Public observables
  readonly isAuthenticated$ = this.authStateSubject.asObservable();
  readonly user$ = this.userSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  /**
   * Register a new user
   */
  register(request: RegisterRequest): Observable<AuthResponse> {
    this.loadingSubject.next(true);

    return this.http.post<AuthResponse>('/api/auth/register', request)
      .pipe(
        map(response => {
          this.handleAuthSuccess(response);
          return response;
        }),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Login an existing user
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    this.loadingSubject.next(true);

    return this.http.post<AuthResponse>('/api/auth/login', request)
      .pipe(
        map(response => {
          this.handleAuthSuccess(response);
          return response;
        }),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.clearAuthData();
    this.authStateSubject.next(false);
    this.userSubject.next(null);
    this.clearSessionTimers();

    // Broadcast logout to other tabs
    this.broadcastLogout();
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Extend current session
   */
  extendSession(): void {
    const token = this.getToken();
    if (!token) return;

    // Reset session timers
    this.setupSessionTimers();

    // Clear any existing warning
    localStorage.removeItem(this.SESSION_WARNING_KEY);
  }

  /**
   * Show session expiration warning
   */
  showSessionWarning(): Observable<boolean> {
    return new Observable(observer => {
      // Check if warning was already shown in this session
      const warningShown = localStorage.getItem(this.SESSION_WARNING_KEY);
      if (warningShown) {
        observer.next(false);
        observer.complete();
        return;
      }

      // Mark warning as shown
      localStorage.setItem(this.SESSION_WARNING_KEY, 'true');
      observer.next(true);
      observer.complete();
    });
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        // Check if token is still valid (not expired)
        if (this.isTokenValid(token)) {
          this.authStateSubject.next(true);
          this.userSubject.next(user);
          this.setupSessionTimers();
        } else {
          this.clearAuthData();
        }
      } catch (error) {
        this.clearAuthData();
      }
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }

  private handleAuthSuccess(response: AuthResponse): void {
    // Store auth data
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

    // Update state
    this.authStateSubject.next(true);
    this.userSubject.next(response.user);
    this.loadingSubject.next(false);

    // Setup session management
    this.setupSessionTimers();
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    this.loadingSubject.next(false);

    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 401) {
      errorMessage = "That email and password combination doesn't match our records. Please check your credentials and try again.";
    } else if (error.status === 409) {
      errorMessage = 'An account with this email already exists. Please try logging in instead.';
    } else if (error.status === 429) {
      errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Please check your information and try again.';
    }

    return throwError(() => ({
      ...error.error,
      message: errorMessage
    } as AuthError));
  }

  private setupSessionTimers(): void {
    this.clearSessionTimers();

    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const now = Date.now();
      const timeToExpiry = expiry - now;

      if (timeToExpiry > 0) {
        // Show warning 5 minutes before expiry
        const warningTime = Math.max(0, timeToExpiry - (5 * 60 * 1000));

        this.sessionWarningTimer = setTimeout(() => {
          this.showSessionWarning().subscribe(shouldShow => {
            if (shouldShow) {
              // Emit warning event (handled by components)
              window.dispatchEvent(new CustomEvent('sessionWarning', {
                detail: { timeRemaining: 5 * 60 * 1000 }
              }));
            }
          });
        }, warningTime);

        // Auto logout at expiry
        this.sessionExpiryTimer = setTimeout(() => {
          this.logout();
        }, timeToExpiry);
      }
    } catch (error) {
      console.error('Error setting up session timers:', error);
    }
  }

  private clearSessionTimers(): void {
    if (this.sessionWarningTimer) {
      clearTimeout(this.sessionWarningTimer);
      this.sessionWarningTimer = undefined;
    }

    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = undefined;
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_WARNING_KEY);
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      // Handle cross-tab logout broadcast
      if (event.key === 'auth_logout_broadcast' && event.newValue) {
        // Another tab logged out
        this.authStateSubject.next(false);
        this.userSubject.next(null);
        this.clearSessionTimers();
        this.clearAuthData();
      }

      // Handle cross-tab logout via token removal
      if (event.key === this.TOKEN_KEY && event.newValue === null) {
        // Another tab logged out
        this.authStateSubject.next(false);
        this.userSubject.next(null);
        this.clearSessionTimers();
      }

      // Handle cross-tab login
      if (event.key === this.TOKEN_KEY && event.newValue && !this.isAuthenticated()) {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            this.authStateSubject.next(true);
            this.userSubject.next(user);
            this.setupSessionTimers();
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
    });
  }

  private broadcastLogout(): void {
    // Create a custom event that will notify all tabs including the current one
    const logoutEvent = new CustomEvent('auth:logout', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(logoutEvent);

    // Also dispatch storage event manually for cross-tab communication
    const storageEvent = new StorageEvent('storage', {
      key: 'auth_logout_broadcast',
      newValue: Date.now().toString(),
      oldValue: null
    });
    window.dispatchEvent(storageEvent);
  }
}