import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { NewsletterService } from './newsletter.service';
import {
  NewsletterFormState,
  NewsletterValidationError,
  NewsletterSubmissionResult
} from './newsletter.interface';

@Component({
  selector: 'app-newsletter-subscription',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="newsletter-subscription" [attr.aria-labelledby]="'newsletter-title'">
      <div class="newsletter-container">
        <h2 id="newsletter-title" class="newsletter-title">
          Stay Updated
        </h2>
        <p class="newsletter-description">
          Get the latest news and updates delivered straight to your inbox.
        </p>

        <form
          [formGroup]="newsletterForm"
          (ngSubmit)="onSubmit()"
          class="newsletter-form"
          novalidate
        >
          <div class="form-group">
            <label for="email-input" class="email-label">
              Email Address
            </label>
            <div class="input-container">
              <input
                #emailInput
                id="email-input"
                type="email"
                formControlName="email"
                class="email-input"
                [class.valid]="isEmailValid && !formState.error"
                [class.error]="showEmailError"
                placeholder="Enter your email address"
                [attr.aria-describedby]="getAriaDescribedBy()"
                [attr.aria-invalid]="showEmailError"
                autocomplete="email"
                (blur)="onEmailBlur()"
                (focus)="onEmailFocus()"
              />
              <div class="input-icons" aria-hidden="true">
                <span
                  *ngIf="isEmailValid && !formState.error"
                  class="success-icon"
                  title="Valid email"
                >
                  ✓
                </span>
                <span
                  *ngIf="formState.isSubmitting"
                  class="loading-spinner"
                  title="Submitting..."
                ></span>
              </div>
            </div>

            <!-- Email validation error -->
            <div
              *ngIf="showEmailError"
              id="email-error"
              class="error-message"
              role="alert"
              [attr.aria-live]="formState.error ? 'assertive' : 'off'"
            >
              {{ formState.error?.message }}
            </div>

            <!-- Email validation success indicator (for screen readers) -->
            <div
              *ngIf="isEmailValid && !formState.error && !formState.isSubmitting"
              id="email-valid"
              class="sr-only"
              aria-live="polite"
            >
              Email address is valid
            </div>
          </div>

          <button
            type="submit"
            class="submit-button"
            [disabled]="!isFormSubmittable"
            [attr.aria-describedby]="formState.isSubmitting ? 'submit-status' : null"
          >
            <span *ngIf="!formState.isSubmitting">Subscribe</span>
            <span *ngIf="formState.isSubmitting">Subscribing...</span>
          </button>

          <!-- Submit status for screen readers -->
          <div
            *ngIf="formState.isSubmitting"
            id="submit-status"
            class="sr-only"
            aria-live="polite"
          >
            Please wait, subscribing to newsletter...
          </div>
        </form>

        <!-- Success message -->
        <div
          *ngIf="formState.showSuccess"
          #successMessage
          class="success-message"
          role="alert"
          aria-live="assertive"
          tabindex="-1"
        >
          <div class="success-content">
            <span class="success-icon" aria-hidden="true">🎉</span>
            <div class="success-text">
              <h3 class="success-title">Successfully Subscribed!</h3>
              <p class="success-description">{{ successMessageText }}</p>
              <p class="success-next-steps">
                Check your email for a welcome message and updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./newsletter-subscription.component.css']
})
export class NewsletterSubscriptionComponent implements OnInit, OnDestroy {
  @ViewChild('successMessage') successMessageRef!: ElementRef;
  @ViewChild('emailInput') emailInputRef!: ElementRef;

  newsletterForm: FormGroup;
  formState: NewsletterFormState = {
    email: '',
    isValid: false,
    isSubmitting: false,
    showSuccess: false,
    error: null
  };

  successMessageText = '';
  private destroy$ = new Subject<void>();
  hasUserInteracted = false; // Made public for testing

  constructor(
    private fb: FormBuilder,
    private newsletterService: NewsletterService
  ) {
    this.newsletterForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupFormValidation();
    this.trackFormView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isEmailValid(): boolean {
    const emailControl = this.newsletterForm.get('email');
    return !!(emailControl?.valid && emailControl.value?.trim());
  }

  get showEmailError(): boolean {
    return !!(this.formState.error && this.hasUserInteracted);
  }

  get isFormSubmittable(): boolean {
    return this.isEmailValid && !this.formState.isSubmitting;
  }

  onEmailFocus(): void {
    this.trackEmailInputFocus();
  }

  onEmailBlur(): void {
    this.hasUserInteracted = true;
    this.validateCurrentEmail();
  }

  onSubmit(): void {
    if (!this.isFormSubmittable) {
      return;
    }

    const email = this.newsletterForm.get('email')?.value?.trim();
    if (!email) {
      return;
    }

    this.formState.isSubmitting = true;
    this.formState.error = null;

    this.newsletterService.subscribe(email)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.formState.isSubmitting = false;
        }),
        catchError((error: NewsletterValidationError) => {
          this.formState.error = error;
          return of(null);
        })
      )
      .subscribe((result: NewsletterSubmissionResult | null) => {
        if (result?.success) {
          this.handleSuccessfulSubmission(result);
        }
      });
  }

  getAriaDescribedBy(): string {
    const describedBy: string[] = [];

    if (this.showEmailError) {
      describedBy.push('email-error');
    }

    if (this.isEmailValid && !this.formState.error && !this.formState.isSubmitting) {
      describedBy.push('email-valid');
    }

    return describedBy.join(' ') || '';
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private setupFormValidation(): void {
    const emailControl = this.newsletterForm.get('email');

    if (emailControl) {
      emailControl.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(() => {
          if (this.hasUserInteracted) {
            this.validateCurrentEmail();
          }
        });
    }
  }

  private validateCurrentEmail(): void {
    const email = this.newsletterForm.get('email')?.value?.trim();

    if (!email) {
      this.formState.error = null;
      return;
    }

    const validationError = this.newsletterService.validateEmail(email);
    this.formState.error = validationError;
  }

  private handleSuccessfulSubmission(result: NewsletterSubmissionResult): void {
    this.successMessageText = result.message || '';
    this.formState.showSuccess = true;
    this.formState.error = null;

    // Reset form after successful submission
    this.newsletterForm.reset();
    this.hasUserInteracted = false;

    // Focus success message for accessibility
    setTimeout(() => {
      this.successMessageRef?.nativeElement?.focus();
    }, 100);

    // Auto-hide success message and reset form state after 8 seconds
    setTimeout(() => {
      this.resetToInitialState();
    }, 8000);
  }

  resetToInitialState(): void {
    this.formState = {
      email: '',
      isValid: false,
      isSubmitting: false,
      showSuccess: false,
      error: null
    };
    this.successMessageText = '';
    this.hasUserInteracted = false;

    // Focus back to email input
    setTimeout(() => {
      this.emailInputRef?.nativeElement?.focus();
    }, 100);
  }

  private trackFormView(): void {
    // Track that the form was viewed
    console.log('Newsletter Event:', {
      eventName: 'newsletter_form_viewed',
      properties: {
        page_location: window.location.pathname,
        timestamp: new Date().toISOString()
      }
    });
  }

  private trackEmailInputFocus(): void {
    // Track that the email input was focused
    console.log('Newsletter Event:', {
      eventName: 'newsletter_input_focused',
      properties: {
        user_session_id: sessionStorage.getItem('newsletter_session_id') || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
}