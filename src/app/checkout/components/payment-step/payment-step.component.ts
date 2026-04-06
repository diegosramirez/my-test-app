import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { CheckoutService } from '../../services/checkout.service';
import { PaymentData, PaymentMethod, CreditCardPayment, PayPalPayment } from '../../models/checkout.models';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="payment-step">
      <h2 class="step-title">Payment Method</h2>
      <p class="step-description">Choose your preferred payment method and enter the required information.</p>

      <div class="security-message">
        <div class="security-icon">🔒</div>
        <p>Your payment information is encrypted and secure. We use SSL encryption to protect your data.</p>
      </div>

      <form [formGroup]="paymentForm" class="payment-form">
        <!-- Payment Method Selection -->
        <div class="payment-methods">
          <h3 class="section-title">Select Payment Method</h3>

          <div class="method-options">
            <label class="method-option" [class.selected]="selectedMethod === 'credit-card'">
              <input
                type="radio"
                name="paymentMethod"
                value="credit-card"
                [checked]="selectedMethod === 'credit-card'"
                (change)="onPaymentMethodChange('credit-card')"
                class="method-radio"
              />
              <div class="method-content">
                <div class="method-icon">💳</div>
                <div class="method-info">
                  <span class="method-name">Credit Card</span>
                  <span class="method-description">Visa, MasterCard, American Express</span>
                </div>
              </div>
            </label>

            <label class="method-option" [class.selected]="selectedMethod === 'paypal'">
              <input
                type="radio"
                name="paymentMethod"
                value="paypal"
                [checked]="selectedMethod === 'paypal'"
                (change)="onPaymentMethodChange('paypal')"
                class="method-radio"
              />
              <div class="method-content">
                <div class="method-icon">🅿️</div>
                <div class="method-info">
                  <span class="method-name">PayPal</span>
                  <span class="method-description">Pay with your PayPal account</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Credit Card Fields -->
        <div *ngIf="selectedMethod === 'credit-card'" class="credit-card-section">
          <h3 class="section-title">Credit Card Information</h3>

          <div class="form-field">
            <label for="cardholderName" class="form-label">Cardholder Name *</label>
            <input
              id="cardholderName"
              type="text"
              formControlName="cardholderName"
              class="form-input"
              [class.valid]="isFieldValid('cardholderName')"
              [class.invalid]="isFieldInvalid('cardholderName')"
              (blur)="onFieldBlur('cardholderName')"
              autocomplete="cc-name"
              placeholder="John Doe"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('cardholderName')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('cardholderName')" class="error-message">
                Cardholder name is required
              </span>
            </div>
          </div>

          <div class="form-field">
            <label for="cardNumber" class="form-label">Card Number *</label>
            <input
              id="cardNumber"
              type="text"
              formControlName="cardNumber"
              class="form-input"
              [class.valid]="isFieldValid('cardNumber')"
              [class.invalid]="isFieldInvalid('cardNumber')"
              (blur)="onFieldBlur('cardNumber')"
              (input)="onCardNumberInput($event)"
              autocomplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxlength="19"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('cardNumber')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('cardNumber')" class="error-message">
                <span *ngIf="paymentForm.get('cardNumber')?.errors?.['required']">Card number is required</span>
                <span *ngIf="paymentForm.get('cardNumber')?.errors?.['pattern']">Please enter a valid card number</span>
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="expiryDate" class="form-label">Expiry Date *</label>
              <input
                id="expiryDate"
                type="text"
                formControlName="expiryDate"
                class="form-input"
                [class.valid]="isFieldValid('expiryDate')"
                [class.invalid]="isFieldInvalid('expiryDate')"
                (blur)="onFieldBlur('expiryDate')"
                (input)="onExpiryDateInput($event)"
                autocomplete="cc-exp"
                placeholder="MM/YY"
                maxlength="5"
              />
              <div class="field-feedback">
                <span *ngIf="isFieldValid('expiryDate')" class="success-indicator" aria-label="Valid">✓</span>
                <span *ngIf="isFieldInvalid('expiryDate')" class="error-message">
                  <span *ngIf="paymentForm.get('expiryDate')?.errors?.['required']">Expiry date is required</span>
                  <span *ngIf="paymentForm.get('expiryDate')?.errors?.['pattern']">Please enter MM/YY format</span>
                </span>
              </div>
            </div>

            <div class="form-field">
              <label for="cvv" class="form-label">CVV *</label>
              <input
                id="cvv"
                type="text"
                formControlName="cvv"
                class="form-input"
                [class.valid]="isFieldValid('cvv')"
                [class.invalid]="isFieldInvalid('cvv')"
                (blur)="onFieldBlur('cvv')"
                autocomplete="cc-csc"
                placeholder="123"
                maxlength="4"
              />
              <div class="field-feedback">
                <span *ngIf="isFieldValid('cvv')" class="success-indicator" aria-label="Valid">✓</span>
                <span *ngIf="isFieldInvalid('cvv')" class="error-message">
                  <span *ngIf="paymentForm.get('cvv')?.errors?.['required']">CVV is required</span>
                  <span *ngIf="paymentForm.get('cvv')?.errors?.['pattern']">Please enter 3-4 digits</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- PayPal Section -->
        <div *ngIf="selectedMethod === 'paypal'" class="paypal-section">
          <h3 class="section-title">PayPal Information</h3>

          <div class="form-field">
            <label for="paypalEmail" class="form-label">PayPal Email *</label>
            <input
              id="paypalEmail"
              type="email"
              formControlName="paypalEmail"
              class="form-input"
              [class.valid]="isFieldValid('paypalEmail')"
              [class.invalid]="isFieldInvalid('paypalEmail')"
              (blur)="onFieldBlur('paypalEmail')"
              placeholder="your@email.com"
            />
            <div class="field-feedback">
              <span *ngIf="isFieldValid('paypalEmail')" class="success-indicator" aria-label="Valid">✓</span>
              <span *ngIf="isFieldInvalid('paypalEmail')" class="error-message">
                <span *ngIf="paymentForm.get('paypalEmail')?.errors?.['required']">PayPal email is required</span>
                <span *ngIf="paymentForm.get('paypalEmail')?.errors?.['email']">Please enter a valid email</span>
              </span>
            </div>
          </div>

          <div class="paypal-notice">
            <p>You will be redirected to PayPal to complete your payment securely.</p>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .payment-step {
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
      margin-bottom: 1.5rem;
      font-size: 1rem;
    }

    .security-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #e7f3ff;
      border: 1px solid #b8daff;
      border-radius: 0.25rem;
      margin-bottom: 2rem;
      font-size: 0.875rem;
      color: #004085;
    }

    .security-icon {
      font-size: 1.25rem;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #212529;
      margin-bottom: 1rem;
    }

    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .method-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .method-option {
      display: flex;
      align-items: center;
      padding: 1rem;
      border: 2px solid #dee2e6;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: white;
    }

    .method-option:hover {
      border-color: #007bff;
      background-color: #f8f9ff;
    }

    .method-option.selected {
      border-color: #007bff;
      background-color: #e7f3ff;
    }

    .method-radio {
      margin-right: 1rem;
      scale: 1.2;
    }

    .method-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .method-icon {
      font-size: 1.5rem;
    }

    .method-info {
      display: flex;
      flex-direction: column;
    }

    .method-name {
      font-weight: 600;
      color: #212529;
    }

    .method-description {
      font-size: 0.875rem;
      color: #6c757d;
    }

    .credit-card-section,
    .paypal-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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

    .form-input {
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 0.25rem;
      font-size: 1rem;
      transition: all 0.2s ease;
      background-color: white;
    }

    .form-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .form-input.valid {
      border-color: #28a745;
    }

    .form-input.invalid {
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

    .paypal-notice {
      padding: 1rem;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 0.25rem;
      color: #856404;
      font-size: 0.875rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .payment-step {
        padding: 1rem;
      }

      .method-options {
        gap: 0.5rem;
      }

      .method-option {
        padding: 0.75rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .method-option {
        border-width: 3px;
      }

      .form-input {
        border-width: 2px;
      }
    }
  `]
})
export class PaymentStepComponent implements OnInit, OnDestroy {
  private checkoutService = inject(CheckoutService);
  private formBuilder = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  paymentForm!: FormGroup;
  selectedMethod: PaymentMethod = 'credit-card';
  touchedFields = new Set<string>();

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
    this.paymentForm = this.formBuilder.group({
      cardholderName: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      paypalEmail: ['', [Validators.email]]
    });
  }

  private loadExistingData(): void {
    const existingData = this.checkoutService.checkoutData();
    if (existingData.payment) {
      this.selectedMethod = existingData.payment.type;

      if (existingData.payment.type === 'credit-card') {
        this.paymentForm.patchValue({
          cardholderName: existingData.payment.cardholderName,
          cardNumber: existingData.payment.cardNumber,
          expiryDate: existingData.payment.expiryDate,
          cvv: existingData.payment.cvv
        });
        Object.keys(existingData.payment).forEach(key => {
          if (key !== 'type') {
            this.touchedFields.add(key);
          }
        });
      } else if (existingData.payment.type === 'paypal') {
        this.paymentForm.patchValue({
          paypalEmail: existingData.payment.email
        });
        this.touchedFields.add('paypalEmail');
      }
    }

    this.updateValidators();
  }

  private setupFormValidation(): void {
    this.paymentForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.savePaymentData();
      });
  }

  onPaymentMethodChange(method: PaymentMethod): void {
    this.selectedMethod = method;
    this.updateValidators();
    this.savePaymentData();
  }

  private updateValidators(): void {
    const cardFields = ['cardholderName', 'cardNumber', 'expiryDate', 'cvv'];
    const paypalFields = ['paypalEmail'];

    if (this.selectedMethod === 'credit-card') {
      // Enable credit card validators
      cardFields.forEach(field => {
        const control = this.paymentForm.get(field);
        if (control) {
          control.setValidators(this.getCardFieldValidators(field));
          control.updateValueAndValidity();
        }
      });

      // Disable PayPal validators
      paypalFields.forEach(field => {
        const control = this.paymentForm.get(field);
        if (control) {
          control.setValidators(null);
          control.updateValueAndValidity();
        }
      });
    } else {
      // Enable PayPal validators
      paypalFields.forEach(field => {
        const control = this.paymentForm.get(field);
        if (control) {
          control.setValidators([Validators.required, Validators.email]);
          control.updateValueAndValidity();
        }
      });

      // Disable credit card validators
      cardFields.forEach(field => {
        const control = this.paymentForm.get(field);
        if (control) {
          control.setValidators(null);
          control.updateValueAndValidity();
        }
      });
    }
  }

  private getCardFieldValidators(field: string): any[] {
    switch (field) {
      case 'cardholderName':
        return [Validators.required];
      case 'cardNumber':
        return [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)];
      case 'expiryDate':
        return [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)];
      case 'cvv':
        return [Validators.required, Validators.pattern(/^\d{3,4}$/)];
      default:
        return [];
    }
  }

  private savePaymentData(): void {
    if (this.selectedMethod === 'credit-card') {
      const { cardholderName, cardNumber, expiryDate, cvv } = this.paymentForm.value;
      if (cardholderName && cardNumber && expiryDate && cvv) {
        const paymentData: CreditCardPayment = {
          type: 'credit-card',
          cardholderName,
          cardNumber,
          expiryDate,
          cvv
        };
        this.checkoutService.updatePayment(paymentData);
      }
    } else if (this.selectedMethod === 'paypal') {
      const { paypalEmail } = this.paymentForm.value;
      if (paypalEmail) {
        const paymentData: PayPalPayment = {
          type: 'paypal',
          email: paypalEmail
        };
        this.checkoutService.updatePayment(paymentData);
      }
    }
  }

  onFieldBlur(fieldName: string): void {
    this.touchedFields.add(fieldName);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.valid && this.touchedFields.has(fieldName));
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && this.touchedFields.has(fieldName));
  }

  // Input formatters
  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    if (value.length > 19) value = value.substring(0, 19);
    input.value = value;
    this.paymentForm.get('cardNumber')?.setValue(value);
  }

  onExpiryDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
    this.paymentForm.get('expiryDate')?.setValue(value);
  }
}