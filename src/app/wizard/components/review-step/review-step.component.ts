import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormWizardService } from '../../services/form-wizard.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WizardFormData, WizardStep, FormSubmissionResult } from '../../models/wizard-form-data.interface';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 id="review-heading">Review Your Information</h2>
        <p class="step-description">Please review your information below and submit when ready.</p>
      </div>

      <div class="review-content" *ngIf="formData">
        <div class="review-section">
          <div class="section-header">
            <h3>Personal Information</h3>
            <button
              type="button"
              class="edit-button"
              (click)="editStep('personal')"
              aria-label="Edit personal information"
            >
              Edit
            </button>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">{{ formData.personalInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">{{ formData.personalInfo.email }}</span>
            </div>
            <div class="info-item">
              <span class="label">Phone:</span>
              <span class="value">{{ formData.personalInfo.phone }}</span>
            </div>
          </div>
        </div>

        <div class="review-section">
          <div class="section-header">
            <h3>Address Information</h3>
            <button
              type="button"
              class="edit-button"
              (click)="editStep('address')"
              aria-label="Edit address information"
            >
              Edit
            </button>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Street Address:</span>
              <span class="value">{{ formData.addressInfo.street }}</span>
            </div>
            <div class="info-item">
              <span class="label">City:</span>
              <span class="value">{{ formData.addressInfo.city }}</span>
            </div>
            <div class="info-item">
              <span class="label">State:</span>
              <span class="value">{{ getStateName(formData.addressInfo.state) }}</span>
            </div>
            <div class="info-item">
              <span class="label">ZIP Code:</span>
              <span class="value">{{ formData.addressInfo.zipCode }}</span>
            </div>
          </div>
        </div>

        <div class="submission-section">
          <button
            type="button"
            class="submit-button"
            [disabled]="isSubmitting"
            (click)="submitForm()"
            [attr.aria-describedby]="submissionError ? 'submission-error' : null"
          >
            <span *ngIf="!isSubmitting">Submit Application</span>
            <span *ngIf="isSubmitting" class="loading-content">
              <span class="spinner" aria-hidden="true"></span>
              Submitting...
            </span>
          </button>

          <div
            *ngIf="submissionError"
            id="submission-error"
            class="error-message"
            role="alert"
            aria-live="polite"
          >
            <strong>Submission Failed:</strong> {{ submissionError }}
            <button
              type="button"
              class="retry-button"
              (click)="submitForm()"
              [disabled]="isSubmitting"
            >
              Try Again
            </button>
          </div>

          <div
            *ngIf="submissionSuccess"
            class="success-message"
            role="alert"
            aria-live="polite"
          >
            <div class="success-icon" aria-hidden="true">🎉</div>
            <h3>Application Submitted Successfully!</h3>
            <p>Your application has been received. Confirmation ID: <strong>{{ submissionId }}</strong></p>
            <p>You'll receive a confirmation email shortly with next steps.</p>
            <button
              type="button"
              class="start-new-button"
              (click)="startNewApplication()"
            >
              Start New Application
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
    }

    .step-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .step-header h2 {
      color: #212529;
      margin-bottom: 0.5rem;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .step-description {
      color: #6c757d;
      font-size: 1rem;
      margin: 0;
    }

    .review-section {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #e9ecef;
    }

    .section-header h3 {
      margin: 0;
      color: #495057;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .edit-button {
      padding: 0.375rem 0.75rem;
      border: 1px solid #007bff;
      background-color: transparent;
      color: #007bff;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .edit-button:hover:not(:disabled) {
      background-color: #007bff;
      color: white;
    }

    .edit-button:focus {
      outline: 0;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .info-grid {
      display: grid;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }

    .label {
      font-weight: 500;
      color: #6c757d;
      flex: 0 0 40%;
    }

    .value {
      color: #212529;
      flex: 1;
      text-align: right;
      word-break: break-word;
    }

    .submission-section {
      text-align: center;
      margin-top: 2rem;
    }

    .submit-button {
      background-color: #28a745;
      border: 1px solid #28a745;
      color: white;
      padding: 0.75rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      min-width: 200px;
    }

    .submit-button:hover:not(:disabled) {
      background-color: #218838;
      border-color: #1e7e34;
    }

    .submit-button:focus {
      outline: 0;
      box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
    }

    .submit-button:disabled {
      background-color: #6c757d;
      border-color: #6c757d;
      cursor: not-allowed;
      opacity: 0.65;
    }

    .loading-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid #ffffff40;
      border-top: 2px solid #ffffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 1rem;
      border-radius: 0.375rem;
      margin-top: 1rem;
      text-align: left;
    }

    .retry-button {
      background-color: #dc3545;
      border: 1px solid #dc3545;
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      margin-left: 1rem;
      transition: all 0.15s ease-in-out;
    }

    .retry-button:hover:not(:disabled) {
      background-color: #c82333;
      border-color: #bd2130;
    }

    .retry-button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .success-message {
      background-color: #d1e7dd;
      border: 1px solid #badbcc;
      color: #0f5132;
      padding: 2rem;
      border-radius: 0.375rem;
      margin-top: 1rem;
    }

    .success-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .success-message h3 {
      color: #0f5132;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }

    .success-message p {
      margin-bottom: 0.5rem;
      font-size: 1rem;
      line-height: 1.5;
    }

    .start-new-button {
      background-color: #007bff;
      border: 1px solid #007bff;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      margin-top: 1rem;
      transition: all 0.15s ease-in-out;
    }

    .start-new-button:hover {
      background-color: #0056b3;
      border-color: #004085;
    }

    @media (max-width: 768px) {
      .step-container {
        padding: 1rem;
      }

      .section-header {
        flex-direction: column;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .info-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }

      .value {
        text-align: left;
      }

      .submit-button {
        width: 100%;
        padding: 1rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .review-section {
        border-width: 2px;
      }

      .edit-button,
      .submit-button,
      .retry-button,
      .start-new-button {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }

      .submit-button,
      .edit-button,
      .retry-button,
      .start-new-button {
        transition: none;
      }
    }
  `]
})
export class ReviewStepComponent implements OnInit, OnDestroy {
  @Output() stepValidityChanged = new EventEmitter<boolean>();

  formData: WizardFormData | null = null;
  isSubmitting = false;
  submissionError: string | null = null;
  submissionSuccess = false;
  submissionId: string | null = null;

  private destroy$ = new Subject<void>();
  private stepStartTime = Date.now();

  constructor(
    private formWizardService: FormWizardService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadFormData();
    this.trackStepStarted();
    this.stepValidityChanged.emit(true); // Review step is always valid if reached
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormData(): void {
    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.formData = data;
    });
  }

  private trackStepStarted(): void {
    if (this.formData) {
      this.analyticsService.trackStepStarted(3, 'Review', this.formData.sessionId);
    }
  }

  editStep(step: string): void {
    switch (step) {
      case 'personal':
        this.router.navigate(['/form-wizard/personal']);
        break;
      case 'address':
        this.router.navigate(['/form-wizard/address']);
        break;
    }
  }

  async submitForm(): Promise<void> {
    if (!this.formData || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.submissionError = null;
    const startTime = Date.now();

    try {
      // Simulate API call - replace with actual endpoint
      const result = await this.simulateSubmission();

      if (result.success) {
        this.submissionSuccess = true;
        this.submissionId = result.submissionId || '';

        // Track successful completion
        const totalTime = Date.now() - this.formData.timestamps.started.getTime();
        this.analyticsService.trackWizardCompleted(
          totalTime,
          0, // Error count - could track this throughout the wizard
          'standard', // Completion path
          this.formData.sessionId
        );

        // Clear form data after successful submission
        setTimeout(() => {
          this.formWizardService.clearFormData();
        }, 2000);

      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (error) {
      this.submissionError = error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  private async simulateSubmission(): Promise<FormSubmissionResult> {
    // Mock API call with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout - please check your connection and try again'));
      }, 5000);

      setTimeout(() => {
        clearTimeout(timeout);

        // Simulate occasional failure for testing
        if (Math.random() < 0.1) {
          resolve({
            success: false,
            error: 'Server temporarily unavailable. Please try again.'
          });
        } else {
          resolve({
            success: true,
            submissionId: 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
          });
        }
      }, 1500);
    });
  }

  startNewApplication(): void {
    this.formWizardService.clearFormData();
    this.router.navigate(['/form-wizard/personal']);
  }

  getStateName(stateCode: string): string {
    const stateMap: { [key: string]: string } = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    return stateMap[stateCode] || stateCode;
  }
}