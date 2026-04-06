import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, map, throwError, finalize } from 'rxjs';
import {
  CheckoutData,
  CheckoutStep,
  CheckoutTrackingEvent,
  CheckoutApiResponse,
  ShippingAddress,
  PaymentData,
  OrderSummary
} from '../models/checkout.models';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private readonly STORAGE_KEY = 'checkout-data';
  private readonly currentStepSubject = new BehaviorSubject<number>(1);

  // Signals for reactive state management
  public readonly checkoutData = signal<CheckoutData>(this.loadFromStorage());
  public readonly currentStep = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // Computed properties
  public readonly steps = computed<CheckoutStep[]>(() => [
    {
      id: 1,
      name: 'shipping',
      label: 'Shipping Address',
      completed: this.isShippingValid(),
      valid: this.isShippingValid()
    },
    {
      id: 2,
      name: 'payment',
      label: 'Payment Method',
      completed: this.isPaymentValid(),
      valid: this.isPaymentValid()
    },
    {
      id: 3,
      name: 'review',
      label: 'Order Review',
      completed: false,
      valid: this.isOrderValid()
    }
  ]);

  public readonly currentStepData = computed(() => this.steps().find(s => s.id === this.currentStep()));
  public readonly canProceed = computed(() => {
    const current = this.currentStepData();
    return current ? current.valid : false;
  });

  constructor(private http: HttpClient) {
    // Initialize order data (in real app, this would come from cart service)
    this.initializeOrderData();
  }

  // Step navigation
  goToStep(stepNumber: number): void {
    if (stepNumber >= 1 && stepNumber <= 3) {
      this.currentStep.set(stepNumber);
      this.trackEvent({
        eventName: 'checkout_step_entered',
        properties: {
          step_number: stepNumber,
          step_name: this.steps().find(s => s.id === stepNumber)?.name || '',
          data_restored: this.hasStoredData()
        }
      });
    }
  }

  nextStep(): void {
    const current = this.currentStep();
    if (current < 3 && this.canProceed()) {
      this.completeCurrentStep();
      this.goToStep(current + 1);
    }
  }

  previousStep(): void {
    const current = this.currentStep();
    if (current > 1) {
      this.goToStep(current - 1);
    }
  }

  // Data management
  updateShipping(shipping: ShippingAddress): void {
    const data = this.checkoutData();
    const updated = { ...data, shipping };
    this.checkoutData.set(updated);
    this.saveToStorage(updated);
    this.autoSaveData(1, Object.keys(shipping));
  }

  updatePayment(payment: PaymentData): void {
    const data = this.checkoutData();
    const updated = { ...data, payment };
    this.checkoutData.set(updated);
    this.saveToStorage(updated);
    this.autoSaveData(2, ['payment_method']);

    this.trackEvent({
      eventName: 'payment_method_selected',
      properties: {
        method_type: payment.type
      }
    });
  }

  // API calls
  submitOrder(): Observable<CheckoutApiResponse> {
    // Prevent duplicate submissions - return empty observable
    if (this.isLoading()) {
      return new Observable(() => {});
    }

    this.isLoading.set(true);
    this.error.set(null);

    const data = this.checkoutData();

    return this.http.post<CheckoutApiResponse>('/api/checkout/submit', data)
      .pipe(
        map(response => {
          if (response.success) {
            this.clearStoredData();
            this.trackEvent({
              eventName: 'checkout_completed',
              properties: {
                total_time: this.calculateTotalTime(),
                steps_completed: this.steps().filter(s => s.completed).length,
                retry_count: 0
              }
            });
          }
          this.isLoading.set(false);
          return response;
        }),
        catchError(error => {
          this.error.set('Order submission failed. Please try again.');
          this.trackEvent({
            eventName: 'checkout_error_recovery',
            properties: {
              error_type: 'api_failure',
              recovery_method: 'retry_button'
            }
          });
          this.isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  validateAddress(address: ShippingAddress): Observable<boolean> {
    return this.http.post<{valid: boolean}>('/api/checkout/validate-address', address)
      .pipe(
        map(response => response.valid),
        catchError(() => {
          // Fallback validation on API failure
          return [true];
        })
      );
  }

  // Browser navigation handling
  handleBrowserNavigation(direction: 'back' | 'forward'): void {
    this.trackEvent({
      eventName: 'checkout_browser_navigation',
      properties: {
        direction,
        current_step: this.currentStep()
      }
    });
  }

  // Private methods
  private completeCurrentStep(): void {
    const current = this.currentStep();
    const stepName = this.steps().find(s => s.id === current)?.name || '';

    this.trackEvent({
      eventName: 'checkout_step_completed',
      properties: {
        step_number: current,
        validation_errors: 0,
        time_spent: this.calculateStepTime()
      }
    });
  }

  private isShippingValid(): boolean {
    const shipping = this.checkoutData().shipping;
    if (!shipping) return false;

    return !!(shipping.firstName &&
             shipping.lastName &&
             shipping.address &&
             shipping.city &&
             shipping.state &&
             shipping.zipCode);
  }

  private isPaymentValid(): boolean {
    const payment = this.checkoutData().payment;
    if (!payment) return false;

    if (payment.type === 'credit-card') {
      return !!(payment.cardNumber &&
               payment.expiryDate &&
               payment.cvv &&
               payment.cardholderName);
    }

    if (payment.type === 'paypal') {
      return !!payment.email;
    }

    return false;
  }

  private isOrderValid(): boolean {
    return this.isShippingValid() && this.isPaymentValid();
  }

  private loadFromStorage(): CheckoutData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : { shipping: null, payment: null, order: null };
    } catch {
      return { shipping: null, payment: null, order: null };
    }
  }

  private saveToStorage(data: CheckoutData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save checkout data to localStorage:', error);
    }
  }

  private clearStoredData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private hasStoredData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return false;

      const data = JSON.parse(stored);
      // Only count as "restored" if shipping or payment data exists
      return !!(data.shipping || data.payment);
    } catch {
      return false;
    }
  }

  private autoSaveData(stepNumber: number, fieldsSaved: string[]): void {
    this.trackEvent({
      eventName: 'checkout_data_saved',
      properties: {
        step_number: stepNumber,
        fields_saved: fieldsSaved
      }
    });
  }

  private trackEvent(event: CheckoutTrackingEvent): void {
    // In a real app, this would send to analytics service
    console.log('Tracking event:', event);
  }

  private calculateTotalTime(): number {
    // Placeholder - in real app, track start time
    return Date.now();
  }

  private calculateStepTime(): number {
    // Placeholder - in real app, track step start time
    return Date.now();
  }

  private initializeOrderData(): void {
    const data = this.checkoutData();
    if (!data.order) {
      const mockOrder: OrderSummary = {
        items: [
          { id: '1', name: 'Product 1', price: 29.99, quantity: 2 },
          { id: '2', name: 'Product 2', price: 49.99, quantity: 1 }
        ],
        subtotal: 109.97,
        shipping: 9.99,
        tax: 8.80,
        total: 128.76
      };

      const updated = { ...data, order: mockOrder };
      this.checkoutData.set(updated);
      this.saveToStorage(updated);
    }
  }
}