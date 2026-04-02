import { Component, OnInit, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsService } from '../../core/services/analytics.service';

export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  @ViewChild('pageTitle') pageTitle!: ElementRef<HTMLHeadingElement>;

  registerForm!: FormGroup;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  duplicateEmailError = signal(false);

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  ngAfterViewInit(): void {
    this.pageTitle?.nativeElement?.focus();
  }

  onSubmit(): void {
    if (this.loading()) return;

    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.duplicateEmailError.set(false);

    const { username, email, password, confirmPassword } = this.registerForm.value;
    this.analytics.track('auth_register_attempt', { email: this.hashEmail(email) });

    this.authService.register({ username, email, password, confirmPassword }).subscribe({
      next: (res) => {
        this.analytics.track('auth_register_success', { userId: res.userId });
        this.loading.set(false);
        this.router.navigate(['/login'], { state: { message: 'Account created. Please log in.' } });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);

        if (err.status === 409) {
          this.duplicateEmailError.set(true);
          this.registerForm.get('email')?.setErrors({ duplicate: true });
        } else if (err.status === 400 && err.error?.details) {
          const details = err.error.details as Record<string, string>;
          for (const [field, message] of Object.entries(details)) {
            const control = this.registerForm.get(field);
            if (control) {
              control.setErrors({ serverError: message });
            }
          }
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect. Please check your connection and try again.');
        } else {
          this.errorMessage.set('Registration failed. Please try again.');
        }

        this.analytics.track('auth_register_failure', {
          errorCode: err.status,
          errorMessage: err.error?.message || this.errorMessage()
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors || !(control.dirty || control.touched)) return null;

    if (control.errors['serverError']) return control.errors['serverError'];
    if (control.errors['required']) {
      const labels: Record<string, string> = { username: 'Username', email: 'Email', password: 'Password', confirmPassword: 'Confirm password' };
      return `${labels[fieldName] || fieldName} is required.`;
    }
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Must be at least ${min} characters.`;
    }
    if (control.errors['maxlength']) {
      return `Must be at most ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['email']) return 'Please enter a valid email address.';
    if (control.errors['duplicate']) return '';  // Handled by duplicateEmailError template
    return null;
  }

  showPasswordMismatch(): boolean {
    const pw = this.registerForm.get('password');
    const cpw = this.registerForm.get('confirmPassword');
    return !!(
      this.registerForm.hasError('passwordMismatch') &&
      pw && pw.dirty && pw.touched &&
      cpw && cpw.dirty && cpw.touched
    );
  }

  private hashEmail(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }
}
