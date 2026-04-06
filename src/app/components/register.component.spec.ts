import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { RegisterComponent } from './register.component';
import { AuthService, RegistrationResult } from '../services/auth.service';
import { ValidationService, PasswordStrengthResult } from '../services/validation.service';
import { User } from '../services/user.service';

// Mock components for routing tests
@Component({ template: '' })
class MockDashboardComponent { }

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: any;
  let mockAuthService: any;
  let mockValidationService: any;
  let mockRouter: any;

  // Mock user for tests
  const mockUser: User = {
    id: 'test-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    lastLoginAt: new Date()
  };

  // Default validation results
  const validEmailResult = { isValid: true };
  const invalidEmailResult = { isValid: false, error: 'Invalid email format' };
  const strongPasswordResult: PasswordStrengthResult = {
    score: 4,
    feedback: [],
    isValid: true
  };
  const weakPasswordResult: PasswordStrengthResult = {
    score: 2,
    feedback: ['Must contain at least one uppercase letter', 'Must contain at least one special character'],
    isValid: false
  };

  beforeEach(async () => {
    // Create mocks for services
    const authServiceMock = {
      register: vi.fn(),
      isAuthenticated: vi.fn(),
      isEmailAvailable: vi.fn(),
      trackFieldFocus: vi.fn(),
      trackFormSubmission: vi.fn(),
      trackPageView: vi.fn(),
      currentUser$: new BehaviorSubject<User | null>(null),
      isLoading$: new BehaviorSubject<boolean>(false)
    };

    const validationServiceMock = {
      validateEmail: vi.fn(),
      validatePasswordStrength: vi.fn(),
      getPasswordStrengthLabel: vi.fn(),
      getPasswordStrengthColor: vi.fn()
    };

    const routerMock = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ValidationService, useValue: validationServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;

    mockAuthService = TestBed.inject(AuthService);
    mockValidationService = TestBed.inject(ValidationService);
    mockRouter = TestBed.inject(Router);

    // Set up default service behavior
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.isEmailAvailable.mockReturnValue(true);
    mockValidationService.validateEmail.mockReturnValue(validEmailResult);
    mockValidationService.validatePasswordStrength.mockReturnValue(strongPasswordResult);
    mockValidationService.getPasswordStrengthLabel.mockReturnValue('Strong');
    mockValidationService.getPasswordStrengthColor.mockReturnValue('#28a745');
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component.registrationForm.get('email')?.value).toBe('');
      expect(component.registrationForm.get('password')?.value).toBe('');
    });

    it('should track page view on init', () => {
      fixture.detectChanges();
      expect(mockAuthService.trackPageView).toHaveBeenCalled();
    });

    it('should redirect authenticated users to dashboard', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      fixture.detectChanges();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should not redirect unauthenticated users', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      fixture.detectChanges();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should initialize password visibility to false', () => {
      expect(component.passwordVisible).toBe(false);
    });

    it('should start form timer', () => {
      const startTime = Date.now();
      fixture.detectChanges();
      expect(component.formStartTime).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('Email Validation', () => {
    it('should validate email on blur', () => {
      const emailControl = component.registrationForm.get('email')!;
      emailControl.setValue('test@example.com');
      component.onEmailBlur();

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should not validate empty email on blur', () => {
      mockValidationService.validateEmail.calls.reset();
      component.onEmailBlur();
      expect(mockValidationService.validateEmail).not.toHaveBeenCalled();
    });

    it('should check email availability for valid emails', () => {
      mockValidationService.validateEmail.mockReturnValue(validEmailResult);
      mockAuthService.isEmailAvailable.mockReturnValue(true);

      component['validateEmail']('test@example.com');

      expect(mockAuthService.isEmailAvailable).toHaveBeenCalledWith('test@example.com');
      expect(component.emailValidationResult.isValid).toBe(true);
    });

    it('should show error for unavailable email', () => {
      mockValidationService.validateEmail.mockReturnValue(validEmailResult);
      mockAuthService.isEmailAvailable.mockReturnValue(false);

      component['validateEmail']('taken@example.com');

      expect(component.emailValidationResult.isValid).toBe(false);
      expect(component.emailValidationResult.error).toBe('This email address is already registered');
    });

    it('should clear field errors when validation passes', () => {
      component.fieldErrors.email = 'Previous error';
      mockValidationService.validateEmail.mockReturnValue(validEmailResult);

      component['validateEmail']('valid@example.com');

      expect(component.fieldErrors.email).toBeUndefined();
    });

    it('should handle real-time email validation with debouncing', async () => {
      fixture.detectChanges();
      const emailControl = component.registrationForm.get('email')!;

      emailControl.setValue('test@example.com');

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Password Validation', () => {
    it('should validate password strength on input', () => {
      component['validatePassword']('MyStr0ng!Pass');
      expect(mockValidationService.validatePasswordStrength).toHaveBeenCalledWith('MyStr0ng!Pass');
    });

    it('should clear field errors when password validation passes', () => {
      component.fieldErrors.password = 'Previous error';
      mockValidationService.validatePasswordStrength.mockReturnValue(strongPasswordResult);

      component['validatePassword']('StrongP@ss123');

      expect(component.fieldErrors.password).toBeUndefined();
    });

    it('should handle real-time password validation', async () => {
      fixture.detectChanges();
      const passwordControl = component.registrationForm.get('password')!;

      passwordControl.setValue('MyStr0ng!Pass');

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockValidationService.validatePasswordStrength).toHaveBeenCalledWith('MyStr0ng!Pass');
    });

    it('should get correct password strength percentage', () => {
      component.passwordStrengthResult = { score: 3, feedback: [], isValid: true };
      expect(component.getPasswordStrengthPercentage()).toBe(60);

      component.passwordStrengthResult = { score: 5, feedback: [], isValid: true };
      expect(component.getPasswordStrengthPercentage()).toBe(100);
    });

    it('should get correct password strength CSS class', () => {
      component.passwordStrengthResult = { score: 0, feedback: [], isValid: false };
      expect(component.getPasswordStrengthClass()).toBe('');

      component.passwordStrengthResult = { score: 1, feedback: [], isValid: false };
      expect(component.getPasswordStrengthClass()).toBe('strength-weak');

      component.passwordStrengthResult = { score: 2, feedback: [], isValid: false };
      expect(component.getPasswordStrengthClass()).toBe('strength-fair');

      component.passwordStrengthResult = { score: 3, feedback: [], isValid: true };
      expect(component.getPasswordStrengthClass()).toBe('strength-good');

      component.passwordStrengthResult = { score: 4, feedback: [], isValid: true };
      expect(component.getPasswordStrengthClass()).toBe('strength-strong');

      component.passwordStrengthResult = { score: 5, feedback: [], isValid: true };
      expect(component.getPasswordStrengthClass()).toBe('strength-very-strong');
    });
  });

  describe('Form Interactions', () => {
    it('should track email field focus', () => {
      component.onEmailFocus();

      expect(component.emailFocused).toBe(true);
      expect(mockAuthService.trackFieldFocus).toHaveBeenCalledWith('email', {
        has_value: false,
        is_valid: true
      });
    });

    it('should track password field focus', () => {
      component.onPasswordFocus();

      expect(component.passwordFocused).toBe(true);
      expect(component.passwordTouched).toBe(true);
      expect(mockAuthService.trackFieldFocus).toHaveBeenCalledWith('password', {
        has_value: false,
        strength_score: 4
      });
    });

    it('should toggle password visibility', () => {
      expect(component.passwordVisible).toBe(false);

      component.togglePasswordVisibility();
      expect(component.passwordVisible).toBe(true);

      component.togglePasswordVisibility();
      expect(component.passwordVisible).toBe(false);
    });

    it('should handle email blur', () => {
      component.onEmailBlur();
      expect(component.emailFocused).toBe(false);
    });

    it('should handle password blur', () => {
      component.onPasswordBlur();
      expect(component.passwordFocused).toBe(false);
    });
  });

  describe('Form Validation State', () => {
    it('should return true for valid form', () => {
      component.emailValidationResult = validEmailResult;
      component.passwordStrengthResult = strongPasswordResult;
      component.isLoading = false;

      expect(component.isFormValid()).toBe(true);
    });

    it('should return false for invalid email', () => {
      component.emailValidationResult = invalidEmailResult;
      component.passwordStrengthResult = strongPasswordResult;
      component.isLoading = false;

      expect(component.isFormValid()).toBe(false);
    });

    it('should return false for weak password', () => {
      component.emailValidationResult = validEmailResult;
      component.passwordStrengthResult = weakPasswordResult;
      component.isLoading = false;

      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when loading', () => {
      component.emailValidationResult = validEmailResult;
      component.passwordStrengthResult = strongPasswordResult;
      component.isLoading = true;

      expect(component.isFormValid()).toBe(false);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Set up valid form state
      component.emailValidationResult = validEmailResult;
      component.passwordStrengthResult = strongPasswordResult;
      component.registrationForm.get('email')?.setValue('test@example.com');
      component.registrationForm.get('password')?.setValue('MyStr0ng!Pass');
    });

    it('should not submit invalid form', async () => {
      component.emailValidationResult = invalidEmailResult;

      await component.onSubmit();

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should track form submission attempt', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));

      await component.onSubmit();

      expect(mockAuthService.trackFormSubmission).toHaveBeenCalledWith(1, {
        email_valid: true,
        password_valid: true,
        form_valid: true
      });
    });

    it('should call auth service register with correct data', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));

      await component.onSubmit();

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'MyStr0ng!Pass'
      });
    });

    it('should handle successful registration', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));
      spyOn(component, 'showSuccessState' as any);

      await component.onSubmit();

      expect(component['showSuccessState']).toHaveBeenCalled();
      expect(component.submitError).toBe('');
    });

    it('should redirect after successful registration', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));
      vi.useFakeTimers();

      await component.onSubmit();
      jasmine.clock().tick(1500);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
      jasmine.clock().uninstall();
    });

    it('should handle registration failure with general error', async () => {
      const failureResult: RegistrationResult = {
        success: false,
        error: 'Registration failed'
      };
      mockAuthService.register.mockReturnValue(Promise.resolve(failureResult));

      await component.onSubmit();

      expect(component.submitError).toBe('Registration failed');
      expect(component.isLoading).toBe(false);
    });

    it('should handle registration failure with field errors', async () => {
      const failureResult: RegistrationResult = {
        success: false,
        error: 'Validation failed',
        fieldErrors: {
          email: 'Email already exists',
          password: 'Password too weak'
        }
      };
      mockAuthService.register.mockReturnValue(Promise.resolve(failureResult));

      await component.onSubmit();

      expect(component.fieldErrors.email).toBe('Email already exists');
      expect(component.fieldErrors.password).toBe('Password too weak');
      expect(component.emailValidationResult.isValid).toBe(false);
      expect(component.emailValidationResult.error).toBe('Email already exists');
    });

    it('should handle unexpected errors during submission', async () => {
      mockAuthService.register.mockReturnValue(Promise.reject(new Error('Network error')));

      await component.onSubmit();

      expect(component.submitError).toBe('An unexpected error occurred. Please try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should increment submit attempts on each submission', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: false, error: 'Failed' }));

      await component.onSubmit();
      expect(component.submitAttempts).toBe(1);

      await component.onSubmit();
      expect(component.submitAttempts).toBe(2);
    });

    it('should set loading state during submission', async () => {
      let resolvePromise: (value: RegistrationResult) => void;
      const promise = new Promise<RegistrationResult>(resolve => {
        resolvePromise = resolve;
      });
      mockAuthService.register.mockReturnValue(promise);

      const submitPromise = component.onSubmit();
      expect(component.isLoading).toBe(true);

      resolvePromise!({ success: true, user: mockUser });
      await submitPromise;
      expect(component.isLoading).toBe(false);
    });

    it('should mark form as touched when submitting invalid form', async () => {
      component.emailValidationResult = invalidEmailResult;
      spyOn(component, 'markFormGroupTouched' as any);

      await component.onSubmit();

      expect(component['markFormGroupTouched']).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    it('should generate correct ARIA describedby for email field', () => {
      component.emailValidationResult = validEmailResult;
      expect(component.getEmailAriaDescribedBy()).toBe('email-requirements');

      component.emailValidationResult = invalidEmailResult;
      expect(component.getEmailAriaDescribedBy()).toBe('email-requirements email-error');
    });

    it('should generate correct ARIA describedby for password field', () => {
      component.passwordFocused = false;
      component.passwordTouched = false;
      expect(component.getPasswordAriaDescribedBy()).toBe('');

      component.passwordFocused = true;
      expect(component.getPasswordAriaDescribedBy()).toBe('password-requirements password-strength');

      component.passwordTouched = true;
      component.passwordStrengthResult = weakPasswordResult;
      expect(component.getPasswordAriaDescribedBy()).toBe('password-requirements password-strength password-error');
    });

    it('should handle beforeunload event for unsaved changes', () => {
      const mockEvent = { preventDefault: jasmine.createSpy(), returnValue: '' } as any;
      component.registrationForm.markAsDirty();
      mockAuthService.isAuthenticated.mockReturnValue(false);

      component.onBeforeUnload(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBeTruthy();
    });

    it('should not show beforeunload warning for clean form', () => {
      const mockEvent = { preventDefault: jasmine.createSpy(), returnValue: '' } as any;
      component.registrationForm.markAsPristine();

      component.onBeforeUnload(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should not show beforeunload warning for authenticated users', () => {
      const mockEvent = { preventDefault: jasmine.createSpy(), returnValue: '' } as any;
      component.registrationForm.markAsDirty();
      mockAuthService.isAuthenticated.mockReturnValue(true);

      component.onBeforeUnload(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid form submissions', async () => {
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));

      // Trigger multiple rapid submissions
      const promise1 = component.onSubmit();
      const promise2 = component.onSubmit(); // Should not execute due to loading state

      await promise1;
      await promise2;

      // Should only register once due to loading state protection
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should handle navigation after form start', () => {
      const originalStartTime = component.formStartTime;
      fixture.detectChanges();

      // Simulate user navigating away and returning
      component.ngOnDestroy();
      component.formStartTime = Date.now();

      expect(component.formStartTime).toBeGreaterThanOrEqual(originalStartTime);
    });

    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should mark all fields as touched during validation', () => {
      component.registrationForm.get('email')?.setValue('test@example.com');
      component.registrationForm.get('password')?.setValue('password123');

      component['markFormGroupTouched']();

      expect(component.registrationForm.get('email')?.touched).toBe(true);
      expect(component.registrationForm.get('password')?.touched).toBe(true);
    });

    it('should validate fields when marking as touched', () => {
      component.registrationForm.get('email')?.setValue('test@example.com');
      component.registrationForm.get('password')?.setValue('MyStr0ng!Pass');

      component['markFormGroupTouched']();

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockValidationService.validatePasswordStrength).toHaveBeenCalledWith('MyStr0ng!Pass');
    });

    it('should handle empty form values during validation', () => {
      component['markFormGroupTouched']();

      // Should not call validation for empty values
      expect(mockValidationService.validateEmail).not.toHaveBeenCalled();
      expect(mockValidationService.validatePasswordStrength).not.toHaveBeenCalled();
    });

    it('should handle form reset scenarios', () => {
      component.registrationForm.get('email')?.setValue('test@example.com');
      component.registrationForm.get('password')?.setValue('MyStr0ng!Pass');
      component.emailValidationResult = invalidEmailResult;
      component.passwordStrengthResult = weakPasswordResult;
      component.submitError = 'Previous error';

      // Reset form
      component.registrationForm.reset();
      component.emailValidationResult = { isValid: true };
      component.passwordStrengthResult = { score: 0, feedback: [], isValid: false };
      component.submitError = '';

      expect(component.registrationForm.get('email')?.value).toBeFalsy();
      expect(component.registrationForm.get('password')?.value).toBeFalsy();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full registration flow', async () => {
      fixture.detectChanges();

      // User enters email
      const emailInput = fixture.nativeElement.querySelector('#email');
      emailInput.value = 'newuser@example.com';
      emailInput.dispatchEvent(new Event('input'));
      component.onEmailBlur();

      // User enters password
      const passwordInput = fixture.nativeElement.querySelector('#password');
      passwordInput.value = 'MyStr0ng!Pass';
      passwordInput.dispatchEvent(new Event('input'));
      component.onPasswordBlur();

      // Set up successful registration
      mockAuthService.register.mockReturnValue(Promise.resolve({ success: true, user: mockUser }));

      // Submit form
      await component.onSubmit();

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'MyStr0ng!Pass'
      });
    });

    it('should handle progressive validation feedback', async () => {
      fixture.detectChanges();

      // Initially no validation state
      expect(component.emailFocused).toBe(false);
      expect(component.passwordTouched).toBe(false);

      // Focus email field
      component.onEmailFocus();
      expect(component.emailFocused).toBe(true);

      // Focus password field
      component.onPasswordFocus();
      expect(component.passwordFocused).toBe(true);
      expect(component.passwordTouched).toBe(true);

      // Blur fields
      component.onEmailBlur();
      component.onPasswordBlur();
      expect(component.emailFocused).toBe(false);
      expect(component.passwordFocused).toBe(false);
      expect(component.passwordTouched).toBe(true); // Should remain true
    });

    it('should handle autofill scenarios', async () => {
      fixture.detectChanges();

      // Simulate browser autofill
      component.registrationForm.patchValue({
        email: 'autofilled@example.com',
        password: 'AutoFilledP@ss123'
      });

      // Trigger validation manually as autofill might not trigger events
      component['validateEmail']('autofilled@example.com');
      component['validatePassword']('AutoFilledP@ss123');

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('autofilled@example.com');
      expect(mockValidationService.validatePasswordStrength).toHaveBeenCalledWith('AutoFilledP@ss123');
    });
  });
});