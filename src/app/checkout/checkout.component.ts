import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CheckoutService } from '../services/checkout.service';
import { ProgressBarComponent } from '../components/progress-bar/progress-bar.component';
import { ShippingStepComponent } from '../components/checkout-steps/shipping-step/shipping-step.component';
import { PaymentStepComponent } from '../components/checkout-steps/payment-step/payment-step.component';
import { ReviewStepComponent } from '../components/checkout-steps/review-step/review-step.component';
import { CheckoutStep } from '../models/checkout.models';

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
        <h1 class="checkout-title">Checkout</h1>
        <p class="checkout-subtitle">Complete your purchase in just a few steps</p>
      </div>

      <div class="checkout-content">
        <app-progress-bar
          [currentStep]="currentStep()"
          [isStepValid]="isStepValid()"
          (stepChange)="onStepChange($event)"
        />

        <div class="step-content" [attr.aria-live]="'polite'" [attr.aria-label]="getStepAriaLabel()">
          @switch (currentStep()) {
            @case (1) {
              <app-shipping-step />
            }
            @case (2) {
              <app-payment-step />
            }
            @case (3) {
              <app-review-step />
            }
          }
        </div>
      </div>

      <!-- Loading overlay for step transitions -->
      @if (isTransitioning()) {
        <div class="loading-overlay" [attr.aria-hidden]="true">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading step...</div>
        </div>
      }

      <!-- Network status indicator -->
      @if (networkStatus() === 'offline') {
        <div class="network-status offline" role="alert">
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          You're offline. Changes will be saved when connection is restored.
        </div>
      } @else if (networkStatus() === 'slow') {
        <div class="network-status slow" role="status">
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Slow connection detected. Please be patient.
        </div>
      }

      <!-- Auto-save indicator -->
      @if (autoSaveStatus() === 'saving') {
        <div class="auto-save-status saving" role="status" aria-live="polite">
          <div class="save-spinner"></div>
          Saving...
        </div>
      } @else if (autoSaveStatus() === 'saved') {
        <div class="auto-save-status saved" role="status" aria-live="polite">
          <svg class="save-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          Changes saved
        </div>
      }
    </div>
  `,
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private stepStartTime = Date.now();

  // Reactive state from service
  currentStep = signal<CheckoutStep>(1);
  isStepValid = signal<{ [key in CheckoutStep]: boolean }>({ 1: false, 2: false, 3: false });

  // UI state
  isTransitioning = signal(false);
  networkStatus = signal<'online' | 'offline' | 'slow'>('online');
  autoSaveStatus = signal<'idle' | 'saving' | 'saved'>('idle');

  constructor(private checkoutService: CheckoutService) {
    // Initialize from service state
    this.currentStep.set(this.checkoutService.getCurrentStep());
    this.isStepValid.set({
      1: this.checkoutService.isStepValid(1),
      2: this.checkoutService.isStepValid(2),
      3: this.checkoutService.isStepValid(3)
    });
  }

  ngOnInit(): void {
    this.setupCheckoutStateSubscription();
    this.setupNetworkMonitoring();
    this.setupAutoSaveIndicator();
    this.setupBeforeUnloadHandler();
    this.announceCurrentStep();
  }

  ngOnDestroy(): void {
    this.trackStepAbandonment();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCheckoutStateSubscription(): void {
    this.checkoutService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        // Track step changes
        const previousStep = this.currentStep();
        if (state.currentStep !== previousStep) {
          this.onStepTransition(previousStep, state.currentStep);
        }

        this.currentStep.set(state.currentStep);
        this.isStepValid.set(state.isStepValid);
      });
  }

  private setupNetworkMonitoring(): void {
    // Monitor network status
    const handleOnline = () => {
      this.networkStatus.set('online');
      this.announceNetworkStatus('back online');
    };

    const handleOffline = () => {
      this.networkStatus.set('offline');
      this.announceNetworkStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection speed (simplified)
    const connection = (navigator as any).connection;
    let updateConnectionStatus: (() => void) | null = null;

    if (connection) {
      updateConnectionStatus = () => {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.networkStatus.set('slow');
        } else if (navigator.onLine) {
          this.networkStatus.set('online');
        } else {
          this.networkStatus.set('offline');
        }
      };

      connection.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
    }

    // Clean up event listeners on destroy
    this.destroy$.subscribe(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection && updateConnectionStatus) {
        connection.removeEventListener('change', updateConnectionStatus);
      }
    });
  }

  private setupAutoSaveIndicator(): void {
    // Simulate auto-save status updates
    let saveTimeout: any;
    let statusTimeout: any;
    this.checkoutService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear previous timeouts to prevent race condition
        if (saveTimeout) clearTimeout(saveTimeout);
        if (statusTimeout) clearTimeout(statusTimeout);

        this.autoSaveStatus.set('saving');

        saveTimeout = setTimeout(() => {
          this.autoSaveStatus.set('saved');

          statusTimeout = setTimeout(() => {
            this.autoSaveStatus.set('idle');
          }, 2000);
        }, 800);
      });
  }

  private setupBeforeUnloadHandler(): void {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Track abandonment
      this.trackStepAbandonment();

      // Only show warning if user has made progress
      if (this.currentStep() > 1 || this.checkoutService.isStepValid(1)) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up on component destroy
    this.destroy$.subscribe(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });
  }

  private onStepTransition(from: CheckoutStep, to: CheckoutStep): void {
    this.isTransitioning.set(true);

    // Track step completion
    if (to > from && this.checkoutService.isStepValid(from)) {
      const completionTime = Date.now() - this.stepStartTime;
      this.checkoutService.trackStepCompleted(from, completionTime);
    }

    // Manage focus
    setTimeout(() => {
      this.focusStepContent();
      this.announceCurrentStep();
      this.stepStartTime = Date.now();
      this.isTransitioning.set(false);
    }, 300);
  }

  private focusStepContent(): void {
    // Focus the step content for accessibility
    const stepContent = document.querySelector('.step-content');
    if (stepContent) {
      (stepContent as HTMLElement).focus();
    }
  }

  private announceCurrentStep(): void {
    const stepNames = { 1: 'Shipping Information', 2: 'Payment Information', 3: 'Review Order' };
    const announcement = `Now on step ${this.currentStep()}: ${stepNames[this.currentStep()]}`;
    this.announceToScreenReader(announcement);
  }

  private announceNetworkStatus(status: string): void {
    this.announceToScreenReader(`Network status: ${status}`);
  }

  private announceToScreenReader(message: string): void {
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  private trackStepAbandonment(): void {
    const timeSpent = Date.now() - this.stepStartTime;
    this.checkoutService.trackStepAbandoned(
      this.currentStep(),
      timeSpent,
      'component_destroy'
    );
  }

  onStepChange(step: CheckoutStep): void {
    const success = this.checkoutService.goToStep(step);
    if (!success) {
      // Step change was prevented due to validation
      this.announceToScreenReader('Please complete the current step before proceeding');
    }
  }

  getStepAriaLabel(): string {
    const stepNames = { 1: 'Shipping Information', 2: 'Payment Information', 3: 'Review Order' };
    return `Step ${this.currentStep()} of 3: ${stepNames[this.currentStep()]}`;
  }
}