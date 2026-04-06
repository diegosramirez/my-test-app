import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShippingAddress } from '../../models/checkout.models';

@Component({
  selector: 'app-shipping-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="shipping-form-container">
      <div class="form-header">
        <h2 class="form-title">Shipping Information</h2>
        <p class="form-subtitle">Please enter your shipping address details</p>
      </div>

      <form [formGroup]="shippingForm" (ngSubmit)="onSubmit()" novalidate>
        <div class="form-grid">
          <!-- First Name -->
          <div class="form-group">
            <label for="firstName" class="form-label">
              First Name <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              formControlName="firstName"
              class="form-input"
              [class.error]="isFieldInvalid('firstName')"
              [attr.aria-describedby]="isFieldInvalid('firstName') ? 'firstName-error' : null"
              [attr.aria-invalid]="isFieldInvalid('firstName')"
              autocomplete="given-name">
            <div
              *ngIf="isFieldInvalid('firstName')"
              id="firstName-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('firstName') }}
            </div>
          </div>

          <!-- Last Name -->
          <div class="form-group">
            <label for="lastName" class="form-label">
              Last Name <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              formControlName="lastName"
              class="form-input"
              [class.error]="isFieldInvalid('lastName')"
              [attr.aria-describedby]="isFieldInvalid('lastName') ? 'lastName-error' : null"
              [attr.aria-invalid]="isFieldInvalid('lastName')"
              autocomplete="family-name">
            <div
              *ngIf="isFieldInvalid('lastName')"
              id="lastName-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('lastName') }}
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="form-group">
          <label for="address" class="form-label">
            Street Address <span class="required-asterisk" aria-label="required">*</span>
          </label>
          <input
            type="text"
            id="address"
            formControlName="address"
            class="form-input"
            [class.error]="isFieldInvalid('address')"
            [attr.aria-describedby]="isFieldInvalid('address') ? 'address-error' : null"
            [attr.aria-invalid]="isFieldInvalid('address')"
            autocomplete="street-address"
            placeholder="123 Main Street, Apt 4B">
          <div
            *ngIf="isFieldInvalid('address')"
            id="address-error"
            class="error-message"
            role="alert"
            aria-live="polite">
            {{ getFieldError('address') }}
          </div>
        </div>

        <div class="form-grid">
          <!-- City -->
          <div class="form-group">
            <label for="city" class="form-label">
              City <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="city"
              formControlName="city"
              class="form-input"
              [class.error]="isFieldInvalid('city')"
              [attr.aria-describedby]="isFieldInvalid('city') ? 'city-error' : null"
              [attr.aria-invalid]="isFieldInvalid('city')"
              autocomplete="address-level2">
            <div
              *ngIf="isFieldInvalid('city')"
              id="city-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('city') }}
            </div>
          </div>

          <!-- State -->
          <div class="form-group">
            <label for="state" class="form-label">
              State <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <select
              id="state"
              formControlName="state"
              class="form-input form-select"
              [class.error]="isFieldInvalid('state')"
              [attr.aria-describedby]="isFieldInvalid('state') ? 'state-error' : null"
              [attr.aria-invalid]="isFieldInvalid('state')"
              autocomplete="address-level1">
              <option value="">Select State</option>
              <option value="AL">Alabama</option>
              <option value="CA">California</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <!-- Add more states as needed -->
            </select>
            <div
              *ngIf="isFieldInvalid('state')"
              id="state-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('state') }}
            </div>
          </div>

          <!-- ZIP Code -->
          <div class="form-group">
            <label for="zipCode" class="form-label">
              ZIP Code <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="zipCode"
              formControlName="zipCode"
              class="form-input"
              [class.error]="isFieldInvalid('zipCode')"
              [attr.aria-describedby]="isFieldInvalid('zipCode') ? 'zipCode-error' : null"
              [attr.aria-invalid]="isFieldInvalid('zipCode')"
              autocomplete="postal-code"
              maxlength="10"
              pattern="[0-9]{5}(-[0-9]{4})?">
            <div
              *ngIf="isFieldInvalid('zipCode')"
              id="zipCode-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('zipCode') }}
            </div>
          </div>
        </div>

        <!-- Country -->
        <div class="form-group">
          <label for="country" class="form-label">
            Country <span class="required-asterisk" aria-label="required">*</span>
          </label>
          <select
            id="country"
            formControlName="country"
            class="form-input form-select"
            [class.error]="isFieldInvalid('country')"
            [attr.aria-describedby]="isFieldInvalid('country') ? 'country-error' : null"
            [attr.aria-invalid]="isFieldInvalid('country')"
            autocomplete="country">
            <option value="">Select Country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="MX">Mexico</option>
          </select>
          <div
            *ngIf="isFieldInvalid('country')"
            id="country-error"
            class="error-message"
            role="alert"
            aria-live="polite">
            {{ getFieldError('country') }}
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="shippingForm.invalid || isSubmitting"
            [attr.aria-describedby]="shippingForm.invalid ? 'form-validation-summary' : null">
            <span *ngIf="isSubmitting" class="loading-spinner" aria-hidden="true"></span>
            {{ isSubmitting ? 'Validating...' : 'Continue to Payment' }}
          </button>
        </div>

        <!-- Form validation summary for screen readers -->
        <div
          *ngIf="shippingForm.invalid && shippingForm.touched"
          id="form-validation-summary"
          class="sr-only"
          role="status"
          aria-live="polite">
          Please correct the errors in the form before continuing.
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./shipping-form.component.css']
})
export class ShippingFormComponent implements OnInit {
  @Input() initialData: ShippingAddress | null = null;
  @Input() isSubmitting = false;
  @Output() formSubmitted = new EventEmitter<ShippingAddress>();
  @Output() formChanged = new EventEmitter<{ isValid: boolean; data: ShippingAddress | null }>();

  shippingForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.createForm();
    this.setupFormSubscription();

    if (this.initialData) {
      this.shippingForm.patchValue(this.initialData);
    }
  }

  private createForm(): void {
    this.shippingForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
      country: ['US', [Validators.required]]
    });
  }

  private setupFormSubscription(): void {
    this.shippingForm.valueChanges.subscribe(value => {
      const isValid = this.shippingForm.valid;
      const data = isValid ? value as ShippingAddress : null;
      this.formChanged.emit({ isValid, data });
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.shippingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.shippingForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    if (field.errors['maxlength']) {
      return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    if (field.errors['pattern']) {
      if (fieldName === 'zipCode') {
        return 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
      }
      return `Please enter a valid ${this.getFieldLabel(fieldName).toLowerCase()}`;
    }

    return `${this.getFieldLabel(fieldName)} is invalid`;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      address: 'Street address',
      city: 'City',
      state: 'State',
      zipCode: 'ZIP code',
      country: 'Country'
    };
    return labels[fieldName] || fieldName;
  }

  onSubmit(): void {
    if (this.shippingForm.valid) {
      this.formSubmitted.emit(this.shippingForm.value as ShippingAddress);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.shippingForm.controls).forEach(key => {
        this.shippingForm.get(key)?.markAsTouched();
      });
    }
  }
}