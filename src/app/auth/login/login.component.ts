import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Welcome Back</h1>
        <p class="subtitle">Sign in to access your profile</p>

        <!-- Context message for protected route access -->
        <div class="info-message" *ngIf="returnUrl && returnUrl !== '/'" role="alert">
          Please sign in to continue to your requested page.
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-group">
            <label for="email" class="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              class="form-control"
              [class.error]="isFieldInvalid('email')"
              placeholder="Email address"
              formControlName="email"
              autocomplete="email"
              aria-describedby="email-error"
            />
            <div id="email-error" class="error-message" *ngIf="isFieldInvalid('email')">
              Please enter a valid email address
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              type="password"
              class="form-control"
              [class.error]="isFieldInvalid('password')"
              placeholder="Password"
              formControlName="password"
              autocomplete="current-password"
              aria-describedby="password-error"
            />
            <div id="password-error" class="error-message" *ngIf="isFieldInvalid('password')">
              Password is required
            </div>
          </div>


          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="loginForm.invalid || loading"
            [attr.aria-label]="loading ? 'Signing in...' : 'Sign in'"
          >
            <span *ngIf="loading" class="spinner" aria-hidden="true"></span>
            {{ loading ? 'Signing In...' : 'Sign In' }}
          </button>

          <!-- Rate limiting message -->
          <div class="warning-message" *ngIf="rateLimitMessage" role="alert">
            {{ rateLimitMessage }}
          </div>

          <!-- General error message -->
          <div class="error-message" *ngIf="errorMessage" role="alert">
            {{ errorMessage }}
          </div>
        </form>

        <div class="auth-footer">
          <div class="forgot-password">
            <a href="#" (click)="onForgotPassword($event)">Forgot your password?</a>
          </div>
          <p>Don't have an account? <a routerLink="/register">Create one here</a></p>
        </div>
      </div>
    </div>

    <!-- Session Warning Modal -->
    <div class="modal-overlay" *ngIf="showSessionWarning" (click)="dismissSessionWarning()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="session-warning-title" aria-modal="true">
        <h2 id="session-warning-title">Session Expiring Soon</h2>
        <p>Your session will expire in 5 minutes due to inactivity. Would you like to extend your session?</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="dismissSessionWarning()">
            Log Out
          </button>
          <button type="button" class="btn btn-primary" (click)="extendSession()">
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  rateLimitMessage = '';
  returnUrl = '';
  showSessionWarning = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.createForm();
  }

  ngOnInit(): void {
    // Get return URL from route parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/profile';

    // Listen for session warnings
    this.setupSessionWarningListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('sessionWarning', this.handleSessionWarning.bind(this));
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  private setupSessionWarningListener(): void {
    window.addEventListener('sessionWarning', this.handleSessionWarning.bind(this));
  }

  private handleSessionWarning = (event: any) => {
    this.showSessionWarning = true;
  };

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.rateLimitMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Navigate to return URL or profile
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.loading = false;

          if (error.message.includes('Too many login attempts')) {
            this.rateLimitMessage = error.message;
            this.scheduleRetryMessage();
          } else {
            this.errorMessage = error.message;
          }
        }
      });
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    // TODO: Implement forgot password flow
    alert('Forgot password functionality will be implemented in a future update.');
  }

  extendSession(): void {
    this.authService.extendSession();
    this.showSessionWarning = false;
  }

  dismissSessionWarning(): void {
    this.showSessionWarning = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private scheduleRetryMessage(): void {
    // Update message with countdown
    let seconds = 60;
    const updateMessage = () => {
      if (seconds > 0) {
        this.rateLimitMessage = `Too many login attempts. Please wait ${seconds} second${seconds === 1 ? '' : 's'} before trying again.`;
        seconds--;
        setTimeout(updateMessage, 1000);
      } else {
        this.rateLimitMessage = '';
      }
    };
    updateMessage();
  }
}