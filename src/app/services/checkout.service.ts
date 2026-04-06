import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CheckoutData,
  CheckoutStep,
  CheckoutState,
  ShippingAddress,
  PaymentData,
  CartItem,
  OrderSummary,
  CheckoutEvent
} from '../models/checkout.models';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private readonly STORAGE_KEY = 'checkout_data';
  private sessionId = this.generateSessionId();

  // Mock cart data for demo
  private mockCartItems: CartItem[] = [
    {
      id: '1',
      name: 'Wireless Headphones',
      price: 199.99,
      quantity: 1,
      imageUrl: 'https://via.placeholder.com/100'
    },
    {
      id: '2',
      name: 'Bluetooth Speaker',
      price: 79.99,
      quantity: 2,
      imageUrl: 'https://via.placeholder.com/100'
    }
  ];

  private initialState: CheckoutState = {
    currentStep: 1,
    data: {
      shipping: {},
      payment: {},
      orderSummary: this.calculateOrderSummary(this.mockCartItems)
    },
    isStepValid: {
      1: false,
      2: false,
      3: false
    }
  };

  private stateSubject = new BehaviorSubject<CheckoutState>(this.loadInitialState());

  public state$ = this.stateSubject.asObservable();
  public currentState = computed(() => this.stateSubject.value);

  constructor() {
    // Auto-save state changes (excluding payment data)
    this.state$.subscribe(state => {
      this.saveToSessionStorage(state);
    });

    // Track analytics events
    this.trackEvent('checkout_step_viewed', { step: 'shipping' });
  }

  private loadInitialState(): CheckoutState {
    try {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Always recalculate order summary to ensure consistency
        parsedState.data.orderSummary = this.calculateOrderSummary(this.mockCartItems);
        return parsedState;
      }
    } catch (error) {
      console.warn('Failed to load checkout data from session storage:', error);
    }
    return this.initialState;
  }

  private saveToSessionStorage(state: CheckoutState): void {
    try {
      // Create a copy without sensitive payment data
      const stateToSave = {
        ...state,
        data: {
          ...state.data,
          payment: {} // Don't persist payment data for security
        }
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save checkout data to session storage:', error);
    }
  }

  private calculateOrderSummary(items: CartItem[]): OrderSummary {
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + tax + shipping;

    return {
      items,
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  }

  private generateSessionId(): string {
    return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  goToStep(step: CheckoutStep): boolean {
    const currentState = this.stateSubject.value;

    // Validate that previous steps are completed when moving forward
    if (step > currentState.currentStep) {
      for (let i = 1; i < step; i++) {
        if (!currentState.isStepValid[i as CheckoutStep]) {
          return false;
        }
      }
    }

    this.updateState({
      currentStep: step
    });

    // Track step navigation
    const stepNames = { 1: 'shipping', 2: 'payment', 3: 'review' };
    this.trackEvent('checkout_step_viewed', {
      step: stepNames[step],
      previous_step: stepNames[currentState.currentStep]
    });

    return true;
  }

  updateShipping(shipping: Partial<ShippingAddress>): void {
    const currentState = this.stateSubject.value;
    const updatedShipping = { ...currentState.data.shipping, ...shipping };

    this.updateState({
      data: {
        ...currentState.data,
        shipping: updatedShipping
      },
      isStepValid: {
        ...currentState.isStepValid,
        1: this.validateShipping(updatedShipping)
      }
    });
  }

  updatePayment(payment: Partial<PaymentData>): void {
    const currentState = this.stateSubject.value;
    const updatedPayment = { ...currentState.data.payment, ...payment };

    this.updateState({
      data: {
        ...currentState.data,
        payment: updatedPayment
      },
      isStepValid: {
        ...currentState.isStepValid,
        2: this.validatePayment(updatedPayment)
      }
    });

    // Track payment method selection
    if (payment.type) {
      this.trackEvent('payment_method_selected', { method: payment.type });
    }
  }

  private validateShipping(shipping: Partial<ShippingAddress>): boolean {
    const required = ['firstName', 'lastName', 'street', 'city', 'state', 'zipCode', 'country'];
    return required.every(field => shipping[field as keyof ShippingAddress]?.trim());
  }

  private validatePayment(payment: Partial<PaymentData>): boolean {
    if (!payment.type) return false;

    if (payment.type === 'credit_card') {
      const required = ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv', 'cardholderName'];
      return required.every(field => payment[field as keyof PaymentData]?.toString().trim());
    }

    if (payment.type === 'paypal') {
      return !!(payment as any).email?.trim();
    }

    return false;
  }

  private updateState(updates: Partial<CheckoutState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...updates });
  }

  // Analytics tracking
  private trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    const event: CheckoutEvent = {
      eventName,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties
    };

    console.log('Checkout Event:', event);
    // In real app, send to analytics service
  }

  trackStepCompleted(step: CheckoutStep, completionTime: number): void {
    const stepNames = { 1: 'shipping', 2: 'payment', 3: 'review' };
    this.trackEvent('checkout_step_completed', {
      step: stepNames[step],
      completion_time: completionTime
    });
  }

  trackStepAbandoned(step: CheckoutStep, timeSpent: number, exitMethod: string): void {
    const stepNames = { 1: 'shipping', 2: 'payment', 3: 'review' };
    this.trackEvent('checkout_step_abandoned', {
      step: stepNames[step],
      time_spent: timeSpent,
      exit_method: exitMethod
    });
  }

  trackValidationError(step: CheckoutStep, field: string, errorType: string): void {
    const stepNames = { 1: 'shipping', 2: 'payment', 3: 'review' };
    this.trackEvent('checkout_validation_error', {
      step: stepNames[step],
      field,
      error_type: errorType
    });
  }

  submitOrder(): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const currentState = this.stateSubject.value;

    // Validate all steps
    if (!currentState.isStepValid[1] || !currentState.isStepValid[2]) {
      return Promise.resolve({
        success: false,
        error: 'Please complete all required steps'
      });
    }

    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const orderId = `ORD-${Date.now()}`;

        this.trackEvent('checkout_completed', {
          total_time: Date.now() - parseInt(this.sessionId.split('_')[1]),
          payment_method: currentState.data.payment.type,
          order_value: currentState.data.orderSummary.total,
          order_id: orderId
        });

        // Clear checkout data after successful order
        this.clearCheckoutData();

        resolve({ success: true, orderId });
      }, 2000);
    });
  }

  clearCheckoutData(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.stateSubject.next(this.initialState);
  }

  // Getters for reactive components
  getCurrentStep(): CheckoutStep {
    return this.stateSubject.value.currentStep;
  }

  getCheckoutData(): CheckoutData {
    return this.stateSubject.value.data;
  }

  isStepValid(step: CheckoutStep): boolean {
    return this.stateSubject.value.isStepValid[step];
  }
}