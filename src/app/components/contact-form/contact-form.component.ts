import { Component, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

import { FormFieldComponent } from '../form-field/form-field.component';
import { ContactService } from '../../services/contact.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ContactFormValidators } from '../../validators/contact-form.validators';
import { ContactFormData, ContactSubmissionResponse, FormSubmissionState } from '../../models/contact-form.models';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.css'
})
export class ContactFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Form state
  contactForm!: FormGroup;
  protected readonly submissionState = signal<FormSubmissionState>({
    isSubmitting: false,
    hasSubmitted: false,
    submissionError: null,
    retryCount: 0
  });

  protected readonly showSuccess = signal(false);
  protected readonly successMessage = signal('');

  // Computed properties
  protected readonly isFormValid = computed(() => this.contactForm?.valid ?? false);
  protected readonly canSubmit = computed(() =>
    this.isFormValid() && !this.submissionState().isSubmitting
  );

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private localStorageService: LocalStorageService,
    private analyticsService: AnalyticsService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.restoreFormData();
    this.analyticsService.startFormSession();
  }

  ngOnDestroy(): void {
    this.trackFormAbandonmentIfNeeded();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      this.saveFormData();
      // In modern browsers, custom messages are not shown, but the event still triggers
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private initializeForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [
        ContactFormValidators.required('Name'),
        ContactFormValidators.minLength(2, 'Name'),
        ContactFormValidators.maxLength(100, 'Name')
      ]],
      email: ['', [
        ContactFormValidators.required('Email'),
        ContactFormValidators.email(),
        ContactFormValidators.maxLength(255, 'Email')
      ]],
      phone: ['', [
        ContactFormValidators.phoneNumber(),
        ContactFormValidators.maxLength(20, 'Phone')
      ]],
      message: ['', [
        ContactFormValidators.required('Message'),
        ContactFormValidators.minLength(10, 'Message'),
        ContactFormValidators.maxLength(1000, 'Message'),
        ContactFormValidators.meaningfulContent()
      ]]
    });
  }

  private setupFormSubscriptions(): void {
    // Watch form value changes for auto-save
    this.contactForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveFormData();
    });

    // Watch individual field validation for analytics
    Object.keys(this.contactForm.controls).forEach(fieldName => {
      const control = this.contactForm.get(fieldName);
      if (control) {
        control.statusChanges.pipe(
          startWith(control.status),
          debounceTime(fieldName === 'message' ? 500 : 0), // Debounce message field
          takeUntil(this.destroy$)
        ).subscribe(() => {
          if (control.invalid && control.touched && control.errors) {
            const errorTypes = Object.keys(control.errors);
            errorTypes.forEach(errorType => {
              this.analyticsService.trackValidationError(fieldName, errorType);
            });
          }
        });
      }
    });
  }

  private restoreFormData(): void {
    const savedData = this.localStorageService.getFormData();
    if (savedData) {
      this.contactForm.patchValue(savedData);
    }
  }

  private saveFormData(): void {
    if (this.contactForm.dirty) {
      const formData = this.contactForm.value as ContactFormData;
      this.localStorageService.saveFormData(formData);
    }
  }

  private hasUnsavedChanges(): boolean {
    return this.contactForm.dirty && !this.submissionState().hasSubmitted;
  }

  private trackFormAbandonmentIfNeeded(): void {
    if (this.contactForm.dirty && !this.submissionState().hasSubmitted) {
      const completedFields = this.getCompletedFields();
      this.analyticsService.trackFormAbandonment(completedFields);
    }
  }

  private getCompletedFields(): string[] {
    const completed: string[] = [];
    Object.entries(this.contactForm.value).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.trim().length > 0) {
        completed.push(key);
      }
    });
    return completed;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const formData = this.contactForm.value as ContactFormData;

    this.submissionState.update(state => ({
      ...state,
      isSubmitting: true,
      submissionError: null
    }));

    this.analyticsService.trackFormSubmission(this.submissionState().retryCount);

    this.contactService.submitContactForm(formData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ContactSubmissionResponse) => {
        this.handleSubmissionSuccess(response);
      },
      error: (error: any) => {
        this.handleSubmissionError(error);
      }
    });
  }

  private handleSubmissionSuccess(response: ContactSubmissionResponse): void {
    this.submissionState.update(state => ({
      ...state,
      isSubmitting: false,
      hasSubmitted: true,
      submissionError: null,
      retryCount: 0
    }));

    this.showSuccess.set(true);
    this.successMessage.set(response.message || 'Thank you! Your message has been sent successfully.');

    // Clear saved form data
    this.localStorageService.clearFormData();
    this.contactForm.markAsPristine();

    // Track success
    if (response.submissionId) {
      this.analyticsService.trackFormSuccess(response.submissionId);
    }

    // Reset form after a delay
    setTimeout(() => {
      this.resetForm();
    }, 5000);
  }

  private handleSubmissionError(error: any): void {
    const newRetryCount = this.submissionState().retryCount + 1;

    this.submissionState.update(state => ({
      ...state,
      isSubmitting: false,
      submissionError: error.userMessage || 'An error occurred. Please try again.',
      retryCount: newRetryCount
    }));

    // Focus on the first invalid field or the submit button
    this.focusFirstErrorOrSubmit();

    // Log error for debugging
    console.error('Contact form submission error:', error);
  }

  onRetry(): void {
    this.submissionState.update(state => ({
      ...state,
      submissionError: null
    }));

    this.onSubmit();
  }

  onDismissError(): void {
    this.submissionState.update(state => ({
      ...state,
      submissionError: null
    }));
  }

  onDismissSuccess(): void {
    this.showSuccess.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.contactForm.reset();
    this.submissionState.set({
      isSubmitting: false,
      hasSubmitted: false,
      submissionError: null,
      retryCount: 0
    });
    this.showSuccess.set(false);
    this.successMessage.set('');
  }

  private focusFirstErrorOrSubmit(): void {
    // Find the first field with an error
    const formControls = Object.keys(this.contactForm.controls);
    for (const fieldName of formControls) {
      const control = this.contactForm.get(fieldName);
      if (control?.invalid && control?.touched) {
        const element = document.getElementById(`field-${fieldName}`);
        if (element) {
          element.focus();
          return;
        }
      }
    }

    // If no field errors, focus the submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
      submitButton.focus();
    }
  }

  // Methods for template
  getFieldErrors(fieldName: string): string[] {
    const control = this.contactForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return [];
    }

    const errors: string[] = [];
    Object.values(control.errors).forEach((error: any) => {
      if (error && typeof error === 'object' && error.message) {
        errors.push(error.message);
      }
    });

    return errors;
  }

  isFieldTouched(fieldName: string): boolean {
    return this.contactForm.get(fieldName)?.touched ?? false;
  }

  getFormData(): ContactFormData {
    return this.contactForm.value as ContactFormData;
  }
}