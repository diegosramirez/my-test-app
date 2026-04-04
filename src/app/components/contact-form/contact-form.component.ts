import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, AbstractControl } from '@angular/forms';
import { Subject, debounceTime, takeUntil, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { ContactService } from '../../services/contact.service';
import { ContactFormValidators } from '../../utils/contact-form.validators';
import { ContactFormData, FormSubmissionResponse } from '../../interfaces/contact-form.interfaces';

/**
 * Contact form component with progressive validation and accessibility features
 * Implements blur-first validation strategy with real-time validation after first interaction
 */
@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
})
export class ContactFormComponent implements OnInit, OnDestroy {
  contactForm!: FormGroup;
  isSubmitting = false;
  submissionSuccess = false;
  submissionMessage = '';
  networkError = false;
  retryCount = 0;

  // Track which fields have been interacted with for progressive validation
  private fieldInteracted = new Set<string>();
  private destroy$ = new Subject<void>();

  // Character limits
  readonly NAME_MAX_LENGTH = 50;
  readonly MESSAGE_MAX_LENGTH = 1000;

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupProgressiveValidation();
    this.trackFormInteraction();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the reactive form with validators
   */
  private initializeForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [
        ContactFormValidators.required,
        ContactFormValidators.minLength(2),
        ContactFormValidators.maxLength(this.NAME_MAX_LENGTH)
      ]],
      email: ['', [
        ContactFormValidators.required,
        ContactFormValidators.email
      ]],
      phone: ['', [ContactFormValidators.phoneNumber]],
      message: ['', [
        ContactFormValidators.required,
        ContactFormValidators.maxLength(this.MESSAGE_MAX_LENGTH),
        ContactFormValidators.meaningfulMessage
      ]]
    }, {
      validators: [ContactFormValidators.contactFormValidator]
    });
  }

  /**
   * Setup progressive validation: blur-first, then real-time
   */
  private setupProgressiveValidation(): void {
    Object.keys(this.contactForm.controls).forEach(fieldName => {
      const control = this.contactForm.get(fieldName);
      if (control) {
        // Setup debounced validation for real-time feedback
        control.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          if (this.fieldInteracted.has(fieldName)) {
            // Only trigger real-time validation after first interaction
            control.updateValueAndValidity({ emitEvent: false });
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  /**
   * Track form interaction for analytics and validation strategy
   */
  private trackFormInteraction(): void {
    this.contactForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Track form interaction events for analytics
      this.trackEvent('form_interaction', {
        fields_completed: this.getCompletedFieldsCount(),
        form_valid: this.contactForm.valid
      });
    });
  }

  /**
   * Handle field blur events for progressive validation
   */
  onFieldBlur(fieldName: string): void {
    const control = this.contactForm.get(fieldName);
    if (control) {
      this.fieldInteracted.add(fieldName);
      control.markAsTouched();
      control.updateValueAndValidity();

      // Track validation errors
      if (control.errors) {
        const errorType = Object.keys(control.errors)[0];
        this.trackEvent('form_validation_error', {
          field_name: fieldName,
          error_type: errorType,
          validation_timing: 'blur'
        });
      }
    }
  }

  /**
   * Handle input events for character counting and real-time validation
   */
  onFieldInput(fieldName: string): void {
    const control = this.contactForm.get(fieldName);
    if (control && (fieldName === 'name' || fieldName === 'message')) {
      const currentLength = control.value?.length || 0;
      const maxLength = fieldName === 'name' ? this.NAME_MAX_LENGTH : this.MESSAGE_MAX_LENGTH;

      // Track character limit warnings
      if (currentLength >= maxLength * 0.9) {
        this.trackEvent('character_limit_reached', {
          field_name: fieldName,
          character_count: currentLength,
          limit_percentage: (currentLength / maxLength) * 100
        });
      }
    }
  }

  /**
   * Submit the contact form
   */
  async onSubmit(): Promise<void> {
    if (this.contactForm.invalid || this.isSubmitting) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submissionSuccess = false;
    this.networkError = false;
    this.submissionMessage = '';

    try {
      const formData: ContactFormData = this.contactForm.value;

      // Check network status before submission
      const networkStatus = await firstValueFrom(this.contactService.checkNetworkStatus());
      if (!networkStatus) {
        this.networkError = true;
        this.submissionMessage = 'No internet connection. Please check your connection and try again.';
        this.isSubmitting = false;
        this.cdr.markForCheck();
        return;
      }

      // Submit form data
      const response = await firstValueFrom(this.contactService.submitContactForm(formData));

      if (response?.success) {
        this.submissionSuccess = true;
        this.submissionMessage = response.message;
        this.contactForm.reset();
        this.fieldInteracted.clear();
        this.retryCount = 0;
        this.cdr.markForCheck();

        // Track successful submission
        this.trackEvent('contact_form_submitted', {
          success_status: true,
          retry_count: this.retryCount,
          form_data: {
            has_phone: !!formData.phone,
            message_length: formData.message.length
          }
        });
      } else {
        this.handleSubmissionError(response);
      }
    } catch (error) {
      this.handleSubmissionError(null, error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle form submission errors
   */
  private handleSubmissionError(response?: FormSubmissionResponse | null, error?: any): void {
    this.retryCount++;
    this.submissionSuccess = false;

    if (response && !response.success) {
      this.submissionMessage = response.message;

      // Handle field-specific errors
      if (response.errors) {
        Object.keys(response.errors).forEach(fieldName => {
          const control = this.contactForm.get(fieldName);
          if (control && response.errors![fieldName]) {
            control.setErrors({
              serverError: {
                message: response.errors![fieldName][0]
              }
            });
          }
        });
      }
    } else {
      this.networkError = true;
      this.submissionMessage = 'Unable to submit your message. Please try again.';
    }

    this.cdr.markForCheck();

    // Track submission error
    this.trackEvent('contact_form_submitted', {
      success_status: false,
      retry_count: this.retryCount,
      error_type: error?.name || 'unknown'
    });
  }

  /**
   * Retry form submission
   */
  onRetrySubmission(): void {
    if (this.retryCount < 3) {
      this.onSubmit();
    }
  }

  /**
   * Reset form to initial state
   */
  onSendAnother(): void {
    this.contactForm.reset();
    this.submissionSuccess = false;
    this.submissionMessage = '';
    this.networkError = false;
    this.retryCount = 0;
    this.fieldInteracted.clear();

    // Focus first field for accessibility
    setTimeout(() => {
      const firstInput = document.querySelector('input[formControlName="name"]') as HTMLElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.contactForm.controls).forEach(fieldName => {
      const control = this.contactForm.get(fieldName);
      if (control) {
        control.markAsTouched();
        this.fieldInteracted.add(fieldName);
      }
    });
  }

  /**
   * Get error message for a specific field
   */
  getFieldError(fieldName: string): string {
    const control = this.contactForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }
    return ContactFormValidators.getErrorMessage(control);
  }

  /**
   * Check if field should show error state
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.contactForm.get(fieldName);
    return !!(control && control.errors &&
             (control.touched || this.fieldInteracted.has(fieldName)));
  }

  /**
   * Get character count for a field
   */
  getCharacterCount(fieldName: string): number {
    const control = this.contactForm.get(fieldName);
    return control?.value?.length || 0;
  }

  /**
   * Get character count message
   */
  getCharacterCountMessage(fieldName: string): string {
    const currentLength = this.getCharacterCount(fieldName);
    const maxLength = fieldName === 'name' ? this.NAME_MAX_LENGTH : this.MESSAGE_MAX_LENGTH;
    return `${currentLength}/${maxLength} characters`;
  }

  /**
   * Check if character limit is approaching
   */
  isCharacterLimitApproaching(fieldName: string): boolean {
    const currentLength = this.getCharacterCount(fieldName);
    const maxLength = fieldName === 'name' ? this.NAME_MAX_LENGTH : this.MESSAGE_MAX_LENGTH;
    return currentLength >= maxLength * 0.8;
  }

  /**
   * Get number of completed fields for analytics
   */
  private getCompletedFieldsCount(): number {
    const formValue = this.contactForm.value;
    let count = 0;
    if (formValue.name?.trim()) count++;
    if (formValue.email?.trim()) count++;
    if (formValue.phone?.trim()) count++;
    if (formValue.message?.trim()) count++;
    return count;
  }

  /**
   * Track events for analytics (placeholder implementation)
   */
  private trackEvent(eventName: string, properties: any): void {
    // In a real application, this would integrate with analytics services
    console.log('Track Event:', eventName, properties);
  }

  /**
   * Generate unique ID for ARIA attributes
   */
  getFieldId(fieldName: string): string {
    return `contact-form-${fieldName}`;
  }

  /**
   * Generate unique ID for error message ARIA attributes
   */
  getErrorId(fieldName: string): string {
    return `contact-form-${fieldName}-error`;
  }

  /**
   * Get ARIA describedby attribute value
   */
  getAriaDescribedBy(fieldName: string): string {
    const ids = [this.getFieldId(fieldName) + '-help'];
    if (this.shouldShowError(fieldName)) {
      ids.push(this.getErrorId(fieldName));
    }
    return ids.join(' ');
  }
}