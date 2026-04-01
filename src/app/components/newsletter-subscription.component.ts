import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { ValidationState, AccessibilityAnnouncement } from '../interfaces/subscription.interface';

@Component({
  selector: 'app-newsletter-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="newsletter-subscription" role="region" aria-labelledby="subscription-heading">
      <h2 id="subscription-heading">Subscribe to our Newsletter</h2>

      <!-- Live region for accessibility announcements -->
      <div
        #liveRegion
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
        [attr.aria-live]="getCurrentAnnouncement()?.priority || 'polite'"
      >
        {{ getCurrentAnnouncement()?.message }}
      </div>

      <!-- Error live region for assertive announcements -->
      <div
        aria-live="assertive"
        aria-atomic="true"
        class="sr-only"
        *ngIf="getCurrentAnnouncement()?.priority === 'assertive'"
      >
        {{ getCurrentAnnouncement()?.message }}
      </div>

      <form (ngSubmit)="onSubmit()" #subscriptionForm="ngForm" novalidate>
        <div class="form-group">
          <label for="email-input" class="form-label">
            Email Address
            <span class="required-indicator" aria-label="required">*</span>
          </label>

          <input
            #emailInput
            type="email"
            id="email-input"
            name="email"
            class="form-input"
            [(ngModel)]="email"
            (input)="onEmailInput($event)"
            (blur)="onEmailBlur()"
            [class.error]="validationState.hasError"
            [class.success]="validationState.successMessage && !validationState.hasError"
            [class.validating]="validationState.isValidating"
            [attr.aria-describedby]="getAriaDescribedBy()"
            [attr.aria-invalid]="validationState.hasError"
            autocomplete="email"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            placeholder="Enter your email address"
            required
          />

          <!-- Loading indicator -->
          <div
            class="validation-spinner"
            *ngIf="validationState.isValidating"
            role="status"
            aria-label="Validating email address"
          >
            <span class="spinner"></span>
            <span class="sr-only">Validating email address...</span>
          </div>

          <!-- Real-time validation feedback -->
          <div class="validation-feedback">
            <!-- Error messages -->
            <div
              *ngIf="validationState.hasError && validationState.errorMessage"
              id="error-message"
              class="error-message"
              role="alert"
              aria-live="assertive"
            >
              <span class="error-icon" aria-hidden="true">⚠</span>
              {{ validationState.errorMessage }}
            </div>

            <!-- Success message -->
            <div
              *ngIf="validationState.successMessage && !validationState.hasError"
              id="success-message"
              class="success-message"
              role="status"
              aria-live="polite"
            >
              <span class="success-icon" aria-hidden="true">✓</span>
              {{ validationState.successMessage }}
            </div>

            <!-- Format suggestions -->
            <div
              *ngIf="emailSuggestion"
              class="suggestion-message"
              role="status"
            >
              Did you mean: <button
                type="button"
                class="suggestion-link"
                (click)="applySuggestion()"
                [attr.aria-label]="'Use suggested email ' + emailSuggestion"
              >
                {{ emailSuggestion }}
              </button>?
            </div>
          </div>
        </div>

        <button
          type="submit"
          class="submit-button"
          [disabled]="isSubmitDisabled()"
          [attr.aria-describedby]="getSubmitAriaDescribedBy()"
        >
          <span *ngIf="!validationState.isValidating">Subscribe</span>
          <span *ngIf="validationState.isValidating">
            <span class="button-spinner" aria-hidden="true"></span>
            Validating...
          </span>
        </button>
      </form>

      <!-- Storage information (for development/testing) -->
      <div class="storage-info" *ngIf="showStorageInfo">
        <h3>Storage Information</h3>
        <ul>
          <li>Storage Method: {{ storageInfo?.storageMethod }}</li>
          <li>Storage Available: {{ storageInfo?.storageAvailable ? 'Yes' : 'No' }}</li>
          <li>Total Subscriptions: {{ storageInfo?.totalSubscriptions }}</li>
        </ul>
      </div>

      <!-- Subscription list (for development/testing) -->
      <div class="subscriptions-list" *ngIf="showSubscriptionsList && subscriptions.length > 0">
        <h3>Current Subscriptions</h3>
        <ul>
          <li *ngFor="let subscription of subscriptions; trackBy: trackByEmail">
            {{ subscription.email }}
            <span class="subscription-meta">({{ subscription.timestamp | date:'short' }})</span>
            <button
              type="button"
              class="unsubscribe-button"
              (click)="unsubscribe(subscription.email)"
              [attr.aria-label]="'Unsubscribe ' + subscription.email"
            >
              Remove
            </button>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .newsletter-subscription {
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    .form-group {
      margin-bottom: 20px;
      position: relative;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .required-indicator {
      color: #e74c3c;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 16px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
    }

    .form-input.error {
      border-color: #e74c3c;
    }

    .form-input.error:focus {
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.2);
    }

    .form-input.success {
      border-color: #27ae60;
    }

    .form-input.validating {
      padding-right: 50px;
    }

    .validation-spinner {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      margin-top: 16px;
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .validation-feedback {
      margin-top: 8px;
      min-height: 20px;
    }

    .error-message {
      color: #e74c3c;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .success-message {
      color: #27ae60;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .suggestion-message {
      color: #7f8c8d;
      font-size: 14px;
      margin-top: 4px;
    }

    .suggestion-link {
      background: none;
      border: none;
      color: #3498db;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font: inherit;
    }

    .suggestion-link:hover {
      color: #2980b9;
    }

    .submit-button {
      width: 100%;
      padding: 12px 24px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .submit-button:hover:not(:disabled) {
      background-color: #2980b9;
      transform: translateY(-1px);
    }

    .submit-button:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
      transform: none;
    }

    .button-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .storage-info,
    .subscriptions-list {
      margin-top: 30px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }

    .storage-info h3,
    .subscriptions-list h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .storage-info ul,
    .subscriptions-list ul {
      margin: 0;
      padding-left: 20px;
    }

    .storage-info li,
    .subscriptions-list li {
      margin-bottom: 5px;
      font-size: 14px;
    }

    .subscription-meta {
      color: #7f8c8d;
      font-size: 12px;
    }

    .unsubscribe-button {
      background-color: #e74c3c;
      color: white;
      border: none;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 10px;
    }

    .unsubscribe-button:hover {
      background-color: #c0392b;
    }
  `]
})
export class NewsletterSubscriptionComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('emailInput', { static: true }) emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('liveRegion', { static: true }) liveRegionRef!: ElementRef<HTMLDivElement>;

  email = '';
  emailSuggestion: string | null = null;
  validationState: ValidationState = {
    isValidating: false,
    hasError: false
  };

  subscriptions: any[] = [];
  storageInfo: any = null;
  showStorageInfo = true; // Set to false in production
  showSubscriptionsList = true; // Set to false in production

  private destroy$ = new Subject<void>();
  private emailInput$ = new Subject<string>();

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    // Subscribe to validation state changes
    this.subscriptionService.validationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.validationState = state;
        this.announceToScreenReader(state.announcement);
      });

    // Set up debounced real-time validation
    this.emailInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(email => {
        if (email.length > 0) {
          this.performRealTimeValidation(email);
        }
      });

    // Load initial data
    this.loadSubscriptions();
    this.loadStorageInfo();
  }

  ngAfterViewInit(): void {
    // Set initial focus for accessibility
    setTimeout(() => {
      this.emailInputRef.nativeElement.focus();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onEmailInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.email = target.value;

    // Clear suggestion when user types
    this.emailSuggestion = null;

    // Trigger real-time validation
    this.emailInput$.next(this.email);
  }

  onEmailBlur(): void {
    if (this.email) {
      this.checkForSuggestions();
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.email.trim()) {
      this.announceToScreenReader({
        message: 'Please enter an email address.',
        priority: 'assertive',
        type: 'error'
      });
      this.emailInputRef.nativeElement.focus();
      return;
    }

    const result = await this.subscriptionService.subscribe(this.email);

    if (result.success) {
      this.email = '';
      await this.loadSubscriptions();
      this.announceToScreenReader({
        message: result.message,
        priority: 'polite',
        type: 'success'
      });
    } else {
      this.announceToScreenReader({
        message: result.error.message,
        priority: 'assertive',
        type: 'error'
      });
    }
  }

  async unsubscribe(email: string): Promise<void> {
    const success = await this.subscriptionService.unsubscribe(email);

    if (success) {
      await this.loadSubscriptions();
      this.announceToScreenReader({
        message: `Successfully removed ${email} from subscription list.`,
        priority: 'polite',
        type: 'success'
      });
    } else {
      this.announceToScreenReader({
        message: `Failed to remove ${email}. Please try again.`,
        priority: 'assertive',
        type: 'error'
      });
    }
  }

  applySuggestion(): void {
    if (this.emailSuggestion) {
      this.email = this.emailSuggestion;
      this.emailSuggestion = null;
      this.emailInputRef.nativeElement.focus();

      this.announceToScreenReader({
        message: `Email updated to ${this.email}`,
        priority: 'polite',
        type: 'info'
      });
    }
  }

  isSubmitDisabled(): boolean {
    return !this.email.trim() ||
           this.validationState.isValidating ||
           this.validationState.hasError;
  }

  getAriaDescribedBy(): string {
    const ids: string[] = [];

    if (this.validationState.hasError) {
      ids.push('error-message');
    }

    if (this.validationState.successMessage && !this.validationState.hasError) {
      ids.push('success-message');
    }

    return ids.join(' ');
  }

  getSubmitAriaDescribedBy(): string {
    if (this.isSubmitDisabled()) {
      return 'submit-disabled-help';
    }
    return '';
  }

  getCurrentAnnouncement(): AccessibilityAnnouncement | undefined {
    return this.validationState.announcement;
  }

  trackByEmail(index: number, subscription: any): string {
    return subscription.email;
  }

  private async performRealTimeValidation(email: string): Promise<void> {
    // Only perform format validation for real-time feedback
    const formatCheck = this.subscriptionService.validateFormatSync(email);

    if (!formatCheck.isValid) {
      // Don't show format errors immediately, wait for user to finish typing
      return;
    }

    // Check for suggestions
    this.checkForSuggestions();
  }

  private checkForSuggestions(): void {
    if (!this.email) return;

    // Use the email validator to get suggestions
    const suggestion = (this.subscriptionService as any).emailValidator.getSuggestedDomain(this.email);

    if (suggestion) {
      const [localPart] = this.email.split('@');
      this.emailSuggestion = `${localPart}@${suggestion}`;
    }
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      this.subscriptions = await this.subscriptionService.getSubscriptions();
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  }

  private async loadStorageInfo(): Promise<void> {
    try {
      this.storageInfo = await this.subscriptionService.getStorageInfo();
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  }

  private announceToScreenReader(announcement?: AccessibilityAnnouncement): void {
    if (!announcement || !this.liveRegionRef) return;

    // Update the live region content
    setTimeout(() => {
      if (this.liveRegionRef?.nativeElement) {
        this.liveRegionRef.nativeElement.textContent = announcement.message;
      }
    }, 100);
  }
}