import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);
  private readonly elementRef = inject(ElementRef);

  @ViewChild('pageTitle') pageTitle!: ElementRef<HTMLHeadingElement>;

  loginForm!: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  sessionExpiredMessage = signal<string | null>(null);

  private returnUrl = '/dashboard';
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionDismissTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    // Validate returnUrl starts with '/' and not '//' to prevent open redirects
    this.returnUrl = rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') ? rawReturnUrl : '/dashboard';

    const stateMessage = history.state?.message;
    if (stateMessage) {
      this.successMessage.set(stateMessage);
      this.dismissTimer = setTimeout(() => this.successMessage.set(null), 5000);
    }

    const sessionExpired = this.route.snapshot.queryParamMap.get('sessionExpired');
    if (sessionExpired === 'true') {
      this.sessionExpiredMessage.set('Your session has expired. Please log in again.');
      this.sessionDismissTimer = setTimeout(() => this.sessionExpiredMessage.set(null), 5000);
    }
  }

  ngAfterViewInit(): void {
    this.pageTitle?.nativeElement?.focus();
  }

  ngOnDestroy(): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    if (this.sessionDismissTimer) clearTimeout(this.sessionDismissTimer);
  }

  onSubmit(): void {
    if (this.loading()) return;

    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    this.analytics.track('auth_login_attempt', { email: this.hashEmail(email) });

    this.authService.login({ email, password }).subscribe({
      next: (user) => {
        this.analytics.track('auth_login_success', { userId: user.id });
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loginForm.get('password')?.reset();

        if (err.status === 429) {
          this.errorMessage.set('Too many attempts. Please wait a moment and try again.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect. Please check your connection and try again.');
        } else {
          this.errorMessage.set('Invalid email or password');
        }

        this.analytics.track('auth_login_failure', {
          errorCode: err.status,
          errorMessage: this.errorMessage(),
          email: this.hashEmail(email)
        });
      }
    });
  }

  dismissSuccess(): void {
    this.successMessage.set(null);
  }

  dismissSessionExpired(): void {
    this.sessionExpiredMessage.set(null);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private hashEmail(email: string): string {
    // Simple hash for analytics — not cryptographic
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }
}
