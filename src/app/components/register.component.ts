import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { AuthService, RegistrationRequest } from '../services/auth.service';
import { ValidationService, PasswordStrengthResult } from '../services/validation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registrationForm: FormGroup;
  isLoading = false;
  submitAttempts = 0;
  passwordVisible = false;
  formStartTime: number = Date.now();

  // Validation states
  emailValidationResult: { isValid: boolean; error?: string } = { isValid: true };
  passwordStrengthResult: PasswordStrengthResult = {
    score: 0,
    feedback: [],
    isValid: false
  };

  // Focus states for progressive disclosure
  emailFocused = false;
  passwordFocused = false;
  passwordTouched = false;

  // Error states
  submitError: string = '';
  fieldErrors: { email?: string; password?: string } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private validationService: ValidationService,
    private router: Router
  ) {
    this.registrationForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeValidation();
    this.trackPageView();

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']); // Assuming a dashboard route exists
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create reactive form with initial validation
   */
  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Initialize debounced real-time validation
   */
  private initializeValidation(): void {
    // Email validation with 300ms debounce
    this.registrationForm.get('email')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(email => {
        this.validateEmail(email);
      });

    // Password validation with immediate feedback
    this.registrationForm.get('password')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(password => {
        this.validatePassword(password);
      });
  }

  /**
   * Validate email with comprehensive checks
   */
  private validateEmail(email: string): void {
    this.emailValidationResult = this.validationService.validateEmail(email);

    // Clear field error if validation passes
    if (this.emailValidationResult.isValid) {
      delete this.fieldErrors.email;
    }

    // Check for duplicate email if validation passes
    if (this.emailValidationResult.isValid && email) {
      if (!this.authService.isEmailAvailable(email)) {
        this.emailValidationResult = {
          isValid: false,
          error: 'This email address is already registered'
        };
      }
    }
  }

  /**
   * Validate password strength with detailed feedback
   */
  private validatePassword(password: string): void {
    this.passwordStrengthResult = this.validationService.validatePasswordStrength(password);

    // Clear field error if validation passes
    if (this.passwordStrengthResult.isValid) {
      delete this.fieldErrors.password;
    }
  }

  /**
   * Handle email field focus
   */
  onEmailFocus(): void {
    this.emailFocused = true;
    this.authService.trackFieldFocus('email', {
      has_value: !!this.registrationForm.get('email')?.value,
      is_valid: this.emailValidationResult.isValid
    });
  }

  /**
   * Handle email field blur
   */
  onEmailBlur(): void {
    this.emailFocused = false;
    const email = this.registrationForm.get('email')?.value;
    if (email) {
      this.validateEmail(email);
    }
  }

  /**
   * Handle password field focus
   */
  onPasswordFocus(): void {
    this.passwordFocused = true;
    this.passwordTouched = true;
    this.authService.trackFieldFocus('password', {
      has_value: !!this.registrationForm.get('password')?.value,
      strength_score: this.passwordStrengthResult.score
    });
  }

  /**
   * Handle password field blur
   */
  onPasswordBlur(): void {
    this.passwordFocused = false;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  /**
   * Get password strength CSS class
   */
  getPasswordStrengthClass(): string {
    const score = this.passwordStrengthResult.score;
    if (score === 0) return '';
    if (score <= 1) return 'strength-weak';
    if (score <= 2) return 'strength-fair';
    if (score <= 3) return 'strength-good';
    if (score <= 4) return 'strength-strong';
    return 'strength-very-strong';
  }

  /**
   * Get password strength percentage for progress bar
   */
  getPasswordStrengthPercentage(): number {
    return (this.passwordStrengthResult.score / 5) * 100;
  }

  /**
   * Check if form is valid for submission
   */
  isFormValid(): boolean {
    return this.emailValidationResult.isValid &&
           this.passwordStrengthResult.isValid &&
           !this.isLoading;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.submitAttempts++;
      this.isLoading = true;
      this.submitError = '';
      this.fieldErrors = {};

      // Track submission attempt
      this.authService.trackFormSubmission(this.submitAttempts, {
        email_valid: this.emailValidationResult.isValid,
        password_valid: this.passwordStrengthResult.isValid,
        form_valid: this.isFormValid()
      });

      // Prepare registration data
      const registrationData: RegistrationRequest = {
        email: this.registrationForm.get('email')?.value?.trim(),
        password: this.registrationForm.get('password')?.value
      };

      // Attempt registration
      const result = await this.authService.register(registrationData);

      if (result.success) {
        // Calculate completion time
        const completionTime = Date.now() - this.formStartTime;

        // Show success state briefly before redirect
        this.showSuccessState();

        // Redirect to dashboard after brief delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);

      } else {
        // Handle registration failure
        this.submitError = result.error || 'Registration failed. Please try again.';

        if (result.fieldErrors) {
          this.fieldErrors = result.fieldErrors;

          // Re-validate fields to show errors
          if (result.fieldErrors.email) {
            this.emailValidationResult = {
              isValid: false,
              error: result.fieldErrors.email
            };
          }

          if (result.fieldErrors.password) {
            this.passwordStrengthResult = {
              ...this.passwordStrengthResult,
              isValid: false,
              feedback: [result.fieldErrors.password]
            };
          }
        }
      }

    } catch (error) {
      console.error('Registration submission failed:', error);
      this.submitError = 'An unexpected error occurred. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Show success state with visual feedback
   */
  private showSuccessState(): void {
    // This could trigger a success animation or notification
    console.log('Registration successful! Redirecting...');
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      control?.markAsTouched();
    });

    // Force validation check
    const email = this.registrationForm.get('email')?.value;
    const password = this.registrationForm.get('password')?.value;

    if (email) this.validateEmail(email);
    if (password) this.validatePassword(password);
  }

  /**
   * Track page view for analytics
   */
  private trackPageView(): void {
    this.authService.trackPageView();
  }

  /**
   * Handle navigation away from form (for potential analytics)
   */
  @HostListener('beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.registrationForm.dirty && !this.authService.isAuthenticated()) {
      // Show browser confirmation dialog
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Your registration progress will be lost.';
    }
  }

  /**
   * Get ARIA describedby for email field
   */
  getEmailAriaDescribedBy(): string {
    const ids = ['email-requirements'];
    if (this.emailValidationResult.error) {
      ids.push('email-error');
    }
    return ids.join(' ');
  }

  /**
   * Get ARIA describedby for password field
   */
  getPasswordAriaDescribedBy(): string {
    const ids: string[] = [];
    if (this.passwordFocused || this.passwordTouched) {
      ids.push('password-requirements');
      ids.push('password-strength');
    }
    if (!this.passwordStrengthResult.isValid && this.passwordTouched) {
      ids.push('password-error');
    }
    return ids.join(' ');
  }

  /**
   * Password requirement validation methods
   */
  hasMinLength(): boolean {
    const password = this.registrationForm.get('password')?.value || '';
    return password.length >= 8;
  }

  hasLowercase(): boolean {
    const password = this.registrationForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  hasUppercase(): boolean {
    const password = this.registrationForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.registrationForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  hasSpecialChar(): boolean {
    const password = this.registrationForm.get('password')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  }

  /**
   * Get password strength label for display
   */
  getPasswordStrengthLabel(score: number): string {
    return this.validationService.getPasswordStrengthLabel(score);
  }
}