import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentMethod, CreditCardPayment, PayPalPayment } from '../../models/checkout.models';

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="payment-method-container">
      <div class="form-header">
        <h2 class="form-title">Payment Method</h2>
        <p class="form-subtitle">Choose your preferred payment method</p>
      </div>

      <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()" novalidate>
        <!-- Payment Method Selection -->
        <div class="payment-options" role="radiogroup" aria-labelledby="payment-method-legend">
          <fieldset class="payment-fieldset">
            <legend id="payment-method-legend" class="form-legend">
              Select Payment Method <span class="required-asterisk" aria-label="required">*</span>
            </legend>

            <div class="payment-option">
              <input
                type="radio"
                id="credit-card"
                value="credit_card"
                formControlName="paymentType"
                class="payment-radio"
                [attr.aria-describedby]="selectedPaymentType === 'credit_card' ? 'credit-card-desc' : null">
              <label for="credit-card" class="payment-label">
                <div class="payment-label-content">
                  <span class="payment-icon">💳</span>
                  <div class="payment-text">
                    <span class="payment-title">Credit Card</span>
                    <span class="payment-desc" id="credit-card-desc">Visa, Mastercard, American Express</span>
                  </div>
                </div>
                <div class="security-badges">
                  <span class="security-badge">🔒 SSL</span>
                  <span class="security-badge">✓ Secure</span>
                </div>
              </label>
            </div>

            <div class="payment-option">
              <input
                type="radio"
                id="paypal"
                value="paypal"
                formControlName="paymentType"
                class="payment-radio"
                [attr.aria-describedby]="selectedPaymentType === 'paypal' ? 'paypal-desc' : null">
              <label for="paypal" class="payment-label">
                <div class="payment-label-content">
                  <span class="payment-icon">🅿️</span>
                  <div class="payment-text">
                    <span class="payment-title">PayPal</span>
                    <span class="payment-desc" id="paypal-desc">Pay with your PayPal account</span>
                  </div>
                </div>
                <div class="security-badges">
                  <span class="security-badge">✓ Protected</span>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        <!-- Credit Card Form -->
        <div
          *ngIf="selectedPaymentType === 'credit_card'"
          class="credit-card-form"
          role="group"
          aria-labelledby="credit-card-form-title">

          <h3 id="credit-card-form-title" class="form-section-title">Credit Card Information</h3>

          <div class="form-group">
            <label for="cardholderName" class="form-label">
              Cardholder Name <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="cardholderName"
              formControlName="cardholderName"
              class="form-input"
              [class.error]="isFieldInvalid('cardholderName')"
              [attr.aria-describedby]="isFieldInvalid('cardholderName') ? 'cardholderName-error' : null"
              [attr.aria-invalid]="isFieldInvalid('cardholderName')"
              autocomplete="cc-name"
              placeholder="John Doe">
            <div
              *ngIf="isFieldInvalid('cardholderName')"
              id="cardholderName-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('cardholderName') }}
            </div>
          </div>

          <div class="form-group">
            <label for="cardNumber" class="form-label">
              Card Number <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="cardNumber"
              formControlName="cardNumber"
              class="form-input"
              [class.error]="isFieldInvalid('cardNumber')"
              [attr.aria-describedby]="isFieldInvalid('cardNumber') ? 'cardNumber-error' : 'cardNumber-help'"
              [attr.aria-invalid]="isFieldInvalid('cardNumber')"
              autocomplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxlength="19"
              (input)="formatCardNumber($event)">
            <div id="cardNumber-help" class="input-help" *ngIf="!isFieldInvalid('cardNumber')">
              Enter your 16-digit card number
            </div>
            <div
              *ngIf="isFieldInvalid('cardNumber')"
              id="cardNumber-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('cardNumber') }}
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="expiryMonth" class="form-label">
                Expiry Month <span class="required-asterisk" aria-label="required">*</span>
              </label>
              <select
                id="expiryMonth"
                formControlName="expiryMonth"
                class="form-input form-select"
                [class.error]="isFieldInvalid('expiryMonth')"
                [attr.aria-describedby]="isFieldInvalid('expiryMonth') ? 'expiryMonth-error' : null"
                [attr.aria-invalid]="isFieldInvalid('expiryMonth')"
                autocomplete="cc-exp-month">
                <option value="">Month</option>
                <option value="01">01 - January</option>
                <option value="02">02 - February</option>
                <option value="03">03 - March</option>
                <option value="04">04 - April</option>
                <option value="05">05 - May</option>
                <option value="06">06 - June</option>
                <option value="07">07 - July</option>
                <option value="08">08 - August</option>
                <option value="09">09 - September</option>
                <option value="10">10 - October</option>
                <option value="11">11 - November</option>
                <option value="12">12 - December</option>
              </select>
              <div
                *ngIf="isFieldInvalid('expiryMonth')"
                id="expiryMonth-error"
                class="error-message"
                role="alert"
                aria-live="polite">
                {{ getFieldError('expiryMonth') }}
              </div>
            </div>

            <div class="form-group">
              <label for="expiryYear" class="form-label">
                Expiry Year <span class="required-asterisk" aria-label="required">*</span>
              </label>
              <select
                id="expiryYear"
                formControlName="expiryYear"
                class="form-input form-select"
                [class.error]="isFieldInvalid('expiryYear')"
                [attr.aria-describedby]="isFieldInvalid('expiryYear') ? 'expiryYear-error' : null"
                [attr.aria-invalid]="isFieldInvalid('expiryYear')"
                autocomplete="cc-exp-year">
                <option value="">Year</option>
                <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
              </select>
              <div
                *ngIf="isFieldInvalid('expiryYear')"
                id="expiryYear-error"
                class="error-message"
                role="alert"
                aria-live="polite">
                {{ getFieldError('expiryYear') }}
              </div>
            </div>

            <div class="form-group">
              <label for="cvv" class="form-label">
                CVV <span class="required-asterisk" aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="cvv"
                formControlName="cvv"
                class="form-input"
                [class.error]="isFieldInvalid('cvv')"
                [attr.aria-describedby]="isFieldInvalid('cvv') ? 'cvv-error' : 'cvv-help'"
                [attr.aria-invalid]="isFieldInvalid('cvv')"
                autocomplete="cc-csc"
                placeholder="123"
                maxlength="4"
                pattern="[0-9]*">
              <div id="cvv-help" class="input-help" *ngIf="!isFieldInvalid('cvv')">
                3-4 digits on the back of your card
              </div>
              <div
                *ngIf="isFieldInvalid('cvv')"
                id="cvv-error"
                class="error-message"
                role="alert"
                aria-live="polite">
                {{ getFieldError('cvv') }}
              </div>
            </div>
          </div>
        </div>

        <!-- PayPal Form -->
        <div
          *ngIf="selectedPaymentType === 'paypal'"
          class="paypal-form"
          role="group"
          aria-labelledby="paypal-form-title">

          <h3 id="paypal-form-title" class="form-section-title">PayPal Account</h3>

          <div class="form-group">
            <label for="paypalEmail" class="form-label">
              PayPal Email <span class="required-asterisk" aria-label="required">*</span>
            </label>
            <input
              type="email"
              id="paypalEmail"
              formControlName="paypalEmail"
              class="form-input"
              [class.error]="isFieldInvalid('paypalEmail')"
              [attr.aria-describedby]="isFieldInvalid('paypalEmail') ? 'paypalEmail-error' : 'paypalEmail-help'"
              [attr.aria-invalid]="isFieldInvalid('paypalEmail')"
              autocomplete="email"
              placeholder="your.email@example.com">
            <div id="paypalEmail-help" class="input-help" *ngIf="!isFieldInvalid('paypalEmail')">
              Enter the email address associated with your PayPal account
            </div>
            <div
              *ngIf="isFieldInvalid('paypalEmail')"
              id="paypalEmail-error"
              class="error-message"
              role="alert"
              aria-live="polite">
              {{ getFieldError('paypalEmail') }}
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="onBack()"
            [attr.aria-label]="'Go back to shipping information'">
            ← Back
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="paymentForm.invalid || isSubmitting"
            [attr.aria-describedby]="paymentForm.invalid ? 'form-validation-summary' : null">
            <span *ngIf="isSubmitting" class="loading-spinner" aria-hidden="true"></span>
            {{ isSubmitting ? 'Processing...' : 'Continue to Review' }}
          </button>
        </div>

        <!-- Form validation summary for screen readers -->
        <div
          *ngIf="paymentForm.invalid && paymentForm.touched"
          id="form-validation-summary"
          class="sr-only"
          role="status"
          aria-live="polite">
          Please correct the errors in the form before continuing.
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./payment-method.component.css']
})
export class PaymentMethodComponent implements OnInit {
  @Input() initialData: PaymentMethod | null = null;
  @Input() isSubmitting = false;
  @Output() formSubmitted = new EventEmitter<PaymentMethod>();
  @Output() formChanged = new EventEmitter<{ isValid: boolean; data: PaymentMethod | null }>();
  @Output() backClicked = new EventEmitter<void>();

