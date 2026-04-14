import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../auth.service';
import { passwordValidator, confirmPasswordValidator, validatePassword, PasswordValidationResult } from '../password.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Create Account</h1>
        <p class="subtitle">Join us to access your personalized profile</p>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
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
              autocomplete="new-password"
              aria-describedby="password-requirements"
            />

            <!-- Password requirements with real-time feedback -->
            <div id="password-requirements" class="password-requirements" *ngIf="registerForm.get('password')?.value">
              <div class="requirement" [class.valid]="passwordValidation.minLength">
                <span class="check-icon" [attr.aria-label]="passwordValidation.minLength ? 'Requirement met' : 'Requirement not met'">
                  {{ passwordValidation.minLength ? '✓' : '○' }}
                </span>
                At least 8 characters
              </div>
              <div class="requirement" [class.valid]="passwordValidation.hasUppercase">
                <span class="check-icon" [attr.aria-label]="passwordValidation.hasUppercase ? 'Requirement met' : 'Requirement not met'">
                  {{ passwordValidation.hasUppercase ? '✓' : '○' }}
                </span>
                One uppercase letter
              </div>
              <div class="requirement" [class.valid]="passwordValidation.hasNumber">
                <span class="check-icon" [attr.aria-label]="passwordValidation.hasNumber ? 'Requirement met' : 'Requirement not met'">
                  {{ passwordValidation.hasNumber ? '✓' : '○' }}
                </span>
                One number
              </div>
              <div class="requirement" [class.valid]="passwordValidation.hasSpecialChar">
                <span class="check-icon" [attr.aria-label]="passwordValidation.hasSpecialChar ? 'Requirement met' : 'Requirement not met'">
                  {{ passwordValidation.hasSpecialChar ? '✓' : '○' }}
                </span>
                One special character
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="sr-only">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              class="form-control"
              [class.error]="isFieldInvalid('confirmPassword')"
              placeholder="Confirm password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              aria-describedby="confirm-password-error"
            />
            <div id="confirm-password-error" class="error-message" *ngIf="isFieldInvalid('confirmPassword')">
              Passwords don't match
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="registerForm.invalid || loading"
            [attr.aria-label]="loading ? 'Creating account...' : 'Create account'"
          >
            <span *ngIf="loading" class="spinner" aria-hidden="true"></span>
            {{ loading ? 'Creating Account...' : 'Create Account' }}
          </button>

          <div class="error-message" *ngIf="errorMessage" role="alert">
            {{ errorMessage }}
          </div>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in here</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  passwordValidation: PasswordValidationResult = {
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isValid: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupPasswordValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordValidator()]],
      confirmPassword: ['', [Validators.required, confirmPasswordValidator('password')]]
    });
  }

  private setupPasswordValidation(): void {
    const passwordControl = this.registerForm.get('password');

    if (passwordControl) {
      passwordControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(password => {
          this.passwordValidation = validatePassword(password || '');
        });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.registerForm.value;

    this.authService.register({ email, password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Navigate to profile with welcome message
          this.router.navigate(['/profile'], {
            queryParams: { welcome: 'true' }
          });
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.message || 'Registration failed. Please try again.';
        }
      });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }
}