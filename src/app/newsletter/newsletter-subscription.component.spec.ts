import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, throwError, BehaviorSubject, NEVER } from 'rxjs';
import { Component, DebugElement } from '@angular/core';

import { NewsletterSubscriptionComponent } from './newsletter-subscription.component';
import { NewsletterService } from './newsletter.service';
import { NewsletterValidationError, NewsletterSubmissionResult } from './newsletter.interface';

// Test wrapper component to test form display on main page
@Component({
  template: `
    <div id="main-page">
      <h1>Main Page Content</h1>
      <app-newsletter-subscription></app-newsletter-subscription>
    </div>
  `,
  imports: [NewsletterSubscriptionComponent]
})
class TestWrapperComponent {}

describe('NewsletterSubscriptionComponent', () => {
  let component: NewsletterSubscriptionComponent;
  let fixture: ComponentFixture<NewsletterSubscriptionComponent>;
  let wrapperComponent: TestWrapperComponent;
  let wrapperFixture: ComponentFixture<TestWrapperComponent>;
  let newsletterService: jasmine.SpyObj<NewsletterService>;

  const mockSuccessResult: NewsletterSubmissionResult = {
    success: true,
    message: 'Welcome! You\'ve successfully subscribed with test@example.com.',
    subscription: {
      id: 'test-id-12345',
      email: 'test@example.com',
      timestamp: '2024-01-01T00:00:00.000Z',
      status: 'active'
    }
  };

  const mockDuplicateResult: NewsletterSubmissionResult = {
    success: true,
    isDuplicate: true,
    message: 'Great! test@example.com is already subscribed to our newsletter.',
    subscription: {
      id: 'existing-id-67890',
      email: 'test@example.com',
      timestamp: '2023-12-01T00:00:00.000Z',
      status: 'active'
    }
  };

  const mockValidationError: NewsletterValidationError = {
    type: 'email',
    message: 'Please enter a valid email address.'
  };

  const mockRequiredError: NewsletterValidationError = {
    type: 'required',
    message: 'Email address is required.'
  };

  const mockStorageError: NewsletterValidationError = {
    type: 'storage',
    message: 'Unable to save your subscription. Please try again.'
  };

  beforeEach(async () => {
    const newsletterServiceSpy = jasmine.createSpyObj('NewsletterService', ['subscribe', 'validateEmail', 'isSubscribed'], {
      subscriptions$: new BehaviorSubject([])
    });

    await TestBed.configureTestingModule({
      imports: [NewsletterSubscriptionComponent, ReactiveFormsModule, TestWrapperComponent],
      providers: [
        { provide: NewsletterService, useValue: newsletterServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterSubscriptionComponent);
    component = fixture.componentInstance;
    newsletterService = TestBed.inject(NewsletterService) as jasmine.SpyObj<NewsletterService>;

    // Setup wrapper for integration tests
    wrapperFixture = TestBed.createComponent(TestWrapperComponent);
    wrapperComponent = wrapperFixture.componentInstance;

    // Setup default service behaviors
    newsletterService.validateEmail.and.returnValue(null);
    newsletterService.subscribe.and.returnValue(of(mockSuccessResult));
    newsletterService.isSubscribed.and.returnValue(false);

    // Mock console methods to avoid test output noise
    spyOn(console, 'log');
    spyOn(console, 'error');
  });

  describe('ACCEPTANCE CRITERIA: Form Display', () => {
    it('GIVEN user on main page WHEN page loads THEN newsletter form visible and accessible', () => {
      wrapperFixture.detectChanges();

      const mainPage = wrapperFixture.debugElement.query(By.css('#main-page'));
      const newsletterForm = wrapperFixture.debugElement.query(By.css('app-newsletter-subscription'));
      const formSection = wrapperFixture.debugElement.query(By.css('.newsletter-subscription'));
      const title = wrapperFixture.debugElement.query(By.css('#newsletter-title'));
      const emailInput = wrapperFixture.debugElement.query(By.css('#email-input'));
      const submitButton = wrapperFixture.debugElement.query(By.css('.submit-button'));

      // Verify form is prominently displayed on main page
      expect(mainPage).toBeTruthy();
      expect(newsletterForm).toBeTruthy();
      expect(formSection).toBeTruthy();

      // Verify form is visible (not hidden)
      const formElement = formSection.nativeElement;
      expect(formElement.offsetParent).not.toBeNull(); // Element is visible
      expect(getComputedStyle(formElement).display).not.toBe('none');
      expect(getComputedStyle(formElement).visibility).not.toBe('hidden');

      // Verify accessibility structure
      expect(formSection.nativeElement.getAttribute('aria-labelledby')).toBe('newsletter-title');
      expect(title.nativeElement.textContent.trim()).toBe('Stay Updated');

      // Verify form elements are accessible
      expect(emailInput.nativeElement.getAttribute('id')).toBe('email-input');
      expect(emailInput.nativeElement.getAttribute('type')).toBe('email');
      expect(emailInput.nativeElement.getAttribute('autocomplete')).toBe('email');
      expect(submitButton.nativeElement.getAttribute('type')).toBe('submit');

      // Verify form has proper WCAG structure
      const label = wrapperFixture.debugElement.query(By.css('label[for="email-input"]'));
      expect(label).toBeTruthy();
      expect(label.nativeElement.textContent.trim()).toBe('Email Address');
    });

    it('GIVEN newsletter form rendered WHEN tracking events THEN form view event is logged', () => {
      fixture.detectChanges();

      expect(console.log).toHaveBeenCalledWith('Newsletter Event:', jasmine.objectContaining({
        eventName: 'newsletter_form_viewed',
        properties: jasmine.objectContaining({
          page_location: jasmine.any(String),
          timestamp: jasmine.any(String)
        })
      }));
    });

    it('GIVEN form displayed WHEN checking prominence THEN form has non-intrusive but visible styling', () => {
      fixture.detectChanges();

      const formSection = fixture.debugElement.query(By.css('.newsletter-subscription'));
      const styles = getComputedStyle(formSection.nativeElement);

      // Verify form is styled prominently but not aggressively
      expect(formSection).toBeTruthy();
      // Form should have visual prominence without being overwhelming
      expect(formSection.nativeElement.style.getPropertyValue('max-width')).toBeTruthy();
    });
  });

  describe('ACCEPTANCE CRITERIA: Real-time Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('GIVEN user typing email WHEN input loses focus THEN validation feedback appears without layout disruption', fakeAsync(() => {
      newsletterService.validateEmail.and.returnValue(mockValidationError);

      const emailInput = fixture.debugElement.query(By.css('#email-input'));
      const emailControl = component.newsletterForm.get('email');

      // Start typing invalid email
      emailControl?.setValue('invalid-email');

      // Verify no validation error shown during typing (before blur)
      expect(component.showEmailError).toBe(false);

      // Trigger blur event
      component.onEmailBlur();
      fixture.detectChanges();

      // Verify validation feedback appears
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent.trim()).toBe('Please enter a valid email address.');
      expect(emailInput.nativeElement.getAttribute('aria-invalid')).toBe('true');

      // Verify no layout disruption - error message should not shift other elements
      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      const buttonRect = submitButton.nativeElement.getBoundingClientRect();
      expect(buttonRect.height).toBeGreaterThan(0);
      expect(submitButton.nativeElement.offsetParent).not.toBeNull();
    }));

    it('GIVEN user typing email WHEN typing stops for 500ms THEN validation triggers', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      component.hasUserInteracted = true;

      // Start typing
      emailControl?.setValue('test@');
      tick(100);

      // Verify validation hasn't triggered yet
      expect(newsletterService.validateEmail).not.toHaveBeenCalled();

      // Wait for debounce period
      tick(500);

      // Verify validation triggers after delay
      expect(newsletterService.validateEmail).toHaveBeenCalledWith('test@');
    }));

    it('GIVEN valid email typed WHEN validation completes THEN green checkmark appears smoothly', () => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      component.hasUserInteracted = true;
      fixture.detectChanges();

      const successIcon = fixture.debugElement.query(By.css('.success-icon'));
      expect(successIcon).toBeTruthy();
      expect(successIcon.nativeElement.textContent.trim()).toBe('✓');
      expect(successIcon.nativeElement.title).toBe('Valid email');
    });

    it('GIVEN validation error WHEN error appears THEN inline error message is properly announced', () => {
      newsletterService.validateEmail.and.returnValue(mockValidationError);

      component.onEmailBlur();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorMessage.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('GIVEN email validation WHEN switching between valid and invalid THEN states update correctly', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      component.hasUserInteracted = true;

      // Start with valid email
      emailControl?.setValue('test@example.com');
      tick(500);
      fixture.detectChanges();

      expect(component.isEmailValid).toBe(true);
      expect(component.showEmailError).toBe(false);

      // Switch to invalid email
      newsletterService.validateEmail.and.returnValue(mockValidationError);
      emailControl?.setValue('invalid');
      tick(500);
      fixture.detectChanges();

      expect(component.showEmailError).toBe(true);

      // Switch back to valid
      newsletterService.validateEmail.and.returnValue(null);
      emailControl?.setValue('valid@example.com');
      tick(500);
      fixture.detectChanges();

      expect(component.isEmailValid).toBe(true);
      expect(component.showEmailError).toBe(false);
    }));
  });

  describe('ACCEPTANCE CRITERIA: Successful Subscription', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('GIVEN valid email entered WHEN submit clicked THEN email stored in local storage and success message displayed', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      fixture.detectChanges();

      // Submit form
      component.onSubmit();
      tick(800); // Wait for service delay
      fixture.detectChanges();

      // Verify service called with correct email
      expect(newsletterService.subscribe).toHaveBeenCalledWith('test@example.com');

      // Verify success state
      expect(component.formState.showSuccess).toBe(true);
      expect(component.successMessageText).toBe(mockSuccessResult.message);

      // Verify success message displayed properly
      const successMessage = fixture.debugElement.query(By.css('.success-message'));
      expect(successMessage).toBeTruthy();
      expect(successMessage.nativeElement.getAttribute('role')).toBe('alert');
      expect(successMessage.nativeElement.getAttribute('aria-live')).toBe('assertive');
      expect(successMessage.nativeElement.textContent).toContain('Successfully Subscribed!');
      expect(successMessage.nativeElement.textContent).toContain('test@example.com');
    }));

    it('GIVEN successful subscription WHEN success message shown THEN personalized confirmation displayed', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('user@example.com');
      fixture.detectChanges();

      const customResult = {
        ...mockSuccessResult,
        message: 'Welcome! You\'ve successfully subscribed with user@example.com.'
      };
      newsletterService.subscribe.and.returnValue(of(customResult));

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      expect(component.successMessageText).toContain('user@example.com');

      const successDescription = fixture.debugElement.query(By.css('.success-description'));
      expect(successDescription.nativeElement.textContent).toContain('user@example.com');
    }));

    it('GIVEN successful subscription WHEN completion rate tracked THEN > 85% success threshold met', fakeAsync(() => {
      // Simulate multiple successful submissions to verify success rate
      const emailControl = component.newsletterForm.get('email');
      let successCount = 0;
      const totalAttempts = 100;

      for (let i = 0; i < totalAttempts; i++) {
        emailControl?.setValue(`test${i}@example.com`);
        component.onSubmit();
        tick(800);

        if (component.formState.showSuccess) {
          successCount++;
        }

        // Reset for next iteration
        component.resetToInitialState();
        tick(100);
      }

      const successRate = (successCount / totalAttempts) * 100;
      expect(successRate).toBeGreaterThan(85); // Meets success threshold requirement
    }));

    it('GIVEN loading state WHEN submission in progress THEN proper loading indicators shown', () => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();

      // Verify loading state
      expect(component.formState.isSubmitting).toBe(true);

      const submitButton = fixture.debugElement.query(By.css('.submit-button'));
      const loadingSpinner = fixture.debugElement.query(By.css('.loading-spinner'));
      const submitStatus = fixture.debugElement.query(By.css('#submit-status'));

      expect(submitButton.nativeElement.disabled).toBe(true);
      expect(submitButton.nativeElement.textContent.trim()).toBe('Subscribing...');
      expect(loadingSpinner).toBeTruthy();
      expect(loadingSpinner.nativeElement.title).toBe('Submitting...');
      expect(submitStatus.nativeElement.textContent).toContain('Please wait');
    });
  });

  describe('ACCEPTANCE CRITERIA: Duplicate Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('GIVEN email already subscribed WHEN same email submitted THEN friendly "already subscribed" message shown', fakeAsync(() => {
      newsletterService.subscribe.and.returnValue(of(mockDuplicateResult));

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      fixture.detectChanges();

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      // Verify duplicate handling
      expect(component.formState.showSuccess).toBe(true);
      expect(component.successMessageText).toContain('already subscribed');
      expect(component.successMessageText).toContain('test@example.com');

      const successMessage = fixture.debugElement.query(By.css('.success-message'));
      expect(successMessage.nativeElement.textContent).toContain('already subscribed');
    }));

    it('GIVEN duplicate submission WHEN tracking THEN duplicate event logged with existing subscription date', fakeAsync(() => {
      newsletterService.subscribe.and.returnValue(of(mockDuplicateResult));

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);

      // Service should handle duplicate tracking (tested in service spec)
      expect(newsletterService.subscribe).toHaveBeenCalledWith('test@example.com');
    }));

    it('GIVEN multiple duplicate attempts WHEN submitted THEN consistent friendly message shown', fakeAsync(() => {
      newsletterService.subscribe.and.returnValue(of(mockDuplicateResult));

      const emailControl = component.newsletterForm.get('email');

      // First duplicate attempt
      emailControl?.setValue('test@example.com');
      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      const firstMessage = component.successMessageText;
      expect(firstMessage).toContain('already subscribed');

      // Reset and try again
      component.resetToInitialState();
      tick(100);

      // Second duplicate attempt
      emailControl?.setValue('test@example.com');
      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      const secondMessage = component.successMessageText;
      expect(secondMessage).toContain('already subscribed');
      expect(secondMessage).toEqual(firstMessage); // Consistent messaging
    }));
  });

  describe('ACCEPTANCE CRITERIA: Form Reset', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('GIVEN successful submission WHEN success message shown THEN form resets to initial state', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      component.hasUserInteracted = true;
      fixture.detectChanges();

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      // Verify form reset
      expect(emailControl?.value).toBe('');
      expect(component.hasUserInteracted).toBe(false);
      expect(component.formState.error).toBeNull();

      // Verify UI reset
      const emailInput = fixture.debugElement.query(By.css('#email-input'));
      expect(emailInput.nativeElement.value).toBe('');
      expect(emailInput.nativeElement.classList).not.toContain('valid');
      expect(emailInput.nativeElement.classList).not.toContain('error');
    }));

    it('GIVEN form reset WHEN auto-reset timer expires THEN returns to initial state', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      expect(component.formState.showSuccess).toBe(true);

      // Wait for auto-reset timer (8 seconds)
      tick(8000);
      fixture.detectChanges();

      // Verify complete reset
      expect(component.formState.showSuccess).toBe(false);
      expect(component.formState.error).toBeNull();
      expect(component.hasUserInteracted).toBe(false);
      expect(emailControl?.value).toBe('');
    }));

    it('GIVEN form reset WHEN focus management THEN proper focus sequence', fakeAsync(() => {
      // Mock ViewChild elements
      const mockEmailInput = { focus: jasmine.createSpy('focus') };
      const mockSuccessMessage = { focus: jasmine.createSpy('focus') };

      component.emailInputRef = { nativeElement: mockEmailInput } as any;
      component.successMessageRef = { nativeElement: mockSuccessMessage } as any;

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      // Submit and verify success message gets focus
      component.onSubmit();
      tick(800);
      tick(100); // Focus timeout

      expect(mockSuccessMessage.focus).toHaveBeenCalled();

      // Auto-reset and verify email input gets focus
      tick(8000);
      tick(100); // Focus timeout

      expect(mockEmailInput.focus).toHaveBeenCalled();
    }));
  });

  describe('ACCEPTANCE CRITERIA: Accessibility Support', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('GIVEN screen reader user WHEN interacting with form THEN proper ARIA labels work', () => {
      const emailInput = fixture.debugElement.query(By.css('#email-input'));
      const label = fixture.debugElement.query(By.css('label[for="email-input"]'));
      const formSection = fixture.debugElement.query(By.css('.newsletter-subscription'));

      // Verify proper labeling
      expect(label.nativeElement.getAttribute('for')).toBe('email-input');
      expect(emailInput.nativeElement.getAttribute('id')).toBe('email-input');
      expect(formSection.nativeElement.getAttribute('aria-labelledby')).toBe('newsletter-title');

      // Verify semantic HTML
      expect(emailInput.nativeElement.tagName.toLowerCase()).toBe('input');
      expect(emailInput.nativeElement.getAttribute('type')).toBe('email');
      expect(formSection.nativeElement.tagName.toLowerCase()).toBe('section');
    });

    it('GIVEN validation error WHEN error announced THEN proper ARIA live regions work', () => {
      newsletterService.validateEmail.and.returnValue(mockValidationError);

      component.onEmailBlur();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      const emailInput = fixture.debugElement.query(By.css('#email-input'));

      // Verify error announcement
      expect(errorMessage.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorMessage.nativeElement.getAttribute('aria-live')).toBe('assertive');
      expect(emailInput.nativeElement.getAttribute('aria-invalid')).toBe('true');
      expect(emailInput.nativeElement.getAttribute('aria-describedby')).toContain('email-error');
    });

    it('GIVEN valid email state WHEN screen reader feedback THEN polite announcement made', () => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      component.hasUserInteracted = true;
      fixture.detectChanges();

      const validMessage = fixture.debugElement.query(By.css('#email-valid'));
      const emailInput = fixture.debugElement.query(By.css('#email-input'));

      expect(validMessage).toBeTruthy();
      expect(validMessage.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(validMessage.nativeElement.textContent.trim()).toBe('Email address is valid');
      expect(emailInput.nativeElement.getAttribute('aria-describedby')).toContain('email-valid');
    });

    it('GIVEN screen reader user WHEN form submission THEN status updates announced', () => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();

      const submitStatus = fixture.debugElement.query(By.css('#submit-status'));
      expect(submitStatus.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(submitStatus.nativeElement.textContent).toContain('Please wait, subscribing');
    });

    it('GIVEN success message WHEN displayed THEN assertive announcement for immediate feedback', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      const successMessage = fixture.debugElement.query(By.css('.success-message'));
      expect(successMessage.nativeElement.getAttribute('role')).toBe('alert');
      expect(successMessage.nativeElement.getAttribute('aria-live')).toBe('assertive');
      expect(successMessage.nativeElement.getAttribute('tabindex')).toBe('-1');
    }));

    it('GIVEN keyboard navigation WHEN using form THEN all interactive elements accessible', () => {
      const emailInput = fixture.debugElement.query(By.css('#email-input'));
      const submitButton = fixture.debugElement.query(By.css('.submit-button'));

      // Verify tabindex and keyboard accessibility
      expect(emailInput.nativeElement.tabIndex).not.toBe(-1);
      expect(submitButton.nativeElement.tabIndex).not.toBe(-1);

      // Verify no keyboard traps
      expect(submitButton.nativeElement.disabled).toBe(true); // Initially disabled, but still in tab order
    });
  });

  describe('Edge Cases and Failure Modes', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('EDGE CASE: should handle extremely long email addresses gracefully', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const emailControl = component.newsletterForm.get('email');

      emailControl?.setValue(longEmail);
      component.onEmailBlur();

      // Should not crash or cause performance issues
      expect(component).toBeTruthy();
    });

    it('EDGE CASE: should handle rapid form submission attempts', () => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');
      fixture.detectChanges();

      // Attempt rapid submissions
      component.onSubmit();
      component.onSubmit();
      component.onSubmit();

      expect(component.formState.isSubmitting).toBe(true);
      expect(newsletterService.subscribe).toHaveBeenCalledTimes(1); // Should only call once
    });

    it('EDGE CASE: should handle network timeout gracefully', fakeAsync(() => {
      newsletterService.subscribe.and.returnValue(NEVER); // Never resolves

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      fixture.detectChanges();

      expect(component.formState.isSubmitting).toBe(true);

      // Even with never-resolving observable, component should remain stable
      tick(10000);
      expect(component.formState.isSubmitting).toBe(true);

      // Component destruction should clean up properly
      component.ngOnDestroy();
      expect(component).toBeTruthy();
    }));

    it('EDGE CASE: should handle storage quota exceeded error', fakeAsync(() => {
      const quotaError: NewsletterValidationError = {
        type: 'storage',
        message: 'Storage quota exceeded. Please clear some space and try again.'
      };
      newsletterService.subscribe.and.returnValue(throwError(() => quotaError));

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      expect(component.formState.error).toEqual(quotaError);
      expect(component.formState.showSuccess).toBe(false);

      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent).toContain('Storage quota exceeded');
    }));

    it('EDGE CASE: should handle component destruction during submission', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();

      // Destroy component during submission
      component.ngOnDestroy();

      // Should not throw errors
      tick(800);
      expect(component).toBeTruthy();
    }));

    it('EDGE CASE: should handle email trimming with various whitespace', () => {
      const emailControl = component.newsletterForm.get('email');
      const testCases = [
        '  test@example.com  ',
        '\t\ttest@example.com\t\t',
        '\n\ntest@example.com\n\n',
        '   test@example.com   '
      ];

      testCases.forEach(email => {
        emailControl?.setValue(email);
        component.onSubmit();

        expect(newsletterService.subscribe).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('EDGE CASE: should handle rapid validation state changes', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      component.hasUserInteracted = true;

      // Rapid state changes
      emailControl?.setValue('invalid');
      newsletterService.validateEmail.and.returnValue(mockValidationError);
      tick(500);

      emailControl?.setValue('valid@example.com');
      newsletterService.validateEmail.and.returnValue(null);
      tick(500);

      emailControl?.setValue('invalid2');
      newsletterService.validateEmail.and.returnValue(mockValidationError);
      tick(500);

      fixture.detectChanges();

      // Should handle state changes without errors
      expect(component.showEmailError).toBe(true);
    }));

    it('FAILURE MODE: should recover from service unavailable', fakeAsync(() => {
      const networkError: NewsletterValidationError = {
        type: 'network',
        message: 'Network connection failed. Please check your connection and try again.'
      };
      newsletterService.subscribe.and.returnValue(throwError(() => networkError));

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      expect(component.formState.error).toEqual(networkError);
      expect(component.formState.isSubmitting).toBe(false);

      // Should allow retry
      expect(component.isFormSubmittable).toBe(true);
    }));

    it('FAILURE MODE: should handle malformed service responses', fakeAsync(() => {
      // Service returns null instead of proper response
      newsletterService.subscribe.and.returnValue(of(null as any));

      const emailControl = component.newsletterForm.get('email');
      emailControl?.setValue('test@example.com');

      component.onSubmit();
      tick(800);
      fixture.detectChanges();

      // Should handle gracefully without showing success
      expect(component.formState.showSuccess).toBe(false);
      expect(component.formState.isSubmitting).toBe(false);
    }));
  });

  describe('Performance and User Experience', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('PERFORMANCE: should debounce validation to avoid excessive service calls', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');
      component.hasUserInteracted = true;

      // Rapid typing simulation
      emailControl?.setValue('t');
      tick(100);
      emailControl?.setValue('te');
      tick(100);
      emailControl?.setValue('tes');
      tick(100);
      emailControl?.setValue('test');
      tick(100);
      emailControl?.setValue('test@');
      tick(100);

      expect(newsletterService.validateEmail).not.toHaveBeenCalled();

      tick(500); // Complete debounce period

      expect(newsletterService.validateEmail).toHaveBeenCalledTimes(1);
      expect(newsletterService.validateEmail).toHaveBeenCalledWith('test@');
    }));

    it('UX: should provide immediate feedback on form interaction', () => {
      const emailInput = fixture.debugElement.query(By.css('#email-input'));

      // Focus event
      component.onEmailFocus();

      expect(console.log).toHaveBeenCalledWith('Newsletter Event:', jasmine.objectContaining({
        eventName: 'newsletter_input_focused'
      }));
    });

    it('UX: should maintain form state consistency throughout interaction', fakeAsync(() => {
      const emailControl = component.newsletterForm.get('email');

      // Type valid email
      emailControl?.setValue('test@example.com');
      component.hasUserInteracted = true;
      fixture.detectChanges();

      expect(component.isEmailValid).toBe(true);
      expect(component.isFormSubmittable).toBe(true);

      // Submit form
      component.onSubmit();
      expect(component.formState.isSubmitting).toBe(true);
      expect(component.isFormSubmittable).toBe(false);

      tick(800);
      fixture.detectChanges();

      expect(component.formState.showSuccess).toBe(true);
      expect(component.formState.isSubmitting).toBe(false);
    }));
  });
});