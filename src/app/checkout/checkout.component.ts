import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CheckoutService } from './services/checkout.service';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { ShippingStepComponent } from './components/shipping-step/shipping-step.component';
import { PaymentStepComponent } from './components/payment-step/payment-step.component';
import { ReviewStepComponent } from './components/review-step/review-step.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ProgressBarComponent,
    ShippingStepComponent,
    PaymentStepComponent,
    ReviewStepComponent
  ],
  template: `
    <div class="checkout-container">
      <div class="checkout-header">
        <h1 class="checkout-title">Secure Checkout</h1>
        <div class="security-badge">
          <span class="security-icon">🔒</span>
          <span class="security-text">Secure SSL Encryption</span>
        </div>
      </div>

      <app-progress-bar
        [steps]="steps()"
        [currentStep]="currentStep()"
        (stepClick)="onStepClick($event)"
      ></app-progress-bar>

      <main class="checkout-main" role="main">
        <div class="step-container" [attr.aria-live]="'polite'">
          <!-- Step 1: Shipping -->
          <div
            *ngIf="currentStep() === 1"
            class="step-content"
            role="tabpanel"
            aria-labelledby="step-1-tab"
          >
            <app-shipping-step></app-shipping-step>
          </div>

          <!-- Step 2: Payment -->
          <div
            *ngIf="currentStep() === 2"
            class="step-content"
            role="tabpanel"
            aria-labelledby="step-2-tab"
          >
            <app-payment-step></app-payment-step>
          </div>

          <!-- Step 3: Review -->
          <div
            *ngIf="currentStep() === 3"
            class="step-content"
            role="tabpanel"
            aria-labelledby="step-3-tab"
          >
            <app-review-step (editStep)="onEditStep($event)"></app-review-step>
          </div>
        </div>

        <div class="checkout-navigation">
          <button
            type="button"
            class="nav-button secondary"
            [disabled]="currentStep() === 1"
            (click)="onPreviousStep()"
            [attr.aria-label]="'Go to previous step: ' + getPreviousStepName()"
          >
            <span class="nav-icon">←</span>
            Previous
          </button>

          <button
            *ngIf="currentStep() < 3"
            type="button"
            class="nav-button primary"
            [disabled]="!canProceed()"
            (click)="onNextStep()"
            [attr.aria-label]="'Go to next step: ' + getNextStepName()"
          >
            Next
            <span class="nav-icon">→</span>
          </button>

          <div *ngIf="currentStep() === 3" class="final-step-notice">
            <p>Review your order and click "Place Order" to complete your purchase.</p>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div *ngIf="isLoading()" class="loading-overlay" role="dialog" aria-modal="true" aria-label="Processing">
          <div class="loading-content">
            <div class="loading-spinner" aria-hidden="true"></div>
            <p class="loading-text">Processing your request...</p>
          </div>
        </div>

        <!-- Error Messages -->
        <div *ngIf="error()" class="global-error" role="alert">
          <h3 class="error-title">Something went wrong</h3>
          <p class="error-message">{{ error() }}</p>
          <button type="button" class="retry-button" (click)="onRetryAction()">
            Try Again
          </button>
        </div>
      </main>

      <!-- Screen Reader Announcements -->
      <div
        class="sr-only"
        role="status"
        aria-live="assertive"
        [attr.aria-label]="screenReaderMessage"
      >
        {{ screenReaderMessage }}
      </div>
    </div>
  `,
  styles: [`
    .checkout-container {
      min-height: 100vh;
      background-color: #f8f9fa;
    }

    .checkout-header {
      background-color: white;
      border-bottom: 1px solid #dee2e6;
      padding: 1.5rem 0;
      text-align: center;
    }

    .checkout-title {
      font-size: 2rem;
      font-weight: 700;
      color: #212529;
      margin-bottom: 0.5rem;
    }

    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #e7f3ff;
      border: 1px solid #b8daff;
      border-radius: 1rem;
      color: #004085;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .security-icon {
      font-size: 1rem;
    }

    .checkout-main {
      position: relative;
      padding: 2rem 0;
      min-height: calc(100vh - 200px);
    }

    .step-container {
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
      max-width: 800px;
      margin-bottom: 2rem;
    }

    .step-content {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .checkout-navigation {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .nav-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .nav-button.primary {
      background-color: #007bff;
      color: white;
    }

    .nav-button.primary:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .nav-button.primary:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    .nav-button.secondary {
      background-color: #6c757d;
      color: white;
    }

    .nav-button.secondary:hover:not(:disabled) {
      background-color: #545b62;
    }

    .nav-button.secondary:focus {
      outline: 2px solid #6c757d;
      outline-offset: 2px;
    }

    .nav-icon {
      font-size: 1.2em;
    }

    .final-step-notice {
      flex: 1;
      text-align: center;
      color: #6c757d;
      font-size: 0.875rem;
      margin: 0 1rem;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-content {
      background-color: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 300px;
    }

    .loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 4px solid #f3f4f6;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      color: #495057;
      font-size: 1rem;
      margin: 0;
    }

    .global-error {
      max-width: 800px;
      margin: 2rem auto 0;
      padding: 1.5rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 0.5rem;
      color: #721c24;
      text-align: center;
    }

    .error-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .error-message {
      margin-bottom: 1rem;
    }

    .retry-button {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .retry-button:hover {
      background-color: #c82333;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .checkout-title {
        font-size: 1.5rem;
      }

      .checkout-navigation {
        padding: 0 1rem;
        flex-direction: column;
        gap: 1rem;
      }

      .nav-button {
        width: 100%;
        justify-content: center;
      }

      .final-step-notice {
        order: -1;
        margin: 0;
        text-align: center;
      }

      .checkout-main {
        padding: 1rem 0;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .nav-button {
        border: 2px solid currentColor;
      }

      .loading-overlay {
        background-color: rgba(0, 0, 0, 0.8);
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .step-content {
        animation: none;
      }

      .loading-spinner {
        animation: none;
        border-top-color: transparent;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private checkoutService = inject(CheckoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private destroy$ = new Subject<void>();

  // Expose service signals
  readonly currentStep = this.checkoutService.currentStep;
  readonly steps = this.checkoutService.steps;
  readonly canProceed = this.checkoutService.canProceed;
  readonly isLoading = this.checkoutService.isLoading;
  readonly error = this.checkoutService.error;

  screenReaderMessage = '';
  private stepStartTime = Date.now();

  ngOnInit(): void {
    this.initializeFromRoute();
    this.announceCurrentStep();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent): void {
    this.checkoutService.handleBrowserNavigation('back');
    this.handleRouteChange();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    const hasData = this.checkoutService.checkoutData().shipping || this.checkoutService.checkoutData().payment;
    if (hasData) {
      event.preventDefault();
      event.returnValue = 'You have unsaved checkout information. Are you sure you want to leave?';
    }
  }

  private initializeFromRoute(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const step = parseInt(params['step']) || 1;
        if (step >= 1 && step <= 3) {
          this.checkoutService.goToStep(step);
        }
      });
  }

  private handleRouteChange(): void {
    const queryParams = new URLSearchParams(this.location.path().split('?')[1] || '');
    const stepFromUrl = parseInt(queryParams.get('step') || '1');

    if (stepFromUrl !== this.currentStep()) {
      this.checkoutService.goToStep(stepFromUrl);
      this.announceCurrentStep();
    }
  }

  onStepClick(stepNumber: number): void {
    if (stepNumber !== this.currentStep()) {
      this.navigateToStep(stepNumber);
    }
  }

  onNextStep(): void {
    if (this.canProceed()) {
      const nextStep = this.currentStep() + 1;
      if (nextStep <= 3) {
        this.navigateToStep(nextStep);
      }
    }
  }

  onPreviousStep(): void {
    const previousStep = this.currentStep() - 1;
    if (previousStep >= 1) {
      this.navigateToStep(previousStep);
    }
  }

  onEditStep(stepNumber: number): void {
    this.navigateToStep(stepNumber);
  }

  private navigateToStep(stepNumber: number): void {
    this.stepStartTime = Date.now();
    this.checkoutService.goToStep(stepNumber);
    this.updateUrl(stepNumber);
    this.announceCurrentStep();
  }

  private updateUrl(step: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step },
      queryParamsHandling: 'merge'
    });
  }

  private announceCurrentStep(): void {
    const step = this.steps().find(s => s.id === this.currentStep());
    if (step) {
      this.screenReaderMessage = `Now on ${step.label}. Step ${step.id} of 3.`;

      // Clear the message after announcement
      setTimeout(() => {
        this.screenReaderMessage = '';
      }, 1000);
    }
  }

  onRetryAction(): void {
    // Clear error and retry the last action
    this.checkoutService.error.set(null);
  }

  getPreviousStepName(): string {
    const previousStep = this.steps().find(s => s.id === this.currentStep() - 1);
    return previousStep ? previousStep.label : '';
  }

  getNextStepName(): string {
    const nextStep = this.steps().find(s => s.id === this.currentStep() + 1);
    return nextStep ? nextStep.label : '';
  }
}