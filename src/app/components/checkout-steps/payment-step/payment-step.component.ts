import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CheckoutService } from '../../../services/checkout.service';
import { PaymentMethod, PaymentData } from '../../../models/checkout.models';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="payment-step">
      <div class="step-header">
        <h2 class="step-title">Payment Information</h2>
        <p class="step-description">Choose your payment method and enter your details</p>
      </div>

      <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()" class="payment-form" novalidate>
        <!-- Payment Method Selection -->
        <div class="form-group">
          <fieldset>
            <legend class="form-label">Payment Method <span class="required">*</span></legend>
            <div class="payment-methods">
              <div class="payment-method">
                <input
                  type="radio"
                  id="credit_card"
                  value="credit_card"
                  formControlName="paymentMethod"
                  class="payment-radio"
                />
                <label for="credit_card" class="payment-label">
                  <div class="payment-option">
                    <svg class="payment-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                    <div>
                      <div class="payment-title">Credit Card</div>
                      <div class="payment-desc">Visa, Mastercard, American Express</div>
                    </div>
                  </div>
                </label>
              </div>

              <div class="payment-method">
                <input
                  type="radio"
                  id="paypal"
                  value="paypal"
                  formControlName="paymentMethod"
                  class="payment-radio"
                />
                <label for="paypal" class="payment-label">
                  <div class="payment-option">
                    <svg class="payment-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.854C5.026 2.366 5.474 2 6.005 2h7.072c2.535 0 4.28.911 5.184 2.709.846 1.681.61 3.642-.704 5.835-1.285 2.145-3.361 3.243-6.166 3.243h-1.758l-.927 3.93c-.061.26-.296.43-.573.43H7.076zm8.426-8.31c2.04 0 3.624-.69 4.709-2.051 1.032-1.295 1.185-2.717.453-4.226-.693-1.428-2.199-2.15-4.477-2.15H9.2L7.537 13.027h2.992c2.374 0 4.299-.69 5.723-2.051z"/>
                    </svg>
                    <div>
                      <div class="payment-title">PayPal</div>
                      <div class="payment-desc">Pay with your PayPal account</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Credit Card Fields -->
        @if (selectedPaymentMethod() === 'credit_card') {
          <div class="payment-fields">
            <div class="form-group">
              <label for="cardholderName" class="form-label">
                Cardholder Name <span class="required">*</span>
              </label>
              <input
                type="text"
                id="cardholderName"
                class="form-control"
                formControlName="cardholderName"
                autocomplete="cc-name"
                placeholder="John Doe"
                [class.error]="isFieldInvalid('cardholderName')"
                [attr.aria-describedby]="isFieldInvalid('cardholderName') ? 'cardholderName-error' : null"
                [attr.aria-invalid]="isFieldInvalid('cardholderName')"
              />
              @if (isFieldInvalid('cardholderName')) {
                <div id="cardholderName-error" class="error-message" role="alert">
                  {{ getFieldError('cardholderName') }}
                </div>
              }
            </div>

            <div class="form-group">
              <label for="cardNumber" class="form-label">
                Card Number <span class="required">*</span>
              </label>
              <input
                type="text"
                id="cardNumber"
                class="form-control"
                formControlName="cardNumber"
                autocomplete="cc-number"
                placeholder="1234 5678 9012 3456"
                inputmode="numeric"
                (input)="formatCardNumber($event)"
                [class.error]="isFieldInvalid('cardNumber')"
                [attr.aria-describedby]="isFieldInvalid('cardNumber') ? 'cardNumber-error' : null"
                [attr.aria-invalid]="isFieldInvalid('cardNumber')"
              />
              @if (isFieldInvalid('cardNumber')) {
                <div id="cardNumber-error" class="error-message" role="alert">
                  {{ getFieldError('cardNumber') }}
                </div>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="expiryMonth" class="form-label">
                  Expiry Month <span class="required">*</span>
                </label>
                <select
                  id="expiryMonth"
                  class="form-control"
                  formControlName="expiryMonth"
                  autocomplete="cc-exp-month"
                  [class.error]="isFieldInvalid('expiryMonth')"
                  [attr.aria-describedby]="isFieldInvalid('expiryMonth') ? 'expiryMonth-error' : null"
                  [attr.aria-invalid]="isFieldInvalid('expiryMonth')"
                >
                  <option value="">Month</option>
                  @for (month of months; track month.value) {
                    <option [value]="month.value">{{ month.label }}</option>
                  }
                </select>
                @if (isFieldInvalid('expiryMonth')) {
                  <div id="expiryMonth-error" class="error-message" role="alert">
                    {{ getFieldError('expiryMonth') }}
                  </div>
                }
              </div>

              <div class="form-group">
                <label for="expiryYear" class="form-label">
                  Expiry Year <span class="required">*</span>
                </label>
                <select
                  id="expiryYear"
                  class="form-control"
                  formControlName="expiryYear"
                  autocomplete="cc-exp-year"
                  [class.error]="isFieldInvalid('expiryYear')"
                  [attr.aria-describedby]="isFieldInvalid('expiryYear') ? 'expiryYear-error' : null"
                  [attr.aria-invalid]="isFieldInvalid('expiryYear')"
                >
                  <option value="">Year</option>
                  @for (year of years; track year.value) {
                    <option [value]="year.value">{{ year.label }}</option>
                  }
                </select>
                @if (isFieldInvalid('expiryYear')) {
                  <div id="expiryYear-error" class="error-message" role="alert">
                    {{ getFieldError('expiryYear') }}
                  </div>
                }
              </div>

              <div class="form-group">
                <label for="cvv" class="form-label">
                  CVV <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="cvv"
                  class="form-control"
                  formControlName="cvv"
                  autocomplete="cc-csc"
                  placeholder="123"
                  inputmode="numeric"
                  maxlength="4"
                  [class.error]="isFieldInvalid('cvv')"
                  [attr.aria-describedby]="isFieldInvalid('cvv') ? 'cvv-error cvv-help' : 'cvv-help'"
                  [attr.aria-invalid]="isFieldInvalid('cvv')"
                />
                <div id="cvv-help" class="field-help">3-digit code on back of card</div>
                @if (isFieldInvalid('cvv')) {
                  <div id="cvv-error" class="error-message" role="alert">
                    {{ getFieldError('cvv') }}
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- PayPal Fields -->
        @if (selectedPaymentMethod() === 'paypal') {
          <div class="payment-fields">
            <div class="form-group">
              <label for="paypalEmail" class="form-label">
                PayPal Email <span class="required">*</span>
              </label>
              <input
                type="email"
                id="paypalEmail"
                class="form-control"
                formControlName="paypalEmail"
                autocomplete="email"
                placeholder="your.email@example.com"
                inputmode="email"
                [class.error]="isFieldInvalid('paypalEmail')"
                [attr.aria-describedby]="isFieldInvalid('paypalEmail') ? 'paypalEmail-error' : null"
                [attr.aria-invalid]="isFieldInvalid('paypalEmail')"
              />
              @if (isFieldInvalid('paypalEmail')) {
                <div id="paypalEmail-error" class="error-message" role="alert">
                  {{ getFieldError('paypalEmail') }}
                </div>
              }
            </div>
            <div class="paypal-note">
              <p>You will be redirected to PayPal to complete your payment securely.</p>
            </div>
          </div>
        }

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="goBack()"
          >
            Back to Shipping
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!isPaymentFormValid() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <span class="loading-spinner" aria-hidden="true"></span>
              Processing...
            } @else {
              Continue to Review
            }
          </button>
        </div>

        @if (!isPaymentFormValid() && paymentForm.touched) {
          <div id="form-status" class="form-status" role="alert">
            Please select a payment method and fill in all required fields.
          </div>
        }
      </form>
    </div>
  `,
  styleUrl: './payment-step.component.css'
})
export class PaymentStepComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  paymentForm: FormGroup;
  isSubmitting = signal(false);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);

  months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: new Date(0, i).toLocaleDateString('en', { month: 'long' })
  }));

  years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: year.toString(), label: year.toString() };
  });

  constructor(
    private fb: FormBuilder,
    private checkoutService: CheckoutService
  ) {
    this.paymentForm = this.createForm();
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
      paymentMethod: ['', Validators.required],
      // Credit Card fields
      cardholderName: [''],
      cardNumber: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      // PayPal fields
      paypalEmail: ['']
    });
  }

  private loadSavedData(): void {
    const checkoutData = this.checkoutService.getCheckoutData();
    if (checkoutData.payment) {
      const payment = checkoutData.payment;
      this.paymentForm.patchValue({
        paymentMethod: payment.type || ''
      });

      if (payment.type === 'credit_card') {
        this.paymentForm.patchValue({
          cardholderName: (payment as any).cardholderName || '',
          cardNumber: (payment as any).cardNumber || '',
          expiryMonth: (payment as any).expiryMonth || '',
          expiryYear: (payment as any).expiryYear || '',
          cvv: (payment as any).cvv || ''
        });
      } else if (payment.type === 'paypal') {
        this.paymentForm.patchValue({
          paypalEmail: (payment as any).email || ''
        });
      }

      this.selectedPaymentMethod.set(payment.type as PaymentMethod);
    }
  }

  private setupFormSubscription(): void {
    // Watch payment method changes
    this.paymentForm.get('paymentMethod')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(method => {
        this.selectedPaymentMethod.set(method);
        this.updateValidators();
        this.updatePaymentData();
      });

    // Watch all form changes
    this.paymentForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePaymentData();
      });
  }

  private updateValidators(): void {
    const method = this.selectedPaymentMethod();

    // Clear all validators first
    Object.keys(this.paymentForm.controls).forEach(key => {
      if (key !== 'paymentMethod') {
        this.paymentForm.get(key)?.clearValidators();
        this.paymentForm.get(key)?.updateValueAndValidity();
      }
    });

    if (method === 'credit_card') {
      this.paymentForm.get('cardholderName')?.setValidators([Validators.required]);
      this.paymentForm.get('cardNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^[\d\s]{13,19}$/)
      ]);
      this.paymentForm.get('expiryMonth')?.setValidators([Validators.required]);
      this.paymentForm.get('expiryYear')?.setValidators([Validators.required]);
      this.paymentForm.get('cvv')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{3,4}$/)
      ]);
    } else if (method === 'paypal') {
      this.paymentForm.get('paypalEmail')?.setValidators([
        Validators.required,
        Validators.email
      ]);
    }

    // Update validity
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.updateValueAndValidity();
    });
  }

  private updatePaymentData(): void {
    const formValue = this.paymentForm.value;
    const method = formValue.paymentMethod;

    if (!method) {
      this.checkoutService.updatePayment({});
      return;
    }

    let paymentData: Partial<PaymentData>;

    if (method === 'credit_card') {
      paymentData = {
        type: 'credit_card',
        cardholderName: formValue.cardholderName || '',
        cardNumber: formValue.cardNumber || '',
        expiryMonth: formValue.expiryMonth || '',
        expiryYear: formValue.expiryYear || '',
        cvv: formValue.cvv || ''
      };
    } else {
      paymentData = {
        type: 'paypal',
        email: formValue.paypalEmail || ''
      };
    }

    this.checkoutService.updatePayment(paymentData);
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    if (formattedValue !== event.target.value) {
      event.target.value = formattedValue;
      this.paymentForm.get('cardNumber')?.setValue(formattedValue);
    }
  }

  isPaymentFormValid(): boolean {
    const method = this.selectedPaymentMethod();
    if (!method) return false;

    if (method === 'credit_card') {
      return !!(
        this.paymentForm.get('cardholderName')?.value &&
        this.paymentForm.get('cardNumber')?.value &&
        this.paymentForm.get('expiryMonth')?.value &&
        this.paymentForm.get('expiryYear')?.value &&
        this.paymentForm.get('cvv')?.value &&
        this.paymentForm.get('cardholderName')?.valid &&
        this.paymentForm.get('cardNumber')?.valid &&
        this.paymentForm.get('expiryMonth')?.valid &&
        this.paymentForm.get('expiryYear')?.valid &&
        this.paymentForm.get('cvv')?.valid
      );
    }

    if (method === 'paypal') {
      return !!(
        this.paymentForm.get('paypalEmail')?.value &&
        this.paymentForm.get('paypalEmail')?.valid
      );
    }

    return false;
  }

  onSubmit(): void {
    if (this.isPaymentFormValid()) {
      this.isSubmitting.set(true);

      const startTime = Date.now();
      setTimeout(() => {
        const completionTime = Date.now() - startTime;
        this.checkoutService.trackStepCompleted(2, completionTime);
        this.checkoutService.goToStep(3);
        this.isSubmitting.set(false);
      }, 1200);
    } else {
      this.paymentForm.markAllAsTouched();
    }
  }

  goBack(): void {
    this.checkoutService.goToStep(1);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field && field.errors && field.touched) {
      const errors = field.errors;
      if (errors['required']) return 'This field is required';
      if (errors['email']) return 'Please enter a valid email address';
      if (errors['pattern']) {
        if (fieldName === 'cardNumber') return 'Please enter a valid card number';
        if (fieldName === 'cvv') return 'Please enter a valid CVV';
      }
    }
    return '';
  }
}