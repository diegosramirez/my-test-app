import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { CheckoutService } from '../../services/checkout.service';
import { ShippingAddress } from '../../models/checkout.models';

@Component({
  selector: 'app-shipping-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="shipping-step">
      <h2 class="step-title">Shipping Address</h2>
      <p class="step-description">Enter your shipping information to proceed with your order.</p>

      <form [formGroup]="shippingForm" class="shipping-form">
        <div class="form-row">
          <div class="form-field">
            <label for="firstName" class="form-label">First Name *</label>
            <input
              id="firstName"
              type="text"
              formControlName="firstName"
              class="form-input"
              [class.valid]="isFieldValid('firstName')"
              [class.invalid]="isFieldInvalid('firstName')"
              (blur)="onFieldBlur('firstName')"
              autocomplete="given-name"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('firstName')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('firstName')" class="error-message">
                First name is required
              </span>
            </div>
          </div>

          <div class="form-field">
            <label for="lastName" class="form-label">Last Name *</label>
            <input
              id="lastName"
              type="text"
              formControlName="lastName"
              class="form-input"
              [class.valid]="isFieldValid('lastName')"
              [class.invalid]="isFieldInvalid('lastName')"
              (blur)="onFieldBlur('lastName')"
              autocomplete="family-name"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('lastName')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('lastName')" class="error-message">
                Last name is required
              </span>
            </div>
          </div>
        </div>

        <div class="form-field">
          <label for="address" class="form-label">Street Address *</label>
          <input
            id="address"
            type="text"
            formControlName="address"
            class="form-input"
            [class.valid]="isFieldValid('address')"
            [class.invalid]="isFieldInvalid('address')"
            (blur)="onFieldBlur('address')"
            autocomplete="street-address"
            placeholder="123 Main Street"
          />
          <div class="field-feedback">
            <span *ngIf="isFieldValid('address')" class="success-indicator" aria-label="Valid">✓</span>
            <span *ngIf="isFieldInvalid('address')" class="error-message">
              Street address is required
            </span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="city" class="form-label">City *</label>
            <input
              id="city"
              type="text"
              formControlName="city"
              class="form-input"
              [class.valid]="isFieldValid('city')"
              [class.invalid]="isFieldInvalid('city')"
              (blur)="onFieldBlur('city')"
              autocomplete="address-level2"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('city')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('city')" class="error-message">
                City is required
              </span>
            </div>
          </div>

          <div class="form-field">
            <label for="state" class="form-label">State *</label>
            <select
              id="state"
              formControlName="state"
              class="form-select"
              [class.valid]="isFieldValid('state')"
              [class.invalid]="isFieldInvalid('state')"
              (blur)="onFieldBlur('state')"
              autocomplete="address-level1"
            >
              <option value="">Select State</option>
              <option value="AL">Alabama</option>
              <option value="CA">California</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <!-- Add more states as needed -->
            </select>
            <div class="field-feedback">
              <span *ngIf="isFieldValid('state')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('state')" class="error-message">
                State is required
              </span>
            </div>
          </div>

          <div class="form-field">
            <label for="zipCode" class="form-label">ZIP Code *</label>
            <input
              id="zipCode"
              type="text"
              formControlName="zipCode"
              class="form-input"
              [class.valid]="isFieldValid('zipCode')"
              [class.invalid]="isFieldInvalid('zipCode')"
              (blur)="onFieldBlur('zipCode')"
              autocomplete="postal-code"
              placeholder="12345"
              maxlength="10"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('zipCode')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('zipCode')" class="error-message">
                <span *ngIf="shippingForm.get('zipCode')?.errors?.['required']">ZIP code is required</span>
                <span *ngIf="shippingForm.get('zipCode')?.errors?.['pattern']">Please enter a valid ZIP code</span>
              </span>
            </div>
          </div>
        </div>

        <div *ngIf="addressValidationError" class="form-error" role="alert">
          {{ addressValidationError }}
        </div>

        <div *ngIf="addressValidationSuccess" class="form-success" role="alert">
          Address verified successfully!
        </div>
      </form>
    </div>
  `,
  styles: [`
    .shipping-step {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
    }

    .step-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #212529;
      margin-bottom: 0.5rem;
    }

    .step-description {
      color: #6c757d;
      margin-bottom: 2rem;
      font-size: 1rem;
    }

    .shipping-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row:has(.form-field:last-child:nth-child(3)) {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .form-field {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-input,
    .form-select {
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 0.25rem;
      font-size: 1rem;
      transition: all 0.2s ease;
      background-color: white;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-input.valid,
    .form-select.valid {
      border-color: #28a745;
    }

    .form-input.invalid,
    .form-select.invalid {
      border-color: #dc3545;
    }

    .field-feedback {
      min-height: 1.5rem;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
    }

    .success-indicator {
      color: #28a745;
      font-weight: bold;
      font-size: 1rem;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
    }

    .form-error {
      padding: 0.75rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 0.25rem;
      color: #721c24;
      font-size: 0.875rem;
    }

    .form-success {
      padding: 0.75rem;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 0.25rem;
      color: #155724;
      font-size: 0.875rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .form-row:has(.form-field:last-child:nth-child(3)) {
        grid-template-columns: 1fr;
      }

      .shipping-step {
        padding: 1rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .form-input,
      .form-select {
        border-width: 2px;
      }
    }
  `]
})
export class ShippingStepComponent implements OnInit, OnDestroy {
  private checkoutService = inject(CheckoutService);
  private formBuilder = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  shippingForm!: FormGroup;
  touchedFields = new Set<string>();
  addressValidationError: string | null = null;
  addressValidationSuccess = false;

  ngOnInit(): void {
    this.initializeForm();
    this.loadExistingData();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.shippingForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
    });
  }

  private loadExistingData(): void {
    const existingData = this.checkoutService.checkoutData();
    if (existingData.shipping) {
      this.shippingForm.patchValue(existingData.shipping);
      // Mark all fields as touched to show validation state
      Object.keys(existingData.shipping).forEach(key => {
        this.touchedFields.add(key);
      });
    }
  }

  private setupFormValidation(): void {
    this.shippingForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.shippingForm.valid) {
          const formValue = this.shippingForm.value as ShippingAddress;
          this.checkoutService.updateShipping(formValue);
          this.validateAddress(formValue);
        }
      });
  }

  private validateAddress(address: ShippingAddress): void {
    this.checkoutService.validateAddress(address)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isValid) => {
          this.addressValidationError = null;
          this.addressValidationSuccess = isValid;
        },
        error: () => {
          this.addressValidationError = 'Unable to validate address. Please verify it is correct.';
          this.addressValidationSuccess = false;
        }
      });
  }

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return !!(field && field.valid && this.touchedFields.has(fieldName));
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return !!(field && field.invalid && this.touchedFields.has(fieldName));
  }
}