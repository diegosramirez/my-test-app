import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CheckoutService } from './services/checkout.service';
import { CheckoutData, CheckoutStep, ShippingAddress, PaymentMethod } from './models/checkout.models';

import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { ShippingFormComponent } from './components/shipping-form/shipping-form.component';
import { PaymentMethodComponent } from './components/payment-method/payment-method.component';
import { OrderSummaryComponent } from './components/order-summary/order-summary.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ProgressBarComponent,
    ShippingFormComponent,
    PaymentMethodComponent,
    OrderSummaryComponent
  ],
  template: `
    <div class="checkout-container">
      <!-- Progress Bar -->
      <app-progress-bar
        [currentStep]="currentStep"
        [completedSteps]="checkoutData?.completedSteps || []"
        [canNavigateToStep]="canNavigateToStep.bind(this)"
        (stepClicked)="onStepNavigation($event, 'progress_click')">
      </app-progress-bar>

      <!-- Main Content -->
      <main class="checkout-main" role="main">
        <div class="step-container">

          <!-- Step 1: Shipping Form -->
          <app-shipping-form
            *ngIf="currentStep === CheckoutStep.SHIPPING"
            [initialData]="checkoutData?.shippingAddress || null"
            [isSubmitting]="isSubmitting"
            (formSubmitted)="onShippingSubmitted($event)"
            (formChanged)="onShippingChanged($event)">
          </app-shipping-form>

          <!-- Step 2: Payment Method -->
          <app-payment-method
            *ngIf="currentStep === CheckoutStep.PAYMENT"
            [initialData]="checkoutData?.paymentMethod || null"
            [isSubmitting]="isSubmitting"
            (formSubmitted)="onPaymentSubmitted($event)"
            (formChanged)="onPaymentChanged($event)"
            (backClicked)="onStepNavigation(CheckoutStep.SHIPPING, 'back_button')">
          </app-payment-method>

          <!-- Step 3: Order Summary -->
          <app-order-summary
            *ngIf="currentStep === CheckoutStep.SUMMARY"
            [checkoutData]="checkoutData"
            [isSubmitting]="isSubmitting"
            [errorMessage]="orderErrorMessage"
            (orderCompleted)="onOrderCompleted()"
            (backClicked)="onStepNavigation(CheckoutStep.PAYMENT, 'back_button')"
            (editShipping)="onStepNavigation(CheckoutStep.SHIPPING, 'edit_link')"
            (editPayment)="onStepNavigation(CheckoutStep.PAYMENT, 'edit_link')"
            (errorCleared)="clearOrderError()">
          </app-order-summary>

        </div>
      </main>

      <!-- Error Message Display -->
      <div
        *ngIf="errorMessage && currentStep !== CheckoutStep.SUMMARY"
        class="global-error"
        role="alert"
        aria-live="assertive">
        <div class="error-content">
          <span class="error-icon" aria-hidden="true">⚠️</span>
          <div class="error-text">
            <h4 class="error-title">Something went wrong</h4>
            <p class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
        <button
          type="button"
          class="error-dismiss"
          (click)="clearError()"
          [attr.aria-label]="'Dismiss error message'">
          ×
        </button>
      </div>

      <!-- Success Message (if order completed) -->
      <div
        *ngIf="orderCompleted"
        class="success-message"
        role="alert"
        aria-live="assertive">
        <div class="success-content">
          <span class="success-icon" aria-hidden="true">✅</span>
          <div class="success-text">
            <h3 class="success-title">Order Complete!</h3>
            <p class="success-description">
              Thank you for your purchase. You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div
        *ngIf="isSubmitting"
        class="loading-overlay"
        role="status"
        aria-live="polite"
        [attr.aria-label]="loadingMessage">
        <div class="loading-content">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p class="loading-text">{{ loadingMessage }}</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private stepStartTime = 0;
  private validationAttempts = 0;

  checkoutData: CheckoutData | null = null;
  currentStep = CheckoutStep.SHIPPING;
  isSubmitting = false;
  errorMessage: string | null = null;
  orderErrorMessage: string | null = null;
  orderCompleted = false;
  loadingMessage = '';

  // Expose enum to template
  CheckoutStep = CheckoutStep;

  constructor(
    private checkoutService: CheckoutService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.stepStartTime = Date.now();
    this.subscribeToCheckoutData();
    this.initializeFromRoute();
    this.checkForErrorParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToCheckoutData(): void {
    this.checkoutService.checkoutData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.checkoutData = data;
        if (data) {
          this.currentStep = data.currentStep;
        }
      });
  }

  private initializeFromRoute(): void {
    const stepParam = this.route.snapshot.params['step'];
    if (stepParam && Object.values(CheckoutStep).includes(stepParam as CheckoutStep)) {
      this.currentStep = stepParam as CheckoutStep;
      this.checkoutService.setCurrentStep(this.currentStep);
      this.checkoutService.trackStepViewed(this.currentStep);
    } else {
      // Navigate to first step if no valid step provided
      this.navigateToStep(CheckoutStep.SHIPPING);
    }
  }

  private checkForErrorParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['error'] === 'incomplete_prerequisites') {
        this.errorMessage = 'Please complete the previous steps before proceeding.';
        setTimeout(() => this.clearError(), 5000); // Auto-clear after 5 seconds
      }
    });
  }

  canNavigateToStep(step: CheckoutStep): boolean {
    return this.checkoutService.canNavigateToStep(step);
  }

  onStepNavigation(step: CheckoutStep, navigationType: string): void {
    if (this.canNavigateToStep(step) || step === CheckoutStep.SHIPPING) {
      this.checkoutService.trackStepNavigation(this.currentStep, step, navigationType);
      this.navigateToStep(step);
    }
  }

  private navigateToStep(step: CheckoutStep): void {
    this.currentStep = step;
    this.checkoutService.setCurrentStep(step);
    this.checkoutService.trackStepViewed(step);
    this.clearError();
    this.stepStartTime = Date.now();
    this.validationAttempts = 0;

    // Update URL
    this.router.navigate(['/checkout', step], { replaceUrl: true });
  }

  onShippingChanged(event: { isValid: boolean; data: ShippingAddress | null }): void {
    if (event.data) {
      this.checkoutService.updateShippingAddress(event.data);
    }
  }

  onShippingSubmitted(address: ShippingAddress): void {
    this.isSubmitting = true;
    this.loadingMessage = 'Validating shipping information...';
    this.validationAttempts++;

    this.checkoutService.validateShipping(address).subscribe({
      next: (response) => {
        if (response.success) {
          this.checkoutService.updateShippingAddress(address);
          this.checkoutService.markStepCompleted(CheckoutStep.SHIPPING);

          const completionTime = Date.now() - this.stepStartTime;
          this.checkoutService.trackStepCompleted(CheckoutStep.SHIPPING, completionTime, this.validationAttempts);

          this.navigateToStep(CheckoutStep.PAYMENT);
        } else {
          this.handleValidationError(response.message || 'Shipping validation failed');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.handleValidationError('Network error occurred. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  onPaymentChanged(event: { isValid: boolean; data: PaymentMethod | null }): void {
    if (event.data) {
      this.checkoutService.updatePaymentMethod(event.data);
    }
  }

  onPaymentSubmitted(payment: PaymentMethod): void {
    this.isSubmitting = true;
    this.loadingMessage = 'Validating payment information...';
    this.validationAttempts++;

    // Track payment method selection
    this.checkoutService.trackPaymentMethodSelected(
      payment.type,
      Date.now() - this.stepStartTime
    );

    this.checkoutService.validatePayment(payment).subscribe({
      next: (response) => {
        if (response.success) {
          this.checkoutService.updatePaymentMethod(payment);
          this.checkoutService.markStepCompleted(CheckoutStep.PAYMENT);

          const completionTime = Date.now() - this.stepStartTime;
          this.checkoutService.trackStepCompleted(CheckoutStep.PAYMENT, completionTime, this.validationAttempts);

          this.navigateToStep(CheckoutStep.SUMMARY);
        } else {
          this.handleValidationError(response.message || 'Payment validation failed');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.handleValidationError('Payment processing error. Please try again.');
        this.isSubmitting = false;
      }
    });
  }

  onOrderCompleted(): void {
    this.isSubmitting = true;
    this.loadingMessage = 'Processing your order...';

    const completionStartTime = Date.now();

    this.checkoutService.submitOrder().subscribe({
      next: (response) => {
        if (response.success) {
          this.checkoutService.markStepCompleted(CheckoutStep.SUMMARY);

          const totalCompletionTime = Date.now() - completionStartTime;
          const paymentMethod = this.checkoutData?.paymentMethod?.type || '';
          const totalAmount = this.checkoutData?.orderSummary.total || 0;

          this.checkoutService.trackOrderSubmitted(totalAmount, paymentMethod, totalCompletionTime);

          this.orderCompleted = true;
          this.clearOrderError();

          // Clear checkout data after successful order
          setTimeout(() => {
            this.checkoutService.clearCheckoutData();
          }, 3000);
        } else {
          this.orderErrorMessage = response.message || 'Order submission failed. Please try again.';
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.orderErrorMessage = 'An error occurred while processing your order. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  private handleValidationError(message: string): void {
    this.errorMessage = message;
    this.checkoutService.trackValidationError(this.currentStep, 'form', 'validation_failed');

    // Auto-clear error after 5 seconds
    setTimeout(() => this.clearError(), 5000);
  }

  clearError(): void {
    this.errorMessage = null;
    // Remove error query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  clearOrderError(): void {
    this.orderErrorMessage = null;
  }
}