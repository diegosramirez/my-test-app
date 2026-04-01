import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { trackEvent } from '../../shared/utils/analytics';

function sanitizeReturnUrl(url: string): string {
  if (url && url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/dashboard';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;

  protected readonly returnUrl: string;

  private subscription?: Subscription;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.returnUrl = sanitizeReturnUrl(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');
    this.form = this.fb.group({
      email: ['', { validators: [Validators.required, Validators.email], updateOn: 'blur' }],
      password: ['', { validators: [Validators.required, Validators.minLength(8)], updateOn: 'blur' }]
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.form.disable();

    const { email, password } = this.form.getRawValue();

    this.timeoutId = setTimeout(() => {
      this.loading = false;
      this.form.enable();
      this.errorMessage = 'Request timed out. Please try again.';
    }, 10000);

    this.subscription = this.auth.login(email, password).subscribe({
      next: () => {
        clearTimeout(this.timeoutId);
        this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        clearTimeout(this.timeoutId);
        this.loading = false;
        this.form.enable();
        this.errorMessage = this.mapError(err);
        trackEvent('auth_login_failure', { reason: this.errorMessage });
      }
    });
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to connect. Please check your connection and try again.';
    }
    if (err.status === 401) {
      return 'Invalid email or password';
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait and try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