  paymentForm!: FormGroup;
  availableYears: string[] = [];

  constructor(private fb: FormBuilder) {}

  get selectedPaymentType(): string {
    return this.paymentForm.get('paymentType')?.value || '';
  }

  ngOnInit(): void {
    this.generateAvailableYears();
    this.createForm();
    this.setupFormSubscription();

    if (this.initialData) {
      this.setInitialData();
    }
  }

  private generateAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 20; i++) {
      this.availableYears.push((currentYear + i).toString());
    }
  }

  private createForm(): void {
    this.paymentForm = this.fb.group({
      paymentType: ['', [Validators.required]],
      // Credit card fields
      cardholderName: [''],
      cardNumber: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      // PayPal field
      paypalEmail: ['']
    });
  }

  private setupFormSubscription(): void {
    this.paymentForm.get('paymentType')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });

    this.paymentForm.valueChanges.subscribe(() => {
      const isValid = this.paymentForm.valid;
      const data = isValid ? this.buildPaymentMethod() : null;
      this.formChanged.emit({ isValid, data });
    });
  }

  private updateValidators(paymentType: string): void {
    const creditCardFields = ['cardholderName', 'cardNumber', 'expiryMonth', 'expiryYear', 'cvv'];
    const paypalFields = ['paypalEmail'];

    // Clear all validators first
    [...creditCardFields, ...paypalFields].forEach(field => {
      this.paymentForm.get(field)?.clearValidators();
      this.paymentForm.get(field)?.setValue('');
    });

    if (paymentType === 'credit_card') {
      this.paymentForm.get('cardholderName')?.setValidators([Validators.required, Validators.minLength(2)]);
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]);
      this.paymentForm.get('expiryMonth')?.setValidators([Validators.required]);
      this.paymentForm.get('expiryYear')?.setValidators([Validators.required]);
      this.paymentForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
    } else if (paymentType === 'paypal') {
      this.paymentForm.get('paypalEmail')?.setValidators([Validators.required, Validators.email]);
    }

    // Update validity
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.updateValueAndValidity();
    });
  }

  private setInitialData(): void {
    if (!this.initialData) return;

    this.paymentForm.patchValue({
      paymentType: this.initialData.type
    });

    if (this.initialData.type === 'credit_card') {
      const cardData = this.initialData as CreditCardPayment;
      this.paymentForm.patchValue({
        cardholderName: cardData.cardholderName,
        cardNumber: cardData.cardNumber,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cvv: cardData.cvv
      });
    } else if (this.initialData.type === 'paypal') {
      const paypalData = this.initialData as PayPalPayment;
      this.paymentForm.patchValue({
        paypalEmail: paypalData.email
      });
    }
  }

  private buildPaymentMethod(): PaymentMethod | null {
    const formValue = this.paymentForm.value;

    if (formValue.paymentType === 'credit_card') {
      return {
        type: 'credit_card',
        cardNumber: formValue.cardNumber,
        expiryMonth: formValue.expiryMonth,
        expiryYear: formValue.expiryYear,
        cvv: formValue.cvv,
        cardholderName: formValue.cardholderName
      } as CreditCardPayment;
    } else if (formValue.paymentType === 'paypal') {
      return {
        type: 'paypal',
        email: formValue.paypalEmail
      } as PayPalPayment;
    }

    return null;
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ');

    if (formattedValue && formattedValue.length <= 19) {
      this.paymentForm.get('cardNumber')?.setValue(formattedValue);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (field.errors['pattern']) {
      if (fieldName === 'cardNumber') {
        return 'Please enter a valid 16-digit card number';
      }
      if (fieldName === 'cvv') {
        return 'Please enter a valid 3 or 4-digit CVV';
      }
    }
    if (field.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    return `${this.getFieldLabel(fieldName)} is invalid`;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      paymentType: 'Payment method',
      cardholderName: 'Cardholder name',
      cardNumber: 'Card number',
      expiryMonth: 'Expiry month',
      expiryYear: 'Expiry year',
      cvv: 'CVV',
      paypalEmail: 'PayPal email'
    };
    return labels[fieldName] || fieldName;
  }

  onSubmit(): void {
    if (this.paymentForm.valid) {
      const paymentMethod = this.buildPaymentMethod();
      if (paymentMethod) {
        this.formSubmitted.emit(paymentMethod);
      }
    } else {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
    }
  }

  onBack(): void {
    this.backClicked.emit();
  }
}