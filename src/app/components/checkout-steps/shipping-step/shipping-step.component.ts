import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CheckoutService } from '../../../services/checkout.service';
import { ShippingAddress } from '../../../models/checkout.models';

@Component({
  selector: 'app-shipping-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="shipping-step">
      <div class="step-header">
        <h2 class="step-title">Shipping Information</h2>
        <p class="step-description">Please provide your shipping address details</p>
      </div>

      <form [formGroup]="shippingForm" (ngSubmit)="onSubmit()" class="shipping-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="firstName" class="form-label">
              First Name <span class="required">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              class="form-control"
              formControlName="firstName"
              autocomplete="given-name"
              [class.error]="isFieldInvalid('firstName')"
              [attr.aria-describedby]="isFieldInvalid('firstName') ? 'firstName-error' : null"
              [attr.aria-invalid]="isFieldInvalid('firstName')"
            />
            @if (isFieldInvalid('firstName')) {
              <div id="firstName-error" class="error-message" role="alert">
                {{ getFieldError('firstName') }}
              </div>
            }
          </div>

          <div class="form-group">
            <label for="lastName" class="form-label">
              Last Name <span class="required">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              class="form-control"
              formControlName="lastName"
              autocomplete="family-name"
              [class.error]="isFieldInvalid('lastName')"
              [attr.aria-describedby]="isFieldInvalid('lastName') ? 'lastName-error' : null"
              [attr.aria-invalid]="isFieldInvalid('lastName')"
            />
            @if (isFieldInvalid('lastName')) {
              <div id="lastName-error" class="error-message" role="alert">
                {{ getFieldError('lastName') }}
              </div>
            }
          </div>
        </div>

        <div class="form-group">
          <label for="street" class="form-label">
            Street Address <span class="required">*</span>
          </label>
          <input
            type="text"
            id="street"
            class="form-control"
            formControlName="street"
            autocomplete="street-address"
            placeholder="123 Main Street"
            [class.error]="isFieldInvalid('street')"
            [attr.aria-describedby]="isFieldInvalid('street') ? 'street-error' : null"
            [attr.aria-invalid]="isFieldInvalid('street')"
          />
          @if (isFieldInvalid('street')) {
            <div id="street-error" class="error-message" role="alert">
              {{ getFieldError('street') }}
            </div>
          }
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="city" class="form-label">
              City <span class="required">*</span>
            </label>
            <input
              type="text"
              id="city"
              class="form-control"
              formControlName="city"
              autocomplete="address-level2"
              [class.error]="isFieldInvalid('city')"
              [attr.aria-describedby]="isFieldInvalid('city') ? 'city-error' : null"
              [attr.aria-invalid]="isFieldInvalid('city')"
            />
            @if (isFieldInvalid('city')) {
              <div id="city-error" class="error-message" role="alert">
                {{ getFieldError('city') }}
              </div>
            }
          </div>

          <div class="form-group">
            <label for="state" class="form-label">
              State <span class="required">*</span>
            </label>
            <select
              id="state"
              class="form-control"
              formControlName="state"
              autocomplete="address-level1"
              [class.error]="isFieldInvalid('state')"
              [attr.aria-describedby]="isFieldInvalid('state') ? 'state-error' : null"
              [attr.aria-invalid]="isFieldInvalid('state')"
            >
              <option value="">Select State</option>
              @for (state of states; track state.value) {
                <option [value]="state.value">{{ state.label }}</option>
              }
            </select>
            @if (isFieldInvalid('state')) {
              <div id="state-error" class="error-message" role="alert">
                {{ getFieldError('state') }}
              </div>
            }
          </div>

          <div class="form-group">
            <label for="zipCode" class="form-label">
              ZIP Code <span class="required">*</span>
            </label>
            <input
              type="text"
              id="zipCode"
              class="form-control"
              formControlName="zipCode"
              autocomplete="postal-code"
              placeholder="12345"
              inputmode="numeric"
              pattern="[0-9]*"
              [class.error]="isFieldInvalid('zipCode')"
              [attr.aria-describedby]="isFieldInvalid('zipCode') ? 'zipCode-error' : null"
              [attr.aria-invalid]="isFieldInvalid('zipCode')"
            />
            @if (isFieldInvalid('zipCode')) {
              <div id="zipCode-error" class="error-message" role="alert">
                {{ getFieldError('zipCode') }}
              </div>
            }
          </div>
        </div>

        <div class="form-group">
          <label for="country" class="form-label">
            Country <span class="required">*</span>
          </label>
          <select
            id="country"
            class="form-control"
            formControlName="country"
            autocomplete="country"
            [class.error]="isFieldInvalid('country')"
            [attr.aria-describedby]="isFieldInvalid('country') ? 'country-error' : null"
            [attr.aria-invalid]="isFieldInvalid('country')"
          >
            <option value="">Select Country</option>
            @for (country of countries; track country.value) {
              <option [value]="country.value">{{ country.label }}</option>
            }
          </select>
          @if (isFieldInvalid('country')) {
            <div id="country-error" class="error-message" role="alert">
              {{ getFieldError('country') }}
            </div>
          }
        </div>

        <div class="form-group">
          <label for="phone" class="form-label">Phone Number</label>
          <input
            type="tel"
            id="phone"
            class="form-control"
            formControlName="phone"
            autocomplete="tel"
            placeholder="(555) 123-4567"
            inputmode="tel"
            [class.error]="isFieldInvalid('phone')"
            [attr.aria-describedby]="isFieldInvalid('phone') ? 'phone-error' : null"
            [attr.aria-invalid]="isFieldInvalid('phone')"
          />
          @if (isFieldInvalid('phone')) {
            <div id="phone-error" class="error-message" role="alert">
              {{ getFieldError('phone') }}
            </div>
          }
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!shippingForm.valid || isSubmitting()"
            [attr.aria-describedby]="!shippingForm.valid ? 'form-status' : null"
          >
            @if (isSubmitting()) {
              <span class="loading-spinner" aria-hidden="true"></span>
              Processing...
            } @else {
              Continue to Payment
            }
          </button>
        </div>

        @if (!shippingForm.valid && shippingForm.touched) {
          <div id="form-status" class="form-status" role="alert">
            Please correct the errors above to continue.
          </div>
        }
      </form>
    </div>
  `,
  styleUrl: './shipping-step.component.css'
})
export class ShippingStepComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  shippingForm: FormGroup;
  isSubmitting = signal(false);

  states = [
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
    // Add more states as needed
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' }
  ];

  countries = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'MX', label: 'Mexico' }
  ];

  constructor(
    private fb: FormBuilder,
    private checkoutService: CheckoutService
  ) {
    this.shippingForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadSavedData();
    this.setupFormSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
      country: ['US', Validators.required],
      phone: ['', [Validators.pattern(/^[\d\s\(\)\-\+]+$/)]]
    });
  }

  private loadSavedData(): void {
    const checkoutData = this.checkoutService.getCheckoutData();
    if (checkoutData.shipping) {
      this.shippingForm.patchValue(checkoutData.shipping);
    }
  }

  private setupFormSubscription(): void {
    this.shippingForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.checkoutService.updateShipping(value);
        this.trackValidationErrors();
      });
  }

  private trackValidationErrors(): void {
    const errors = this.getFormErrors();
    errors.forEach(error => {
      this.checkoutService.trackValidationError(1, error.field, error.type);
    });
  }

  private getFormErrors(): Array<{field: string; type: string}> {
    const errors: Array<{field: string; type: string}> = [];
    Object.keys(this.shippingForm.controls).forEach(key => {
      const control = this.shippingForm.get(key);
      if (control && control.errors && control.touched) {
        Object.keys(control.errors).forEach(errorType => {
          errors.push({ field: key, type: errorType });
        });
      }
    });
    return errors;
  }

  onSubmit(): void {
    if (this.shippingForm.valid) {
      this.isSubmitting.set(true);

      const startTime = Date.now();
      // Simulate validation delay
      setTimeout(() => {
        const completionTime = Date.now() - startTime;
        this.checkoutService.trackStepCompleted(1, completionTime);
        this.checkoutService.goToStep(2);
        this.isSubmitting.set(false);
      }, 800);
    } else {
      this.shippingForm.markAllAsTouched();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.shippingForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      if (errors['required']) return 'This field is required';
      if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required`;
      if (errors['pattern']) {
        if (fieldName === 'zipCode') return 'Please enter a valid ZIP code';
        if (fieldName === 'phone') return 'Please enter a valid phone number';
      }
    }
    return '';
  }
}