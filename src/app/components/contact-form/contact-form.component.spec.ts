import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError, delay } from 'rxjs';
import { vi } from 'vitest';
import { ContactFormComponent } from './contact-form.component';
import { ContactService } from '../../services/contact.service';
import { ContactFormData, FormSubmissionResponse } from '../../interfaces/contact-form.interfaces';

describe('ContactFormComponent', () => {
  let component: ContactFormComponent;
  let fixture: ComponentFixture<ContactFormComponent>;
  let mockContactService: any;
  let compiled: HTMLElement;

  const mockSuccessResponse: FormSubmissionResponse = {
    success: true,
    message: 'Thank you for your message! We\'ll get back to you soon.'
  };

  const mockErrorResponse: FormSubmissionResponse = {
    success: false,
    message: 'Please check your input and try again.',
    errors: {
      email: ['Please enter a valid email address']
    }
  };

  const mockNetworkErrorResponse: FormSubmissionResponse = {
    success: false,
    message: 'Network error. Please check your connection and try again.'
  };

  const validFormData: ContactFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    message: 'This is a detailed message about my inquiry that meets the minimum character requirements.'
  };

  beforeEach(async () => {
    mockContactService = {
      submitContactForm: vi.fn(),
      checkNetworkStatus: vi.fn(),
      simulateSubmission: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, ReactiveFormsModule],
      providers: [
        { provide: ContactService, useValue: mockContactService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize reactive form with all required fields', () => {
      expect(component.contactForm).toBeTruthy();
      expect(component.contactForm.get('name')).toBeTruthy();
      expect(component.contactForm.get('email')).toBeTruthy();
      expect(component.contactForm.get('phone')).toBeTruthy();
      expect(component.contactForm.get('message')).toBeTruthy();
      expect(component.contactForm.valid).toBeFalsy();
    });

    it('should set correct character limits', () => {
      expect(component.NAME_MAX_LENGTH).toBe(50);
      expect(component.MESSAGE_MAX_LENGTH).toBe(1000);
    });

    it('should initialize component state correctly', () => {
      expect(component.isSubmitting).toBeFalsy();
      expect(component.submissionSuccess).toBeFalsy();
      expect(component.submissionMessage).toBe('');
      expect(component.networkError).toBeFalsy();
      expect(component.retryCount).toBe(0);
    });
  });

  describe('Form Rendering and Accessibility', () => {
    it('should render form with proper labels and ARIA attributes', () => {
      const nameLabel = compiled.querySelector('label[for="contact-form-name"]');
      const emailLabel = compiled.querySelector('label[for="contact-form-email"]');
      const phoneLabel = compiled.querySelector('label[for="contact-form-phone"]');
      const messageLabel = compiled.querySelector('label[for="contact-form-message"]');

      expect(nameLabel?.textContent).toContain('Full Name');
      expect(emailLabel?.textContent).toContain('Email Address');
      expect(phoneLabel?.textContent).toContain('Phone Number');
      expect(messageLabel?.textContent).toContain('Message');

      // Check required field indicators
      expect(nameLabel?.textContent).toContain('*');
      expect(emailLabel?.textContent).toContain('*');
      expect(messageLabel?.textContent).toContain('*');
      expect(phoneLabel?.textContent).toContain('(optional)');
    });

    it('should have proper input types for mobile keyboards', () => {
      const nameInput = compiled.querySelector('input[formControlName="name"]');
      const emailInput = compiled.querySelector('input[formControlName="email"]');
      const phoneInput = compiled.querySelector('input[formControlName="phone"]');

      expect(nameInput?.getAttribute('type')).toBe('text');
      expect(emailInput?.getAttribute('type')).toBe('email');
      expect(phoneInput?.getAttribute('type')).toBe('tel');
    });

    it('should have autocomplete attributes for better UX', () => {
      const nameInput = compiled.querySelector('input[formControlName="name"]');
      const emailInput = compiled.querySelector('input[formControlName="email"]');
      const phoneInput = compiled.querySelector('input[formControlName="phone"]');

      expect(nameInput?.getAttribute('autocomplete')).toBe('name');
      expect(emailInput?.getAttribute('autocomplete')).toBe('email');
      expect(phoneInput?.getAttribute('autocomplete')).toBe('tel');
    });

    it('should generate unique ARIA attributes for each field', () => {
      expect(component.getFieldId('name')).toBe('contact-form-name');
      expect(component.getErrorId('name')).toBe('contact-form-name-error');

      const ariaDescribedBy = component.getAriaDescribedBy('name');
      expect(ariaDescribedBy).toContain('contact-form-name-help');
    });

    it('should include error IDs in ARIA describedby when errors are shown', () => {
      component.onFieldBlur('name'); // Trigger error state
      fixture.detectChanges();

      const ariaDescribedBy = component.getAriaDescribedBy('name');
      expect(ariaDescribedBy).toContain('contact-form-name-error');
    });

    it('should show character counters for name and message fields', () => {
      component.contactForm.patchValue({ name: 'John', message: 'Hello world' });
      fixture.detectChanges();

      expect(component.getCharacterCountMessage('name')).toBe('4/50 characters');
      expect(component.getCharacterCountMessage('message')).toBe('11/1000 characters');
    });
  });

  describe('Progressive Validation Strategy', () => {
    it('should not show validation errors initially', () => {
      expect(component.shouldShowError('name')).toBeFalsy();
      expect(component.shouldShowError('email')).toBeFalsy();
      expect(component.shouldShowError('message')).toBeFalsy();
    });

    it('should show validation errors after field blur (blur-first strategy)', () => {
      component.onFieldBlur('name');

      expect(component.shouldShowError('name')).toBeTruthy();
      expect(component.getFieldError('name')).toContain('This field is required');
    });

    it('should enable real-time validation after first interaction', async () => {
      const nameControl = component.contactForm.get('name')!;

      // First interaction - blur
      component.onFieldBlur('name');
      expect(component.shouldShowError('name')).toBeTruthy();

      // Subsequent changes should trigger real-time validation
      nameControl.setValue('J'); // Too short
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for debounce

      expect(nameControl.errors).toBeTruthy();
      expect(component.getFieldError('name')).toContain('Minimum 2 characters required');
    });

    it('should use 300ms debounce for real-time validation', async () => {
      const nameControl = component.contactForm.get('name')!;

      component.onFieldBlur('name'); // Enable real-time validation

      nameControl.setValue('A');
      await new Promise(resolve => setTimeout(resolve, 200)); // Less than debounce time
      expect(nameControl.pending).toBeTruthy(); // Validation is pending

      await new Promise(resolve => setTimeout(resolve, 100)); // Complete debounce time (300ms total)
      expect(nameControl.pending).toBeFalsy();
    });
  });

  describe('Form Validation Rules', () => {
    describe('Name Field Validation', () => {
      it('should require name field', () => {
        const nameControl = component.contactForm.get('name')!;
        nameControl.markAsTouched();

        expect(nameControl.errors?.['required']).toBeTruthy();
        expect(component.getFieldError('name')).toContain('This field is required');
      });

      it('should enforce minimum length of 2 characters', () => {
        const nameControl = component.contactForm.get('name')!;
        nameControl.setValue('A');
        nameControl.markAsTouched();

        expect(nameControl.errors?.['minlength']).toBeTruthy();
        expect(component.getFieldError('name')).toContain('Minimum 2 characters required');
      });

      it('should enforce maximum length of 50 characters', () => {
        const nameControl = component.contactForm.get('name')!;
        const longName = 'A'.repeat(51);
        nameControl.setValue(longName);
        nameControl.markAsTouched();

        expect(nameControl.errors?.['maxlength']).toBeTruthy();
        expect(component.getFieldError('name')).toContain('Maximum 50 characters allowed');
      });

      it('should accept valid names', () => {
        const nameControl = component.contactForm.get('name')!;
        const validNames = ['John Doe', 'Maria García', '李小明', 'José da Silva'];

        validNames.forEach(name => {
          nameControl.setValue(name);
          expect(nameControl.errors).toBeNull();
        });
      });
    });

    describe('Email Field Validation', () => {
      it('should require email field', () => {
        const emailControl = component.contactForm.get('email')!;
        emailControl.markAsTouched();

        expect(emailControl.errors?.['required']).toBeTruthy();
      });

      it('should validate email format', () => {
        const emailControl = component.contactForm.get('email')!;
        const invalidEmails = ['invalid', '@domain.com', 'user@', 'user@domain'];

        invalidEmails.forEach(email => {
          emailControl.setValue(email);
          emailControl.markAsTouched();
          expect(emailControl.errors?.['email']).toBeTruthy();
          expect(component.getFieldError('email')).toContain('valid email address');
        });
      });

      it('should accept valid email formats', () => {
        const emailControl = component.contactForm.get('email')!;
        const validEmails = [
          'test@example.com',
          'user.name+tag@domain.com',
          'user123@sub.domain.org',
          'email@123.456.789.123'
        ];

        validEmails.forEach(email => {
          emailControl.setValue(email);
          expect(emailControl.errors).toBeNull();
        });
      });
    });

    describe('Phone Field Validation', () => {
      it('should not require phone field (optional)', () => {
        const phoneControl = component.contactForm.get('phone')!;
        phoneControl.setValue('');
        phoneControl.markAsTouched();

        expect(phoneControl.errors).toBeNull();
      });

      it('should validate international phone formats', () => {
        const phoneControl = component.contactForm.get('phone')!;
        const validPhones = [
          '+1 (555) 123-4567',
          '+44 20 7946 0958',
          '+86 138 0013 8000',
          '555-123-4567',
          '(555) 123-4567'
        ];

        validPhones.forEach(phone => {
          phoneControl.setValue(phone);
          expect(phoneControl.errors).toBeNull();
        });
      });

      it('should reject invalid phone formats', () => {
        const phoneControl = component.contactForm.get('phone')!;
        const invalidPhones = ['123', '12345678901234567', 'abc-def-ghij'];

        invalidPhones.forEach(phone => {
          phoneControl.setValue(phone);
          phoneControl.markAsTouched();
          expect(phoneControl.errors?.['phoneNumber']).toBeTruthy();
          expect(component.getFieldError('phone')).toContain('valid phone number');
        });
      });
    });

    describe('Message Field Validation', () => {
      it('should require message field', () => {
        const messageControl = component.contactForm.get('message')!;
        messageControl.markAsTouched();

        expect(messageControl.errors?.['required']).toBeTruthy();
      });

      it('should enforce minimum meaningful content (10 characters)', () => {
        const messageControl = component.contactForm.get('message')!;
        messageControl.setValue('Hi');
        messageControl.markAsTouched();

        expect(messageControl.errors?.['meaningfulMessage']).toBeTruthy();
        expect(component.getFieldError('message')).toContain('at least 10 characters');
      });

      it('should enforce maximum length of 1000 characters', () => {
        const messageControl = component.contactForm.get('message')!;
        const longMessage = 'A'.repeat(1001);
        messageControl.setValue(longMessage);
        messageControl.markAsTouched();

        expect(messageControl.errors?.['maxlength']).toBeTruthy();
        expect(component.getFieldError('message')).toContain('Maximum 1000 characters allowed');
      });

      it('should reject spam-like content', () => {
        const messageControl = component.contactForm.get('message')!;
        messageControl.setValue('aaaaaaaaaa'); // Same character repeated
        messageControl.markAsTouched();

        expect(messageControl.errors?.['meaningfulMessage']).toBeTruthy();
        expect(component.getFieldError('message')).toContain('meaningful message');
      });

      it('should accept valid messages', () => {
        const messageControl = component.contactForm.get('message')!;
        const validMessage = 'This is a meaningful message with proper content and sufficient length.';
        messageControl.setValue(validMessage);

        expect(messageControl.errors).toBeNull();
      });
    });
  });

  describe('Character Counting and Limits', () => {
    it('should track character count accurately', () => {
      const nameControl = component.contactForm.get('name')!;
      const messageControl = component.contactForm.get('message')!;

      nameControl.setValue('John Doe');
      messageControl.setValue('Hello world');

      expect(component.getCharacterCount('name')).toBe(8);
      expect(component.getCharacterCount('message')).toBe(11);
    });

    it('should show character count with format "X/Max characters"', () => {
      const nameControl = component.contactForm.get('name')!;
      nameControl.setValue('John');

      expect(component.getCharacterCountMessage('name')).toBe('4/50 characters');
    });

    it('should warn when approaching character limit (80%)', () => {
      const nameControl = component.contactForm.get('name')!;
      nameControl.setValue('A'.repeat(41)); // 82% of 50

      expect(component.isCharacterLimitApproaching('name')).toBeTruthy();
    });

    it('should track character limit events', () => {
      vi.spyOn(component as any, 'trackEvent');
      const nameControl = component.contactForm.get('name')!;

      nameControl.setValue('A'.repeat(46)); // 92% of limit
      component.onFieldInput('name');

      expect(component['trackEvent']).toHaveBeenCalledWith('character_limit_reached', expect.any(Object));
    });
  });

  describe('Submit Button State Management', () => {
    it('should disable submit button when form is invalid', () => {
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(component.contactForm.invalid).toBeTruthy();
      expect(submitButton.disabled).toBeTruthy();
    });

    it('should enable submit button when form is valid', () => {
      component.contactForm.patchValue(validFormData);
      fixture.detectChanges();

      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(component.contactForm.valid).toBeTruthy();
      expect(submitButton.disabled).toBeFalsy();
    });

    it('should show loading state during submission', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockReturnValue(
        Promise.resolve(mockSuccessResponse)
      );

      component.contactForm.patchValue(validFormData);
      await component.onSubmit();

      expect(component.isSubmitting).toBeFalsy(); // Should be false after completion
    });

    it('should show loading spinner and text during submission', () => {
      component.isSubmitting = true;
      fixture.detectChanges();

      const submitButton = compiled.querySelector('button[type="submit"]');
      const loadingSpinner = submitButton?.querySelector('.loading-spinner');

      expect(loadingSpinner).toBeTruthy();
      expect(submitButton?.textContent).toContain('Sending...');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.contactForm.patchValue(validFormData);
    });

    it('should submit form successfully with valid data', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockSuccessResponse);

      await component.onSubmit();

      expect(mockContactService.submitContactForm).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validFormData.name,
          email: validFormData.email,
          phone: validFormData.phone,
          message: validFormData.message
        })
      );
      expect(component.submissionSuccess).toBeTruthy();
      expect(component.submissionMessage).toBe(mockSuccessResponse.message);
    });

    it('should reset form after successful submission', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockSuccessResponse);

      await component.onSubmit();

      expect(component.contactForm.get('name')?.value).toBe('');
      expect(component.contactForm.get('email')?.value).toBe('');
    });

    it('should not submit if form is invalid', async () => {
      component.contactForm.patchValue({ name: '', email: '', message: '' });

      await component.onSubmit();

      expect(mockContactService.submitContactForm).not.toHaveBeenCalled();
      expect(component.isSubmitting).toBeFalsy();
    });

    it('should not submit if already submitting', async () => {
      component.isSubmitting = true;

      await component.onSubmit();

      expect(mockContactService.submitContactForm).not.toHaveBeenCalled();
    });

    it('should track successful form submission', async () => {
      vi.spyOn(component as any, 'trackEvent');
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockSuccessResponse);

      await component.onSubmit();

      expect(component['trackEvent']).toHaveBeenCalledWith(
        'contact_form_submitted',
        expect.objectContaining({
          success_status: true,
          retry_count: 0
        })
      );
    });
  });

  describe('Network Error Handling', () => {
    beforeEach(() => {
      component.contactForm.patchValue(validFormData);
    });

    it('should check network status before submission', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(false));

      await component.onSubmit();

      expect(mockContactService.checkNetworkStatus).toHaveBeenCalled();
      expect(component.networkError).toBeTruthy();
      expect(component.submissionMessage).toContain('internet connection');
    });

    it('should handle server errors gracefully', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockErrorResponse);

      await component.onSubmit();

      expect(component.submissionSuccess).toBeFalsy();
      expect(component.submissionMessage).toBe(mockErrorResponse.message);
    });

    it('should handle field-specific server errors', async () => {
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockErrorResponse);

      await component.onSubmit();

      const emailControl = component.contactForm.get('email');
      expect(emailControl?.errors?.['serverError']).toBeTruthy();
    });

    it('should provide retry mechanism with attempt counter', () => {
      component.networkError = true;
      component.retryCount = 2;
      fixture.detectChanges();

      const retryButton = compiled.querySelector('button[aria-label="Retry sending message"]');
      expect(retryButton?.textContent).toContain('1 attempts left');
    });

    it('should limit retry attempts to 3', () => {
      component.networkError = true;
      component.retryCount = 3;
      fixture.detectChanges();

      const retryButton = compiled.querySelector('button[aria-label="Retry sending message"]');
      expect(retryButton).toBeFalsy();
    });

    it('should track submission errors', async () => {
      vi.spyOn(component as any, 'trackEvent');
      mockContactService.checkNetworkStatus.mockReturnValue(of(true));
      mockContactService.submitContactForm.mockResolvedValue(mockErrorResponse);

      await component.onSubmit();

      expect(component['trackEvent']).toHaveBeenCalledWith(
        'contact_form_submitted',
        expect.objectContaining({
          success_status: false,
          retry_count: expect.any(Number)
        })
      );
    });
  });

  describe('Success and Error Message Display', () => {
    it('should show success message with proper ARIA attributes', () => {
      component.submissionSuccess = true;
      component.submissionMessage = mockSuccessResponse.message;
      fixture.detectChanges();

      const successMessage = compiled.querySelector('.success-message');
      expect(successMessage).toBeTruthy();
      expect(successMessage?.getAttribute('role')).toBe('alert');
      expect(successMessage?.getAttribute('aria-live')).toBe('polite');
      expect(successMessage?.textContent).toContain(mockSuccessResponse.message);
    });

    it('should show error messages with proper ARIA attributes', () => {
      component.onFieldBlur('name');
      fixture.detectChanges();

      const errorText = compiled.querySelector('.error-text[role="alert"]');
      expect(errorText).toBeTruthy();
      expect(errorText?.getAttribute('aria-live')).toBe('polite');
    });

    it('should include error icons for visual indicators', () => {
      component.onFieldBlur('name');
      fixture.detectChanges();

      const errorIcon = compiled.querySelector('.error-text .error-icon');
      expect(errorIcon).toBeTruthy();
      expect(errorIcon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should provide option to send another message after success', () => {
      component.submissionSuccess = true;
      fixture.detectChanges();

      const sendAnotherButton = compiled.querySelector('button[aria-label="Send another message"]');
      expect(sendAnotherButton).toBeTruthy();
    });
  });

  describe('Form Reset and Send Another', () => {
    it('should reset form state when sending another message', () => {
      component.submissionSuccess = true;
      component.submissionMessage = 'Success!';
      component.networkError = true;
      component.retryCount = 2;

      component.onSendAnother();

      expect(component.submissionSuccess).toBeFalsy();
      expect(component.submissionMessage).toBe('');
      expect(component.networkError).toBeFalsy();
      expect(component.retryCount).toBe(0);
    });

    it('should focus first field after reset for accessibility', async () => {
      vi.spyOn(document, 'querySelector').mockReturnValue({
        focus: vi.fn()
      } as any);

      component.onSendAnother();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(document.querySelector).toHaveBeenCalledWith('input[formControlName="name"]');
    });

    it('should clear field interaction tracking', () => {
      component.onFieldBlur('name');
      component.onFieldBlur('email');

      component.onSendAnother();

      expect(component.shouldShowError('name')).toBeFalsy();
      expect(component.shouldShowError('email')).toBeFalsy();
    });
  });

  describe('Error Message Display', () => {
    it('should show inline error messages below fields', () => {
      component.onFieldBlur('name');
      fixture.detectChanges();

      const nameField = compiled.querySelector('.form-group:first-child');
      const errorElement = nameField?.querySelector('.error-text');

      expect(errorElement).toBeTruthy();
      expect(errorElement?.textContent).toContain('This field is required');
    });

    it('should use proper error styling classes', () => {
      const nameControl = component.contactForm.get('name')!;
      component.onFieldBlur('name');
      fixture.detectChanges();

      const nameInput = compiled.querySelector('input[formControlName="name"]');
      expect(nameInput?.classList.contains('error')).toBeTruthy();
    });

    it('should set aria-invalid attribute on error fields', () => {
      component.onFieldBlur('name');
      fixture.detectChanges();

      const nameInput = compiled.querySelector('input[formControlName="name"]');
      expect(nameInput?.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle whitespace-only input', () => {
      const nameControl = component.contactForm.get('name')!;
      nameControl.setValue('   ');
      nameControl.markAsTouched();

      expect(nameControl.errors?.['required']).toBeTruthy();
    });

    it('should handle form destruction cleanup', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should handle missing form controls gracefully', () => {
      expect(() => component.getFieldError('nonexistent')).not.toThrow();
      expect(component.getFieldError('nonexistent')).toBe('');
    });

    it('should handle character count for empty fields', () => {
      expect(component.getCharacterCount('name')).toBe(0);
      expect(component.getCharacterCountMessage('name')).toBe('0/50 characters');
    });

    it('should validate international characters in name', () => {
      const nameControl = component.contactForm.get('name')!;
      const internationalNames = ['José García', '李小明', 'Müller', 'Åkesson'];

      internationalNames.forEach(name => {
        nameControl.setValue(name);
        expect(nameControl.errors).toBeNull();
      });
    });

    it('should handle paste events that exceed character limits', () => {
      const nameControl = component.contactForm.get('name')!;
      const veryLongText = 'A'.repeat(100);

      nameControl.setValue(veryLongText);
      nameControl.markAsTouched();

      expect(nameControl.errors?.['maxlength']).toBeTruthy();
    });
  });

  describe('Cross-field Validation', () => {
    it('should prevent identical name and message content', () => {
      const formData = { name: 'Test', email: 'test@example.com', message: 'Test', phone: '' };
      component.contactForm.patchValue(formData);

      expect(component.contactForm.errors?.['duplicateContent']).toBeTruthy();
    });

    it('should allow different name and message content', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Different message content',
        phone: ''
      };
      component.contactForm.patchValue(formData);

      expect(component.contactForm.errors?.['duplicateContent']).toBeFalsy();
    });
  });
});