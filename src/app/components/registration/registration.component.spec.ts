import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { RegistrationComponent } from './registration.component';
import { PasswordStrengthComponent } from '../password-strength/password-strength.component';
import { ValidationMessageComponent } from '../validation-message/validation-message.component';
import { RegistrationService } from '../../services/registration.service';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let registrationService: jasmine.SpyObj<RegistrationService>;

  beforeEach(async () => {
    const registrationServiceSpy = jasmine.createSpyObj('RegistrationService', ['register']);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        RegistrationComponent,
        PasswordStrengthComponent,
        ValidationMessageComponent
      ],
      providers: [
        { provide: RegistrationService, useValue: registrationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    registrationService = TestBed.inject(RegistrationService) as jasmine.SpyObj<RegistrationService>;

    fixture.detectChanges();
  });

  describe('Form Initialization', () => {
    it('should render with all fields empty and submit button disabled', () => {
      // Given: User loads registration page
      // When: Form renders
      expect(component.registrationForm.get('email')?.value).toBe('');
      expect(component.registrationForm.get('password')?.value).toBe('');
      expect(component.registrationForm.get('confirmPassword')?.value).toBe('');
      expect(component.registrationForm.get('acceptTerms')?.value).toBeFalsy();

      // Then: Submit button is disabled
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.disabled).toBe(true);
    });

    it('should have proper form structure with required fields', () => {
      expect(component.registrationForm.get('email')).toBeTruthy();
      expect(component.registrationForm.get('password')).toBeTruthy();
      expect(component.registrationForm.get('confirmPassword')).toBeTruthy();
      expect(component.registrationForm.get('acceptTerms')).toBeTruthy();
    });

    it('should initialize with proper ARIA labels and accessibility attributes', () => {
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));

      expect(emailInput.nativeElement.getAttribute('aria-label')).toContain('Email');
      expect(passwordInput.nativeElement.getAttribute('aria-label')).toContain('Password');
    });
  });

  describe('Email Validation', () => {
    it('should show red error message when invalid email loses focus', () => {
      // Given: User enters invalid email
      const emailControl = component.registrationForm.get('email');
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));

      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();

      // When: Field loses focus (blur event)
      emailInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      // Then: Red error message appears below email field
      const errorMessage = fixture.debugElement.query(By.css('[data-testid="email-error"]'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('valid email');
      expect(errorMessage.nativeElement.classList).toContain('error');
    });

    it('should show green checkmark when valid email loses focus', () => {
      // Given: User enters valid email
      const emailControl = component.registrationForm.get('email');
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));

      emailControl?.setValue('test@example.com');
      emailControl?.markAsTouched();

      // When: Field loses focus
      emailInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      // Then: Green checkmark appears next to email field
      const successIndicator = fixture.debugElement.query(By.css('[data-testid="email-success"]'));
      expect(successIndicator).toBeTruthy();
      expect(successIndicator.nativeElement.classList).toContain('success');
    });

    it('should handle edge case of email with special characters', () => {
      const emailControl = component.registrationForm.get('email');
      emailControl?.setValue('test+tag@example-domain.co.uk');
      emailControl?.markAsTouched();
      fixture.detectChanges();

      expect(emailControl?.valid).toBe(true);
    });

    it('should validate email format immediately on blur', () => {
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));
      const emailControl = component.registrationForm.get('email');

      emailInput.nativeElement.value = 'partial@';
      emailInput.nativeElement.dispatchEvent(new Event('input'));
      emailInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(emailControl?.invalid).toBe(true);
    });
  });

  describe('Password Validation and Strength Meter', () => {
    it('should update password strength meter within 300ms with debouncing', fakeAsync(() => {
      // Given: User types password
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));
      const passwordControl = component.registrationForm.get('password');

      // When: Input changes
      passwordControl?.setValue('weak');
      passwordInput.nativeElement.dispatchEvent(new Event('input'));

      // Fast typing should not trigger immediate update
      tick(100);
      expect(component.currentPasswordStrength).toBe('');

      // Then: Password strength meter updates within 300ms
      tick(250);
      fixture.detectChanges();
      expect(component.currentPasswordStrength).toBe('weak');

      // Test stronger password
      passwordControl?.setValue('StrongP@ssw0rd123');
      passwordInput.nativeElement.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();
      expect(component.currentPasswordStrength).toBe('strong');
    }));

    it('should show visual indicators for weak, medium, and strong passwords', () => {
      const passwordControl = component.registrationForm.get('password');

      // Weak password
      passwordControl?.setValue('123');
      component.updatePasswordStrength();
      fixture.detectChanges();

      const weakIndicator = fixture.debugElement.query(By.css('[data-testid="password-strength-weak"]'));
      expect(weakIndicator).toBeTruthy();

      // Medium password
      passwordControl?.setValue('Password123');
      component.updatePasswordStrength();
      fixture.detectChanges();

      const mediumIndicator = fixture.debugElement.query(By.css('[data-testid="password-strength-medium"]'));
      expect(mediumIndicator).toBeTruthy();

      // Strong password
      passwordControl?.setValue('StrongP@ssw0rd123!');
      component.updatePasswordStrength();
      fixture.detectChanges();

      const strongIndicator = fixture.debugElement.query(By.css('[data-testid="password-strength-strong"]'));
      expect(strongIndicator).toBeTruthy();
    });

    it('should show password requirements helper text', () => {
      const helperText = fixture.debugElement.query(By.css('[data-testid="password-requirements"]'));
      expect(helperText).toBeTruthy();
      expect(helperText.nativeElement.textContent).toContain('minimum 8 characters');
      expect(helperText.nativeElement.textContent).toContain('numbers');
      expect(helperText.nativeElement.textContent).toContain('special characters');
    });

    it('should toggle password visibility', () => {
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));
      const toggleButton = fixture.debugElement.query(By.css('[data-testid="password-toggle"]'));

      expect(passwordInput.nativeElement.type).toBe('password');

      toggleButton.nativeElement.click();
      fixture.detectChanges();

      expect(passwordInput.nativeElement.type).toBe('text');

      toggleButton.nativeElement.click();
      fixture.detectChanges();

      expect(passwordInput.nativeElement.type).toBe('password');
    });

    it('should handle copy-paste password scenarios', () => {
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));
      const passwordControl = component.registrationForm.get('password');

      // Simulate paste event
      const pasteEvent = new ClipboardEvent('paste');
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => 'PastedP@ssw0rd123'
        }
      });

      passwordInput.nativeElement.dispatchEvent(pasteEvent);
      passwordControl?.setValue('PastedP@ssw0rd123');
      fixture.detectChanges();

      expect(passwordControl?.valid).toBe(true);
    });
  });

  describe('Password Confirmation Validation', () => {
    it('should show error message when passwords do not match on blur', () => {
      // Given: User enters mismatched passwords
      const passwordControl = component.registrationForm.get('password');
      const confirmPasswordControl = component.registrationForm.get('confirmPassword');
      const confirmPasswordInput = fixture.debugElement.query(By.css('input[formControlName="confirmPassword"]'));

      passwordControl?.setValue('password123');
      confirmPasswordControl?.setValue('different123');
      confirmPasswordControl?.markAsTouched();

      // When: Confirm password field loses focus
      confirmPasswordInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      // Then: Error message displays indicating passwords don't match
      const errorMessage = fixture.debugElement.query(By.css('[data-testid="confirm-password-error"]'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain("don't match");
    });

    it('should not show error when passwords match', () => {
      const passwordControl = component.registrationForm.get('password');
      const confirmPasswordControl = component.registrationForm.get('confirmPassword');
      const confirmPasswordInput = fixture.debugElement.query(By.css('input[formControlName="confirmPassword"]'));

      passwordControl?.setValue('password123');
      confirmPasswordControl?.setValue('password123');
      confirmPasswordControl?.markAsTouched();

      confirmPasswordInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('[data-testid="confirm-password-error"]'));
      expect(errorMessage).toBeFalsy();
    });

    it('should validate password confirmation in real-time when password changes', () => {
      const passwordControl = component.registrationForm.get('password');
      const confirmPasswordControl = component.registrationForm.get('confirmPassword');

      // Set matching passwords
      passwordControl?.setValue('test123');
      confirmPasswordControl?.setValue('test123');
      confirmPasswordControl?.markAsTouched();
      fixture.detectChanges();

      expect(confirmPasswordControl?.valid).toBe(true);

      // Change password to create mismatch
      passwordControl?.setValue('test456');
      fixture.detectChanges();

      expect(confirmPasswordControl?.valid).toBe(false);
    });
  });

  describe('Terms and Conditions', () => {
    it('should require terms checkbox to be checked before enabling submit', () => {
      // Fill valid data but leave terms unchecked
      component.registrationForm.patchValue({
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123',
        confirmPassword: 'StrongP@ssw0rd123',
        acceptTerms: false
      });

      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.disabled).toBe(true);
    });

    it('should enable submit when all validations pass and terms accepted', () => {
      // Given: All validations pass and terms accepted
      component.registrationForm.patchValue({
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123',
        confirmPassword: 'StrongP@ssw0rd123',
        acceptTerms: true
      });

      fixture.detectChanges();

      // When: Form is valid
      // Then: Submit button is enabled
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.disabled).toBe(false);
    });

    it('should have links to Terms of Service and Privacy Policy', () => {
      const termsLink = fixture.debugElement.query(By.css('[data-testid="terms-link"]'));
      const privacyLink = fixture.debugElement.query(By.css('[data-testid="privacy-link"]'));

      expect(termsLink).toBeTruthy();
      expect(privacyLink).toBeTruthy();
      expect(termsLink.nativeElement.href).toContain('terms');
      expect(privacyLink.nativeElement.href).toContain('privacy');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Setup valid form
      component.registrationForm.patchValue({
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123',
        confirmPassword: 'StrongP@ssw0rd123',
        acceptTerms: true
      });
      fixture.detectChanges();
    });

    it('should show loading state and disable form during submission', fakeAsync(() => {
      // Given: Valid form data
      registrationService.register.and.returnValue(of({ success: true }).pipe(delay(1000)));

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));

      // When: User clicks submit
      submitButton.nativeElement.click();
      fixture.detectChanges();

      // Then: Button shows loading state and form becomes disabled
      expect(component.isSubmitting).toBe(true);
      expect(submitButton.nativeElement.disabled).toBe(true);
      expect(submitButton.nativeElement.textContent).toContain('Creating Account');

      const loadingSpinner = fixture.debugElement.query(By.css('[data-testid="loading-spinner"]'));
      expect(loadingSpinner).toBeTruthy();

      tick(1000);
      fixture.detectChanges();

      expect(component.isSubmitting).toBe(false);
    }));

    it('should show confirmation message and redirect on successful submission', fakeAsync(() => {
      // Given: Successful API response
      registrationService.register.and.returnValue(of({
        success: true,
        userId: '12345'
      }).pipe(delay(500)));

      spyOn(component, 'redirectToDashboard');

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));

      // When: Form submission succeeds
      submitButton.nativeElement.click();
      tick(500);
      fixture.detectChanges();

      // Then: Confirmation message displays
      const confirmationMessage = fixture.debugElement.query(By.css('[data-testid="success-message"]'));
      expect(confirmationMessage).toBeTruthy();
      expect(confirmationMessage.nativeElement.textContent).toContain('Account created successfully');

      // And: User redirects to dashboard after 1 second
      tick(1000);
      expect(component.redirectToDashboard).toHaveBeenCalled();
    }));

    it('should display error message above form and focus first error field on failure', fakeAsync(() => {
      // Given: API returns error
      registrationService.register.and.returnValue(throwError(() => ({
        error: {
          message: 'Email already exists',
          field: 'email'
        }
      })));

      spyOn(component, 'focusFirstErrorField');

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));

      // When: Form submission fails
      submitButton.nativeElement.click();
      tick(100);
      fixture.detectChanges();

      // Then: Error message displays above form
      const errorMessage = fixture.debugElement.query(By.css('[data-testid="submission-error"]'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Email already exists');

      // And: Focus moves to first error field
      expect(component.focusFirstErrorField).toHaveBeenCalled();
    }));

    it('should handle network timeout errors', fakeAsync(() => {
      registrationService.register.and.returnValue(throwError(() => ({
        error: { message: 'Network timeout' }
      })));

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();
      tick(100);
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('[data-testid="submission-error"]'));
      expect(errorMessage.nativeElement.textContent).toContain('Network timeout');
    }));

    it('should reset form state after error for retry', fakeAsync(() => {
      registrationService.register.and.returnValue(throwError(() => ({
        error: { message: 'Server error' }
      })));

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();
      tick(100);
      fixture.detectChanges();

      expect(component.isSubmitting).toBe(false);
      expect(submitButton.nativeElement.disabled).toBe(false);
    }));
  });

  describe('Edge Cases and Browser Compatibility', () => {
    it('should handle browser autofill validation triggers', () => {
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));

      // Simulate autofill
      emailInput.nativeElement.value = 'autofilled@example.com';
      emailInput.nativeElement.dispatchEvent(new Event('input'));
      emailInput.nativeElement.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.registrationForm.get('email')?.valid).toBe(true);
    });

    it('should handle session expiration during form completion', fakeAsync(() => {
      registrationService.register.and.returnValue(throwError(() => ({
        error: { message: 'Session expired', code: 401 }
      })));

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      submitButton.nativeElement.click();
      tick(100);
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('[data-testid="submission-error"]'));
      expect(errorMessage.nativeElement.textContent).toContain('Session expired');
    }));

    it('should maintain form data when switching between fields', () => {
      const formData = {
        email: 'test@example.com',
        password: 'TestP@ssw0rd123',
        confirmPassword: 'TestP@ssw0rd123'
      };

      component.registrationForm.patchValue(formData);

      // Simulate switching between fields
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));

      emailInput.nativeElement.focus();
      passwordInput.nativeElement.focus();
      emailInput.nativeElement.blur();

      expect(component.registrationForm.value.email).toBe(formData.email);
      expect(component.registrationForm.value.password).toBe(formData.password);
    });
  });

  describe('Accessibility and Screen Reader Support', () => {
    it('should announce validation changes to screen readers', () => {
      const emailControl = component.registrationForm.get('email');
      emailControl?.setValue('invalid');
      emailControl?.markAsTouched();
      fixture.detectChanges();

      const ariaLiveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(ariaLiveRegion).toBeTruthy();
    });

    it('should use color plus other indicators for validation status', () => {
      const emailControl = component.registrationForm.get('email');
      emailControl?.setValue('test@example.com');
      emailControl?.markAsTouched();
      fixture.detectChanges();

      const successIndicator = fixture.debugElement.query(By.css('[data-testid="email-success"]'));
      expect(successIndicator.nativeElement.getAttribute('aria-label')).toContain('Valid');

      const icon = successIndicator.query(By.css('.icon'));
      expect(icon).toBeTruthy();
    });

    it('should provide proper keyboard navigation', () => {
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));
      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]'));

      emailInput.nativeElement.focus();

      // Simulate tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      emailInput.nativeElement.dispatchEvent(tabEvent);

      expect(document.activeElement).toBe(passwordInput.nativeElement);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should maintain proper field spacing on mobile screens', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const formContainer = fixture.debugElement.query(By.css('.registration-form'));
      const computedStyle = window.getComputedStyle(formContainer.nativeElement);

      // Should have appropriate padding/margins for mobile
      expect(parseFloat(computedStyle.padding)).toBeGreaterThan(0);
    });
  });

  describe('Performance Considerations', () => {
    it('should debounce password strength calculations', fakeAsync(() => {
      const passwordControl = component.registrationForm.get('password');
      spyOn(component, 'calculatePasswordStrength');

      // Rapid typing
      passwordControl?.setValue('a');
      tick(50);
      passwordControl?.setValue('ab');
      tick(50);
      passwordControl?.setValue('abc');
      tick(50);

      // Should not call calculation yet
      expect(component.calculatePasswordStrength).not.toHaveBeenCalled();

      // Wait for debounce period
      tick(300);
      expect(component.calculatePasswordStrength).toHaveBeenCalledTimes(1);
    }));

    it('should not block UI during password strength calculation', fakeAsync(() => {
      const passwordControl = component.registrationForm.get('password');

      passwordControl?.setValue('ComplexP@ssw0rd123WithManyCharacters!');
      tick(300);
      fixture.detectChanges();

      // UI should remain responsive
      expect(component.isSubmitting).toBe(false);
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.disabled).toBe(false);
    }));
  });
});