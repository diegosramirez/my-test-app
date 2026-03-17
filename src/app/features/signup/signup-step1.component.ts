import { Component, inject, signal, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { NormalizedApiError, FieldError } from '../../models/api-error.model';
import { toCamelCase } from '../../utils/case-transform.util';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmation = control.get('passwordConfirmation');
  if (!password || !confirmation) return null;
  if (password.value !== confirmation.value) {
    return { passwordMismatch: true };
  }
  return null;
}

function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  if (typeof control.value === 'string' && control.value.trim().length === 0 && control.value.length > 0) {
    return { blank: true };
  }
  return null;
}

@Component({
  selector: 'app-signup-step1',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup-step1.component.html',
})
export class SignupStep1Component {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly router = inject(Router);

  readonly confirmationInput = viewChild<ElementRef<HTMLInputElement>>('confirmationInput');

  readonly submitting = signal(false);
  readonly serverErrors = signal<FieldError[]>([]);

  readonly form: FormGroup = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), notBlankValidator]],
      passwordConfirmation: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  getFieldError(field: string): string {
    // Server errors use snake_case field names; convert to camelCase for matching
    const serverErr = this.serverErrors().find((e) => toCamelCase(e.field) === field || e.field === field);
    if (serverErr) return serverErr.message;

    const control = this.form.get(field);
    if (!control || !control.touched) return '';

    if (control.errors) {
      if (field === 'email') {
        if (control.errors['required']) return 'Email is required';
        if (control.errors['email']) return 'Invalid email format';
        if (control.errors['maxlength']) return 'Email must be at most 255 characters';
      }

      if (field === 'password') {
        if (control.errors['required']) return 'Password is required';
        if (control.errors['blank']) return 'Password cannot be blank';
        if (control.errors['minlength']) return 'Password must be between 8 and 128 characters';
        if (control.errors['maxlength']) return 'Password must be between 8 and 128 characters';
      }

      if (field === 'passwordConfirmation') {
        if (control.errors['required']) return 'Password confirmation is required';
      }
    }

    if (field === 'passwordConfirmation' && this.form.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }

    return '';
  }

  getGeneralError(): string {
    const general = this.serverErrors().find((e) => e.field === 'general');
    return general?.message ?? '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.serverErrors.set([]);

    if (this.form.invalid) {
      if (this.form.errors?.['passwordMismatch']) {
        this.analyticsService.trackSignupValidationFailed('mismatch');
      }
      const pw = this.form.get('password');
      if (pw?.errors?.['blank']) {
        this.analyticsService.trackSignupValidationFailed('whitespace_only');
      }
      if (pw?.errors?.['minlength'] || pw?.errors?.['maxlength']) {
        this.analyticsService.trackSignupValidationFailed('length');
      }
      const email = this.form.get('email');
      if (email?.errors?.['email'] || email?.errors?.['maxlength']) {
        this.analyticsService.trackSignupValidationFailed('format');
      }
      return;
    }

    this.submitting.set(true);
    const { email, password, passwordConfirmation } = this.form.value as {
      email: string;
      password: string;
      passwordConfirmation: string;
    };

    this.analyticsService.trackSignupAttempted(email, password.length);

    this.authService
      .signupStep1({ email, password, passwordConfirmation })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.analyticsService.trackSignupCompleted(response.userId, response.step);
          void this.router.navigate(['/signup/step2']);
        },
        error: (err: NormalizedApiError) => {
          this.submitting.set(false);
          this.serverErrors.set(err.errors);

          if (err.status === 429) {
            const retrySeconds = err.retryAfter;
            if (retrySeconds) {
              this.serverErrors.set([
                { field: 'general', message: `Too many signup attempts. Please try again in ${retrySeconds} seconds.` },
              ]);
            }
            this.analyticsService.trackRateLimitExceeded(0);
          } else {
            for (const e of err.errors) {
              if (e.field === 'password_confirmation' || e.message.toLowerCase().includes('match')) {
                this.analyticsService.trackSignupValidationFailed('mismatch');
                this.form.get('passwordConfirmation')?.reset();
                const inputEl = this.confirmationInput();
                if (inputEl) {
                  inputEl.nativeElement.focus();
                }
              }
            }
          }
        },
      });
  }
}
