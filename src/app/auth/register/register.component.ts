import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnDestroy {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

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
      name: ['', { validators: [Validators.required], updateOn: 'blur' }],
      email: ['', { validators: [Validators.required, Validators.email], updateOn: 'blur' }],
      password: ['', { validators: [Validators.required, Validators.minLength(8)], updateOn: 'blur' }],
      confirmPassword: ['', { validators: [Validators.required], updateOn: 'blur' }]
    }, { validators: [RegisterComponent.passwordMatchValidator] });
  }

  static passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.form.disable();

    const { name, email, password } = this.form.getRawValue();

    this.timeoutId = setTimeout(() => {
      this.loading = false;
      this.form.enable();
      this.errorMessage = 'Request timed out. Please try again.';
    }, 10000);

    this.subscription = this.auth.register(name, email, password).subscribe({
      next: () => {
        clearTimeout(this.timeoutId);
        this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        clearTimeout(this.timeoutId);
        this.loading = false;
        this.form.enable();
        this.errorMessage = this.mapError(err);
        trackEvent('auth_register_failure', { reason: this.errorMessage });
      }
    });
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to connect. Please check your connection and try again.';
    }
    if (err.status === 409) {
      return 'Email already in use';
    }
    if (err.status === 422 && err.error?.details?.length) {
      return err.error.details.map((d: { field: string; message: string }) => d.message).join('. ');
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait and try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
