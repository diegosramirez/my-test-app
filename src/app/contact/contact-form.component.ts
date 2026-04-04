import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContactService } from './contact.service';
import { ContactFormData, ContactSubmissionState } from './contact-form.interfaces';
import { ContactFormValidators } from '../shared/validators/contact-form.validators';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="contact-form-container">
      <h1>Contact Us</h1>
      <p class="form-description">
        We'd love to hear from you. Send us a message and we'll respond as soon as possible.
      </p>

      <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" novalidate>
        <!-- Name Field -->
        <div class="form-group">
          <label for="name" class="form-label">
            Name <span class="required" aria-label="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            formControlName="name"
            class="form-input"
            [class.error]="isFieldInvalid('name')"
            [attr.aria-describedby]="isFieldInvalid('name') ? 'name-error' : null"
            placeholder="Your full name"
            autocomplete="name"
            (blur)="onFieldBlur('name')"
          />
          <div
            *ngIf="isFieldInvalid('name')"
            id="name-error"
            class="error-message"
            role="alert"
            aria-live="polite"
          >
            {{ getFieldError('name') }}
          </div>
        </div>

        <!-- Email Field -->
        <div class="form-group">
          <label for="email" class="form-label">
            Email Address <span class="required" aria-label="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            formControlName="email"
            class="form-input"
            [class.error]="isFieldInvalid('email')"
            [attr.aria-describedby]="isFieldInvalid('email') ? 'email-error' : null"
            placeholder="name@example.com"
            autocomplete="email"
            inputmode="email"
            (blur)="onFieldBlur('email')"
          />
          <div
            *ngIf="isFieldInvalid('email')"
            id="email-error"
            class="error-message"
            role="alert"
            aria-live="polite"
          >
            {{ getFieldError('email') }}
          </div>
        </div>

        <!-- Phone Field -->
        <div class="form-group">
          <label for="phone" class="form-label">
            Phone Number <span class="optional">(Optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            formControlName="phone"
            class="form-input"
            [class.error]="isFieldInvalid('phone')"
            [attr.aria-describedby]="isFieldInvalid('phone') ? 'phone-error' : null"
            placeholder="(555) 123-4567"
            autocomplete="tel"
            inputmode="tel"
            (blur)="onFieldBlur('phone')"
          />
          <div
            *ngIf="isFieldInvalid('phone')"
            id="phone-error"
            class="error-message"
            role="alert"
            aria-live="polite"
          >
            {{ getFieldError('phone') }}
          </div>
        </div>

        <!-- Message Field -->
        <div class="form-group">
          <label for="message" class="form-label">
            Message <span class="required" aria-label="required">*</span>
          </label>
          <div class="message-input-container">
            <textarea
              id="message"
              formControlName="message"
              class="form-textarea"
              [class.error]="isFieldInvalid('message')"
              [attr.aria-describedby]="getMessageAriaDescribedBy()"
              placeholder="How can we help you today?"
              rows="5"
              (blur)="onFieldBlur('message')"
              (input)="updateCharacterCount()"
            ></textarea>
            <div
              *ngIf="shouldShowCharacterCounter()"
              id="message-counter"
              class="character-counter"
              [class.warning]="isNearCharacterLimit()"
              [class.error]="isOverCharacterLimit()"
              aria-live="polite"
            >
              {{ getCharacterCount() }}/500 characters
            </div>
          </div>
          <div
            *ngIf="isFieldInvalid('message')"
            id="message-error"
            class="error-message"
            role="alert"
            aria-live="polite"
          >
            {{ getFieldError('message') }}
          </div>
        </div>

        <!-- Submit Button -->
        <div class="form-actions">
          <button
            type="submit"
            class="submit-button"
            [disabled]="!contactForm.valid || submissionState.isLoading"
            [attr.aria-describedby]="!contactForm.valid ? 'submit-disabled-reason' : null"
          >
            <span *ngIf="!submissionState.isLoading">Send Message</span>
            <span *ngIf="submissionState.isLoading" class="loading-content">
              <span class="spinner" aria-hidden="true"></span>
              Sending...
            </span>
          </button>

          <div
            *ngIf="!contactForm.valid"
            id="submit-disabled-reason"
            class="submit-help"
            aria-live="polite"
          >
            Please complete all required fields to send your message.
          </div>
        </div>

        <!-- Error State -->
        <div
          *ngIf="submissionState.error"
          class="submission-error"
          role="alert"
          aria-live="assertive"
        >
          <p>{{ submissionState.error }}</p>
          <button
            type="button"
            class="retry-button"
            (click)="retrySubmission()"
            [disabled]="submissionState.isLoading"
          >
            Try Again
          </button>
        </div>

        <!-- Success State -->
        <div
          *ngIf="submissionState.isSubmitted && !submissionState.error"
          class="submission-success"
          role="alert"
          aria-live="assertive"
        >
          <h2>Thank You!</h2>
          <p>Your message has been sent successfully. We'll get back to you within 1-2 business days.</p>
          <p class="next-steps">
            <strong>Next steps:</strong> Check your email for a confirmation message.
            If you need immediate assistance, please call us at (555) 123-4567.
          </p>
          <button
            type="button"
            class="new-message-button"
            (click)="resetForm()"
          >
            Send Another Message
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .contact-form-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }

    .form-description {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .required {
      color: #d73502;
    }

    .optional {
      color: #666;
      font-weight: normal;
      font-size: 0.9em;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      min-height: 44px; /* Touch target minimum */
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-input.error,
    .form-textarea.error {
      border-color: #d73502;
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .message-input-container {
      position: relative;
    }

    .character-counter {
      position: absolute;
      bottom: 8px;
      right: 12px;
      font-size: 0.85em;
      color: #666;
      background: rgba(255, 255, 255, 0.9);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .character-counter.warning {
      color: #856404;
      background: rgba(255, 243, 205, 0.9);
    }

    .character-counter.error {
      color: #721c24;
      background: rgba(248, 215, 218, 0.9);
    }

    .error-message {
      margin-top: 0.5rem;
      color: #d73502;
      font-size: 0.9em;
      line-height: 1.4;
    }

    .form-actions {
      margin-top: 2rem;
    }

    .submit-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, opacity 0.2s;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .submit-button:hover:not(:disabled) {
      background: #0056b3;
    }

    .submit-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .loading-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .submit-help {
      margin-top: 0.5rem;
      color: #666;
      font-size: 0.9em;
    }

    .submission-error {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
    }

    .retry-button {
      margin-top: 0.5rem;
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      min-height: 44px;
    }

    .retry-button:hover:not(:disabled) {
      background: #c82333;
    }

    .retry-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .submission-success {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      color: #155724;
    }

    .submission-success h2 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #155724;
    }

    .next-steps {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #c3e6cb;
    }

    .new-message-button {
      margin-top: 1rem;
      background: #28a745;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      min-height: 44px;
    }

    .new-message-button:hover {
      background: #218838;
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .contact-form-container {
        margin: 1rem;
        padding: 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .form-input,
      .form-textarea,
      .submit-button,
      .retry-button,
      .new-message-button {
        min-height: 48px; /* Larger touch targets for mobile */
      }

      .character-counter {
        position: static;
        margin-top: 0.5rem;
        text-align: right;
        background: transparent;
      }
    }
  `]
})
export class ContactFormComponent implements OnInit, OnDestroy {
  contactForm!: FormGroup;
  submissionState: ContactSubmissionState = {
    isLoading: false,
    isSubmitted: false,
    retryCount: 0,
    error: null
  };

  private destroy$ = new Subject<void>();
  private touchedFields = new Set<string>();
  private characterCount = 0;
  private readonly CHARACTER_LIMIT = 500;
  private readonly COUNTER_THRESHOLD = 400;

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.emitAnalyticsEvent('contact_form_viewed');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [ContactFormValidators.required]],
      email: ['', [ContactFormValidators.required, ContactFormValidators.email]],
      phone: ['', [ContactFormValidators.phone]],
      message: ['', [ContactFormValidators.required, ContactFormValidators.maxLength(this.CHARACTER_LIMIT)]]
    });
  }

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
    const field = this.contactForm.get(fieldName);

    if (field && field.errors) {
      this.emitAnalyticsEvent('validation_error', {
        field_name: fieldName,
        error_type: Object.keys(field.errors)[0],
        user_input_length: field.value ? field.value.length : 0
      });
    }
  }

  updateCharacterCount(): void {
    const messageField = this.contactForm.get('message');
    this.characterCount = messageField?.value ? messageField.value.length : 0;

    if (this.characterCount >= this.COUNTER_THRESHOLD) {
      this.emitAnalyticsEvent('character_limit_warning', {
        field_name: 'message',
        character_count: this.characterCount,
        limit: this.CHARACTER_LIMIT
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.errors && this.touchedFields.has(fieldName));
  }

  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.errors || !this.touchedFields.has(fieldName)) {
      return '';
    }

    const errorKey = Object.keys(field.errors)[0];
    const error = field.errors[errorKey];

    return error?.message || 'Invalid input';
  }

  shouldShowCharacterCounter(): boolean {
    return this.characterCount >= this.COUNTER_THRESHOLD;
  }

  isNearCharacterLimit(): boolean {
    return this.characterCount >= this.COUNTER_THRESHOLD && this.characterCount < this.CHARACTER_LIMIT;
  }

  isOverCharacterLimit(): boolean {
    return this.characterCount > this.CHARACTER_LIMIT;
  }

  getCharacterCount(): number {
    return this.characterCount;
  }

  getMessageAriaDescribedBy(): string | null {
    const describedBy = [];

    if (this.isFieldInvalid('message')) {
      describedBy.push('message-error');
    }

    if (this.shouldShowCharacterCounter()) {
      describedBy.push('message-counter');
    }

    const result = describedBy.join(' ');
    return result || null;
  }

  onSubmit(): void {
    if (!this.contactForm.valid || this.submissionState.isLoading) {
      return;
    }

    // Mark all fields as touched to show validation errors
    Object.keys(this.contactForm.controls).forEach(key => {
      this.touchedFields.add(key);
    });

    if (!this.contactForm.valid) {
      return;
    }

    this.submitForm();
  }

  private submitForm(): void {
    this.submissionState = {
      isLoading: true,
      isSubmitted: false,
      retryCount: this.submissionState.retryCount + 1,
      error: null
    };

    const formData: ContactFormData = this.contactForm.value;
    const startTime = Date.now();

    this.contactService.submitContactForm(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const submissionTime = Date.now() - startTime;

          this.submissionState = {
            isLoading: false,
            isSubmitted: true,
            retryCount: 0,
            error: null
          };

          this.emitAnalyticsEvent('contact_form_submitted', {
            form_data: formData,
            success_status: true,
            submission_time: submissionTime
          });
        },
        error: (error: Error) => {
          this.submissionState = {
            isLoading: false,
            isSubmitted: false,
            retryCount: this.submissionState.retryCount,
            error: error.message
          };

          this.emitAnalyticsEvent('submission_failed', {
            error_type: error.message,
            retry_count: this.submissionState.retryCount,
            network_status: navigator.onLine
          });
        }
      });
  }

  retrySubmission(): void {
    this.submitForm();
  }

  resetForm(): void {
    this.contactForm.reset();
    this.touchedFields.clear();
    this.characterCount = 0;
    this.submissionState = {
      isLoading: false,
      isSubmitted: false,
      retryCount: 0,
      error: null
    };
  }

  private emitAnalyticsEvent(eventName: string, properties: any = {}): void {
    // Analytics implementation would go here
    // For now, we'll just log to console for development
    console.log('Analytics Event:', {
      event_name: eventName,
      properties: {
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ...properties
      }
    });
  }
}