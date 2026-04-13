import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormWizardService } from '../../services/form-wizard.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WizardStep, PersonalInfo } from '../../models/wizard-form-data.interface';

@Component({
  selector: 'app-personal-info-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 id="personal-info-heading">Personal Information</h2>
        <p class="step-description">Please provide your basic contact information.</p>
      </div>

      <form [formGroup]="personalForm" novalidate role="form" aria-labelledby="personal-info-heading">
        <div class="form-group">
          <label for="name" class="form-label">Full Name *</label>
          <input
            id="name"
            type="text"
            class="form-control"
            formControlName="name"
            [class.is-valid]="isFieldValid('name')"
            [class.is-invalid]="isFieldInvalid('name')"
            placeholder="Enter your full name"
            aria-describedby="name-help name-error"
            autocomplete="name"
          />
          <small id="name-help" class="form-text text-muted">Enter your first and last name</small>
          <div id="name-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('name') ? 'polite' : null">
            <span *ngIf="personalForm.get('name')?.errors?.['required'] && isFieldTouched('name')">
              Name is required
            </span>
            <span *ngIf="personalForm.get('name')?.errors?.['minlength'] && isFieldTouched('name')">
              Name must be at least 2 characters long
            </span>
          </div>
          <div class="valid-feedback" *ngIf="isFieldValid('name')">
            ✓ Looks good!
          </div>
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email Address *</label>
          <input
            id="email"
            type="email"
            class="form-control"
            formControlName="email"
            [class.is-valid]="isFieldValid('email')"
            [class.is-invalid]="isFieldInvalid('email')"
            placeholder="Enter your email address"
            aria-describedby="email-help email-error"
            autocomplete="email"
          />
          <small id="email-help" class="form-text text-muted">We'll use this to send you updates</small>
          <div id="email-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('email') ? 'polite' : null">
            <span *ngIf="personalForm.get('email')?.errors?.['required'] && isFieldTouched('email')">
              Email is required
            </span>
            <span *ngIf="personalForm.get('email')?.errors?.['email'] && isFieldTouched('email')">
              Please enter a valid email address
            </span>
          </div>
          <div class="valid-feedback" *ngIf="isFieldValid('email')">
            ✓ Valid email address!
          </div>
        </div>

        <div class="form-group">
          <label for="phone" class="form-label">Phone Number *</label>
          <input
            id="phone"
            type="tel"
            class="form-control"
            formControlName="phone"
            [class.is-valid]="isFieldValid('phone')"
            [class.is-invalid]="isFieldInvalid('phone')"
            placeholder="(555) 123-4567"
            aria-describedby="phone-help phone-error"
            autocomplete="tel"
            (input)="formatPhoneNumber($event)"
          />
          <small id="phone-help" class="form-text text-muted">Enter a 10-digit US phone number</small>
          <div id="phone-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('phone') ? 'polite' : null">
            <span *ngIf="personalForm.get('phone')?.errors?.['required'] && isFieldTouched('phone')">
              Phone number is required
            </span>
            <span *ngIf="personalForm.get('phone')?.errors?.['pattern'] && isFieldTouched('phone')">
              Please enter a valid 10-digit phone number
            </span>
          </div>
          <div class="valid-feedback" *ngIf="isFieldValid('phone')">
            ✓ Valid phone number!
          </div>
        </div>
      </form>
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

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #495057;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 0.375rem;
      font-size: 1rem;
      line-height: 1.5;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    .form-control:focus {
      outline: 0;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-control.is-valid {
      border-color: #28a745;
    }

    .form-control.is-valid:focus {
      border-color: #28a745;
      box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
    }

    .form-control.is-invalid {
      border-color: #dc3545;
    }

    .form-control.is-invalid:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }

    .form-text {
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    .text-muted {
      color: #6c757d;
    }

    .invalid-feedback {
      width: 100%;
      margin-top: 0.25rem;
      font-size: 0.875rem;
      color: #dc3545;
      display: block;
    }

    .valid-feedback {
      width: 100%;
      margin-top: 0.25rem;
      font-size: 0.875rem;
      color: #28a745;
      display: block;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .step-container {
        padding: 1rem;
      }

      .step-header h2 {
        font-size: 1.5rem;
      }

      .form-control {
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .form-control {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .form-control {
        transition: none;
      }
    }
  `]
})
export class PersonalInfoStepComponent implements OnInit, OnDestroy {
  @Output() stepValidityChanged = new EventEmitter<boolean>();

  personalForm!: FormGroup;
  private destroy$ = new Subject<void>();
  private stepStartTime = Date.now();
  private validationErrorCount = 0;

  constructor(
    private fb: FormBuilder,
    private formWizardService: FormWizardService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
    this.trackStepStarted();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const existingData = this.formWizardService.getStepData(WizardStep.PERSONAL) as PersonalInfo;

    this.personalForm = this.fb.group({
      name: [existingData.name, [Validators.required, Validators.minLength(2)]],
      email: [existingData.email, [Validators.required, Validators.email]],
      phone: [existingData.phone, [Validators.required, Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)]]
    });

    // Set up blur-based validation
    Object.keys(this.personalForm.controls).forEach(key => {
      const control = this.personalForm.get(key);
      if (control) {
        control.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          if (control.errors && control.touched) {
            this.trackValidationError(key, control.errors);
          }
        });
      }
    });
  }

  private setupFormSubscriptions(): void {
    this.personalForm.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.formWizardService.saveStepData(WizardStep.PERSONAL, value);
      this.stepValidityChanged.emit(this.personalForm.valid);
    });

    // Emit initial validity
    this.stepValidityChanged.emit(this.personalForm.valid);
  }

  private trackStepStarted(): void {
    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackStepStarted(1, 'Personal', data.sessionId);
    });
  }

  private trackValidationError(fieldName: string, errors: any): void {
    this.validationErrorCount++;
    const errorType = Object.keys(errors)[0];

    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackValidationFailed(fieldName, errorType, 1, data.sessionId);
    });
  }

  formatPhoneNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    let formattedValue = '';

    if (value.length <= 3) {
      formattedValue = value;
    } else if (value.length <= 6) {
      formattedValue = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    } else {
      formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    }

    input.value = formattedValue;
    this.personalForm.get('phone')?.setValue(formattedValue);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.personalForm.get(fieldName);
    return !!(field?.valid && field?.touched && field?.value);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.personalForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldTouched(fieldName: string): boolean {
    return !!this.personalForm.get(fieldName)?.touched;
  }

  onStepCompleted(): void {
    const timeSpent = Date.now() - this.stepStartTime;

    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackStepCompleted(1, this.validationErrorCount, timeSpent, data.sessionId);
    });
  }
}