import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ContactFormComponent } from './contact-form.component';
import { ContactService } from './contact.service';
import { ContactFormData, ContactSubmissionResponse } from './contact-form.interfaces';

describe('ContactFormComponent', () => {
  let component: ContactFormComponent;
  let fixture: ComponentFixture<ContactFormComponent>;
  let contactService: jasmine.SpyObj<ContactService>;
  let consoleSpy: jasmine.Spy;

  const mockSuccessResponse: ContactSubmissionResponse = {
    success: true,
    message: 'Thank you for your message.'
  };

  beforeEach(async () => {
    const contactServiceSpy = jasmine.createSpyObj('ContactService', ['submitContactForm']);

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        { provide: ContactService, useValue: contactServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    contactService = TestBed.inject(ContactService) as jasmine.SpyObj<ContactService>;

    // Spy on console.log for analytics events
    consoleSpy = spyOn(console, 'log');

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty form', () => {
      expect(component.contactForm.get('name')?.value).toBe('');
      expect(component.contactForm.get('email')?.value).toBe('');
      expect(component.contactForm.get('phone')?.value).toBe('');
      expect(component.contactForm.get('message')?.value).toBe('');
    });

    it('should initialize with form being invalid', () => {
      expect(component.contactForm.valid).toBeFalsy();
    });

    it('should emit contact_form_viewed analytics event on init', () => {
      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'contact_form_viewed'
      }));
    });

    it('should have proper initial submission state', () => {
      expect(component.submissionState.isLoading).toBeFalsy();
      expect(component.submissionState.isSubmitted).toBeFalsy();
      expect(component.submissionState.retryCount).toBe(0);
      expect(component.submissionState.error).toBeNull();
    });

    it('should have character count starting at 0', () => {
      expect(component.getCharacterCount()).toBe(0);
    });
  });

  describe('Form Validation on Blur', () => {
    it('should validate required name field on blur', () => {
      const nameInput = fixture.debugElement.query(By.css('#name'));

      // Trigger blur without value
      nameInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(component.isFieldInvalid('name')).toBeTruthy();
      expect(component.getFieldError('name')).toBe('This field is required');

      // Should show error message in DOM
      const errorElement = fixture.debugElement.query(By.css('#name-error'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent.trim()).toBe('This field is required');
    });

    it('should validate required email field on blur', () => {
      const emailInput = fixture.debugElement.query(By.css('#email'));

      emailInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(component.isFieldInvalid('email')).toBeTruthy();
      expect(component.getFieldError('email')).toBe('This field is required');
    });

    it('should validate email format on blur', () => {
      const emailControl = component.contactForm.get('email')!;
      emailControl.setValue('invalid-email');

      const emailInput = fixture.debugElement.query(By.css('#email'));
      emailInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(component.isFieldInvalid('email')).toBeTruthy();
      expect(component.getFieldError('email')).toBe('Please enter a valid email address (e.g., name@example.com)');
    });

    it('should validate required message field on blur', () => {
      const messageInput = fixture.debugElement.query(By.css('#message'));

      messageInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(component.isFieldInvalid('message')).toBeTruthy();
      expect(component.getFieldError('message')).toBe('This field is required');
    });

    it('should validate optional phone field format on blur', () => {
      const phoneControl = component.contactForm.get('phone')!;
      phoneControl.setValue('123'); // Invalid phone

      const phoneInput = fixture.debugElement.query(By.css('#phone'));
      phoneInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(component.isFieldInvalid('phone')).toBeTruthy();
      expect(component.getFieldError('phone')).toBe('Please enter a valid phone number (e.g., (555) 123-4567 or +1-555-123-4567)');
    });

    it('should not show errors for valid fields on blur', () => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        message: 'Valid message'
      });

      ['name', 'email', 'phone', 'message'].forEach(fieldName => {
        const input = fixture.debugElement.query(By.css(`#${fieldName}`));
        input.triggerEventHandler('blur', null);
      });

      fixture.detectChanges();

      expect(component.isFieldInvalid('name')).toBeFalsy();
      expect(component.isFieldInvalid('email')).toBeFalsy();
      expect(component.isFieldInvalid('phone')).toBeFalsy();
      expect(component.isFieldInvalid('message')).toBeFalsy();
    });

    it('should emit validation_error analytics event on field errors', () => {
      const nameControl = component.contactForm.get('name')!;
      nameControl.setValue(''); // Invalid value

      component.onFieldBlur('name');

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'validation_error',
        properties: jasmine.objectContaining({
          field_name: 'name',
          error_type: 'required',
          user_input_length: 0
        })
      }));
    });
  });

  describe('Character Counter for Message Field', () => {
    it('should not show character counter initially', () => {
      expect(component.shouldShowCharacterCounter()).toBeFalsy();

      const counterElement = fixture.debugElement.query(By.css('#message-counter'));
      expect(counterElement).toBeFalsy();
    });

    it('should show character counter when approaching limit (400+ characters)', () => {
      const message400 = 'a'.repeat(400);
      component.contactForm.get('message')!.setValue(message400);
      component.updateCharacterCount();
      fixture.detectChanges();

      expect(component.shouldShowCharacterCounter()).toBeTruthy();
      expect(component.getCharacterCount()).toBe(400);

      const counterElement = fixture.debugElement.query(By.css('#message-counter'));
      expect(counterElement).toBeTruthy();
      expect(counterElement.nativeElement.textContent.trim()).toBe('400/500 characters');
    });

    it('should show warning state for character counter near limit', () => {
      const message450 = 'a'.repeat(450);
      component.contactForm.get('message')!.setValue(message450);
      component.updateCharacterCount();
      fixture.detectChanges();

      expect(component.isNearCharacterLimit()).toBeTruthy();
      expect(component.isOverCharacterLimit()).toBeFalsy();

      const counterElement = fixture.debugElement.query(By.css('#message-counter'));
      expect(counterElement.nativeElement.classList.contains('warning')).toBeTruthy();
      expect(counterElement.nativeElement.classList.contains('error')).toBeFalsy();
    });

    it('should show error state for character counter over limit', () => {
      const message501 = 'a'.repeat(501);
      component.contactForm.get('message')!.setValue(message501);
      component.updateCharacterCount();
      fixture.detectChanges();

      expect(component.isNearCharacterLimit()).toBeTruthy(); // Still near limit
      expect(component.isOverCharacterLimit()).toBeTruthy(); // Also over limit

      const counterElement = fixture.debugElement.query(By.css('#message-counter'));
      expect(counterElement.nativeElement.classList.contains('error')).toBeTruthy();
    });

    it('should update character count on input event', () => {
      const messageTextarea = fixture.debugElement.query(By.css('#message'));
      component.contactForm.get('message')!.setValue('Hello world');

      messageTextarea.triggerEventHandler('input', null);

      expect(component.getCharacterCount()).toBe(11);
    });

    it('should emit character_limit_warning analytics event at threshold', () => {
      const message400 = 'a'.repeat(400);
      component.contactForm.get('message')!.setValue(message400);

      component.updateCharacterCount();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'character_limit_warning',
        properties: jasmine.objectContaining({
          field_name: 'message',
          character_count: 400,
          limit: 500
        })
      }));
    });

    it('should prevent form submission when over character limit', () => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'a'.repeat(501) // Over limit
      });

      expect(component.contactForm.valid).toBeFalsy();

      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      expect(submitButton.nativeElement.disabled).toBeTruthy();
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button when form is invalid', () => {
      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      expect(submitButton.nativeElement.disabled).toBeTruthy();
    });

    it('should enable submit button when form is valid', () => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Valid message'
      });
      fixture.detectChanges();

      expect(component.contactForm.valid).toBeTruthy();

      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      expect(submitButton.nativeElement.disabled).toBeFalsy();
    });

    it('should disable submit button during submission', () => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Valid message'
      });

      component.submissionState.isLoading = true;
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      expect(submitButton.nativeElement.disabled).toBeTruthy();
    });

    it('should show loading state during submission', () => {
      component.submissionState.isLoading = true;
      fixture.detectChanges();

      const loadingContent = fixture.debugElement.query(By.css('.loading-content'));
      expect(loadingContent).toBeTruthy();
      expect(loadingContent.nativeElement.textContent.trim()).toContain('Sending...');

      const spinner = fixture.debugElement.query(By.css('.spinner'));
      expect(spinner).toBeTruthy();
    });

    it('should show help text when form is invalid', () => {
      fixture.detectChanges();

      const helpText = fixture.debugElement.query(By.css('#submit-disabled-reason'));
      expect(helpText).toBeTruthy();
      expect(helpText.nativeElement.textContent.trim()).toBe('Please complete all required fields to send your message.');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        message: 'Test message'
      });
    });

    it('should submit form with valid data', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();

      expect(contactService.submitContactForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        message: 'Test message'
      });

      expect(component.submissionState.isSubmitted).toBeTruthy();
      expect(component.submissionState.error).toBeNull();
    }));

    it('should not submit when form is invalid', () => {
      component.contactForm.patchValue({
        name: '',
        email: 'invalid-email',
        message: ''
      });

      component.onSubmit();

      expect(contactService.submitContactForm).not.toHaveBeenCalled();
      expect(component.submissionState.isLoading).toBeFalsy();
    });

    it('should not submit when already loading', () => {
      component.submissionState.isLoading = true;

      component.onSubmit();

      expect(contactService.submitContactForm).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched on submit attempt', () => {
      component.contactForm.patchValue({
        name: '',
        email: '',
        message: ''
      });

      component.onSubmit();

      expect(component.isFieldInvalid('name')).toBeTruthy();
      expect(component.isFieldInvalid('email')).toBeTruthy();
      expect(component.isFieldInvalid('message')).toBeTruthy();
    });

    it('should handle successful submission', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      expect(component.submissionState.isSubmitted).toBeTruthy();
      expect(component.submissionState.error).toBeNull();

      // Should show success message
      const successMessage = fixture.debugElement.query(By.css('.submission-success'));
      expect(successMessage).toBeTruthy();
      expect(successMessage.nativeElement.textContent).toContain('Thank You!');
    }));

    it('should emit contact_form_submitted analytics event on success', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'contact_form_submitted',
        properties: jasmine.objectContaining({
          success_status: true
        })
      }));
    }));
  });

  describe('Error Handling and Retry', () => {
    beforeEach(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });
    });

    it('should handle submission errors', fakeAsync(() => {
      const errorMessage = 'Network error. Please try again.';
      contactService.submitContactForm.and.returnValue(throwError(() => new Error(errorMessage)));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      expect(component.submissionState.error).toBe(errorMessage);
      expect(component.submissionState.isSubmitted).toBeFalsy();

      // Should show error message
      const errorElement = fixture.debugElement.query(By.css('.submission-error'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain(errorMessage);
    }));

    it('should show retry button on error', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(throwError(() => new Error('Network error')));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.textContent.trim()).toBe('Try Again');
    }));

    it('should retry submission when retry button is clicked', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(throwError(() => new Error('Network error')));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      // Reset spy and make it succeed on retry
      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.triggerEventHandler('click', null);
      tick();
      fixture.detectChanges();

      expect(contactService.submitContactForm).toHaveBeenCalledTimes(2);
      expect(component.submissionState.isSubmitted).toBeTruthy();
      expect(component.submissionState.error).toBeNull();
    }));

    it('should emit submission_failed analytics event on error', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(throwError(() => new Error('Network error')));

      component.onSubmit();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'submission_failed',
        properties: jasmine.objectContaining({
          error_type: 'Network error',
          retry_count: jasmine.any(Number)
        })
      }));
    }));

    it('should disable retry button during loading', fakeAsync(() => {
      contactService.submitContactForm.and.returnValue(throwError(() => new Error('Network error')));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      // Set loading state
      component.submissionState.isLoading = true;
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      expect(retryButton.nativeElement.disabled).toBeTruthy();
    }));
  });

  describe('Success State and Form Reset', () => {
    it('should show success message after successful submission', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.submission-success'));
      expect(successElement).toBeTruthy();
      expect(successElement.nativeElement.textContent).toContain('Thank You!');
      expect(successElement.nativeElement.textContent).toContain('Your message has been sent successfully');
      expect(successElement.nativeElement.textContent).toContain('Check your email for a confirmation');
    }));

    it('should show next steps in success message', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      const nextSteps = fixture.debugElement.query(By.css('.next-steps'));
      expect(nextSteps).toBeTruthy();
      expect(nextSteps.nativeElement.textContent).toContain('Next steps:');
      expect(nextSteps.nativeElement.textContent).toContain('(555) 123-4567');
    }));

    it('should show "Send Another Message" button in success state', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      const newMessageButton = fixture.debugElement.query(By.css('.new-message-button'));
      expect(newMessageButton).toBeTruthy();
      expect(newMessageButton.nativeElement.textContent.trim()).toBe('Send Another Message');
    }));

    it('should reset form when "Send Another Message" is clicked', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      const newMessageButton = fixture.debugElement.query(By.css('.new-message-button'));
      newMessageButton.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.contactForm.get('name')?.value).toBe('');
      expect(component.contactForm.get('email')?.value).toBe('');
      expect(component.contactForm.get('message')?.value).toBe('');
      expect(component.submissionState.isSubmitted).toBeFalsy();
      expect(component.getCharacterCount()).toBe(0);
    }));

    it('should clear touched fields state on reset', () => {
      // Touch all fields first
      ['name', 'email', 'message'].forEach(field => {
        component.onFieldBlur(field);
      });

      component.resetForm();

      expect(component.isFieldInvalid('name')).toBeFalsy();
      expect(component.isFieldInvalid('email')).toBeFalsy();
      expect(component.isFieldInvalid('message')).toBeFalsy();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA associations for error messages', () => {
      const nameInput = fixture.debugElement.query(By.css('#name'));
      nameInput.triggerEventHandler('blur', null);
      fixture.detectChanges();

      expect(nameInput.nativeElement.getAttribute('aria-describedby')).toBe('name-error');

      const errorElement = fixture.debugElement.query(By.css('#name-error'));
      expect(errorElement.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorElement.nativeElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should have proper ARIA associations for message field with counter', () => {
      component.contactForm.get('message')!.setValue('a'.repeat(400));
      component.updateCharacterCount();
      fixture.detectChanges();

      const messageTextarea = fixture.debugElement.query(By.css('#message'));
      const ariaDescribedBy = messageTextarea.nativeElement.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toContain('message-counter');
    });

    it('should combine ARIA described by for message field with error and counter', () => {
      // Set invalid message and trigger counter
      component.contactForm.get('message')!.setValue('');
      const messageInput = fixture.debugElement.query(By.css('#message'));
      messageInput.triggerEventHandler('blur', null);

      component.contactForm.get('message')!.setValue('a'.repeat(400));
      component.updateCharacterCount();
      fixture.detectChanges();

      const ariaDescribedBy = messageInput.nativeElement.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toContain('message-error');
      expect(ariaDescribedBy).toContain('message-counter');
    });

    it('should have proper mobile keyboard types', () => {
      const emailInput = fixture.debugElement.query(By.css('#email'));
      const phoneInput = fixture.debugElement.query(By.css('#phone'));

      expect(emailInput.nativeElement.type).toBe('email');
      expect(emailInput.nativeElement.getAttribute('inputmode')).toBe('email');

      expect(phoneInput.nativeElement.type).toBe('tel');
      expect(phoneInput.nativeElement.getAttribute('inputmode')).toBe('tel');
    });

    it('should have proper autocomplete attributes', () => {
      const nameInput = fixture.debugElement.query(By.css('#name'));
      const emailInput = fixture.debugElement.query(By.css('#email'));
      const phoneInput = fixture.debugElement.query(By.css('#phone'));

      expect(nameInput.nativeElement.getAttribute('autocomplete')).toBe('name');
      expect(emailInput.nativeElement.getAttribute('autocomplete')).toBe('email');
      expect(phoneInput.nativeElement.getAttribute('autocomplete')).toBe('tel');
    });

    it('should have proper label associations', () => {
      const nameLabel = fixture.debugElement.query(By.css('label[for="name"]'));
      const emailLabel = fixture.debugElement.query(By.css('label[for="email"]'));
      const phoneLabel = fixture.debugElement.query(By.css('label[for="phone"]'));
      const messageLabel = fixture.debugElement.query(By.css('label[for="message"]'));

      expect(nameLabel).toBeTruthy();
      expect(emailLabel).toBeTruthy();
      expect(phoneLabel).toBeTruthy();
      expect(messageLabel).toBeTruthy();
    });

    it('should indicate required fields with proper ARIA labels', () => {
      const requiredSpans = fixture.debugElement.queryAll(By.css('.required[aria-label="required"]'));
      expect(requiredSpans.length).toBe(3); // name, email, message
    });

    it('should have proper role and aria-live attributes for alerts', () => {
      component.submissionState.error = 'Test error';
      fixture.detectChanges();

      const errorAlert = fixture.debugElement.query(By.css('.submission-error'));
      expect(errorAlert.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorAlert.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('Analytics Tracking', () => {
    it('should track form view on initialization', () => {
      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'contact_form_viewed',
        properties: jasmine.objectContaining({
          page_url: jasmine.any(String),
          timestamp: jasmine.any(String),
          user_agent: jasmine.any(String)
        })
      }));
    });

    it('should track validation errors with field details', () => {
      component.contactForm.get('email')!.setValue('invalid-email');
      component.onFieldBlur('email');

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'validation_error',
        properties: jasmine.objectContaining({
          field_name: 'email',
          error_type: 'email',
          user_input_length: 13
        })
      }));
    });

    it('should track character limit warnings', () => {
      component.contactForm.get('message')!.setValue('a'.repeat(450));
      component.updateCharacterCount();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'character_limit_warning',
        properties: jasmine.objectContaining({
          field_name: 'message',
          character_count: 450,
          limit: 500
        })
      }));
    });

    it('should track successful form submissions', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));
      component.onSubmit();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'contact_form_submitted',
        properties: jasmine.objectContaining({
          success_status: true,
          submission_time: jasmine.any(Number)
        })
      }));
    }));

    it('should track failed submissions with error details', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(throwError(() => new Error('Network error')));
      component.onSubmit();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event_name: 'submission_failed',
        properties: jasmine.objectContaining({
          error_type: 'Network error',
          retry_count: jasmine.any(Number),
          network_status: jasmine.any(Boolean)
        })
      }));
    }));
  });

  describe('Edge Cases and Error States', () => {
    it('should handle empty character count correctly', () => {
      component.contactForm.get('message')!.setValue('');
      component.updateCharacterCount();

      expect(component.getCharacterCount()).toBe(0);
      expect(component.shouldShowCharacterCounter()).toBeFalsy();
    });

    it('should handle null message value in character counting', () => {
      component.contactForm.get('message')!.setValue(null);
      component.updateCharacterCount();

      expect(component.getCharacterCount()).toBe(0);
    });

    it('should return empty string for non-existent field errors', () => {
      expect(component.getFieldError('nonexistent')).toBe('');
    });

    it('should handle missing error message gracefully', () => {
      // Manually set an error without message property
      const control = component.contactForm.get('name')!;
      control.setErrors({ customError: { value: 'test' } });
      component.onFieldBlur('name');

      expect(component.getFieldError('name')).toBe('Invalid input');
    });

    it('should handle component destruction properly', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle rapid form submissions', fakeAsync(() => {
      component.contactForm.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      });

      contactService.submitContactForm.and.returnValue(of(mockSuccessResponse));

      // First submission
      component.onSubmit();
      // Immediate second submission while first is processing
      component.onSubmit();

      tick();

      // Should only call the service once
      expect(contactService.submitContactForm).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Mobile-Specific Features', () => {
    it('should have minimum touch target sizes for mobile accessibility', () => {
      const inputs = fixture.debugElement.queryAll(By.css('.form-input, .form-textarea, .submit-button'));

      inputs.forEach(input => {
        const styles = getComputedStyle(input.nativeElement);
        const minHeight = parseInt(styles.minHeight, 10);
        expect(minHeight).toBeGreaterThanOrEqual(44); // WCAG minimum touch target
      });
    });

    it('should show proper placeholder text with examples', () => {
      const emailInput = fixture.debugElement.query(By.css('#email'));
      const phoneInput = fixture.debugElement.query(By.css('#phone'));

      expect(emailInput.nativeElement.placeholder).toBe('name@example.com');
      expect(phoneInput.nativeElement.placeholder).toBe('(555) 123-4567');
    });
  });
});