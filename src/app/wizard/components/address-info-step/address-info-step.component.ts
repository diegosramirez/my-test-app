import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormWizardService } from '../../services/form-wizard.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WizardStep, AddressInfo } from '../../models/wizard-form-data.interface';

@Component({
  selector: 'app-address-info-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-container">
      <div class="step-header">
        <h2 id="address-info-heading">Address Information</h2>
        <p class="step-description">Please provide your current mailing address.</p>
      </div>

      <form [formGroup]="addressForm" novalidate role="form" aria-labelledby="address-info-heading">
        <div class="form-group">
          <label for="street" class="form-label">Street Address *</label>
          <input
            id="street"
            type="text"
            class="form-control"
            formControlName="street"
            [class.is-valid]="isFieldValid('street')"
            [class.is-invalid]="isFieldInvalid('street')"
            placeholder="123 Main Street, Apt 4B"
            aria-describedby="street-help street-error"
            autocomplete="street-address"
          />
          <small id="street-help" class="form-text text-muted">Include apartment, suite, or unit number if applicable</small>
          <div id="street-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('street') ? 'polite' : null">
            <span *ngIf="addressForm.get('street')?.errors?.['required'] && isFieldTouched('street')">
              Street address is required
            </span>
            <span *ngIf="addressForm.get('street')?.errors?.['minlength'] && isFieldTouched('street')">
              Street address must be at least 5 characters long
            </span>
          </div>
          <div class="valid-feedback" *ngIf="isFieldValid('street')">
            ✓ Address looks good!
          </div>
        </div>

        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="city" class="form-label">City *</label>
            <input
              id="city"
              type="text"
              class="form-control"
              formControlName="city"
              [class.is-valid]="isFieldValid('city')"
              [class.is-invalid]="isFieldInvalid('city')"
              placeholder="Enter city name"
              aria-describedby="city-error"
              autocomplete="address-level2"
            />
            <div id="city-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('city') ? 'polite' : null">
              <span *ngIf="addressForm.get('city')?.errors?.['required'] && isFieldTouched('city')">
                City is required
              </span>
              <span *ngIf="addressForm.get('city')?.errors?.['minlength'] && isFieldTouched('city')">
                City name must be at least 2 characters long
              </span>
            </div>
            <div class="valid-feedback" *ngIf="isFieldValid('city')">
              ✓ Valid city!
            </div>
          </div>

          <div class="form-group col-md-3">
            <label for="state" class="form-label">State *</label>
            <select
              id="state"
              class="form-control"
              formControlName="state"
              [class.is-valid]="isFieldValid('state')"
              [class.is-invalid]="isFieldInvalid('state')"
              aria-describedby="state-error"
              autocomplete="address-level1"
            >
              <option value="">Select State</option>
              <option *ngFor="let state of usStates" [value]="state.value">{{ state.label }}</option>
            </select>
            <div id="state-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('state') ? 'polite' : null">
              <span *ngIf="addressForm.get('state')?.errors?.['required'] && isFieldTouched('state')">
                State selection is required
              </span>
            </div>
            <div class="valid-feedback" *ngIf="isFieldValid('state')">
              ✓ State selected!
            </div>
          </div>

          <div class="form-group col-md-3">
            <label for="zipCode" class="form-label">ZIP Code *</label>
            <input
              id="zipCode"
              type="text"
              class="form-control"
              formControlName="zipCode"
              [class.is-valid]="isFieldValid('zipCode')"
              [class.is-invalid]="isFieldInvalid('zipCode')"
              placeholder="12345"
              aria-describedby="zip-help zip-error"
              autocomplete="postal-code"
              maxlength="5"
            />
            <small id="zip-help" class="form-text text-muted">5-digit ZIP code</small>
            <div id="zip-error" class="invalid-feedback" [attr.aria-live]="isFieldInvalid('zipCode') ? 'polite' : null">
              <span *ngIf="addressForm.get('zipCode')?.errors?.['required'] && isFieldTouched('zipCode')">
                ZIP code is required
              </span>
              <span *ngIf="addressForm.get('zipCode')?.errors?.['pattern'] && isFieldTouched('zipCode')">
                Please enter a valid 5-digit ZIP code
              </span>
            </div>
            <div class="valid-feedback" *ngIf="isFieldValid('zipCode')">
              ✓ Valid ZIP!
            </div>
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

    .form-row {
      display: flex;
      flex-wrap: wrap;
      margin-right: -0.75rem;
      margin-left: -0.75rem;
    }

    .col-md-6 {
      flex: 0 0 50%;
      max-width: 50%;
      padding-right: 0.75rem;
      padding-left: 0.75rem;
    }

    .col-md-3 {
      flex: 0 0 25%;
      max-width: 25%;
      padding-right: 0.75rem;
      padding-left: 0.75rem;
    }

    @media (max-width: 768px) {
      .col-md-6,
      .col-md-3 {
        flex: 0 0 100%;
        max-width: 100%;
        margin-bottom: 1rem;
      }

      .form-row {
        margin-right: 0;
        margin-left: 0;
      }

      .col-md-6,
      .col-md-3 {
        padding-right: 0;
        padding-left: 0;
      }
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
export class AddressInfoStepComponent implements OnInit, OnDestroy {
  @Output() stepValidityChanged = new EventEmitter<boolean>();

  addressForm!: FormGroup;
  private destroy$ = new Subject<void>();
  private stepStartTime = Date.now();
  private validationErrorCount = 0;

  readonly usStates = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ];

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
    const existingData = this.formWizardService.getStepData(WizardStep.ADDRESS) as AddressInfo;

    this.addressForm = this.fb.group({
      street: [existingData.street, [Validators.required, Validators.minLength(5)]],
      city: [existingData.city, [Validators.required, Validators.minLength(2)]],
      state: [existingData.state, [Validators.required]],
      zipCode: [existingData.zipCode, [Validators.required, Validators.pattern(/^\d{5}$/)]]
    });

    // Set up blur-based validation
    Object.keys(this.addressForm.controls).forEach(key => {
      const control = this.addressForm.get(key);
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
    this.addressForm.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.formWizardService.saveStepData(WizardStep.ADDRESS, value);
      this.stepValidityChanged.emit(this.addressForm.valid);
    });

    // Emit initial validity
    this.stepValidityChanged.emit(this.addressForm.valid);
  }

  private trackStepStarted(): void {
    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackStepStarted(2, 'Address', data.sessionId);
    });
  }

  private trackValidationError(fieldName: string, errors: any): void {
    this.validationErrorCount++;
    const errorType = Object.keys(errors)[0];

    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackValidationFailed(fieldName, errorType, 2, data.sessionId);
    });
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.addressForm.get(fieldName);
    return !!(field?.valid && field?.touched && field?.value);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.addressForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldTouched(fieldName: string): boolean {
    return !!this.addressForm.get(fieldName)?.touched;
  }

  onStepCompleted(): void {
    const timeSpent = Date.now() - this.stepStartTime;

    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.analyticsService.trackStepCompleted(2, this.validationErrorCount, timeSpent, data.sessionId);
    });
  }
}