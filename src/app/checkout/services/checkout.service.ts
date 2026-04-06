import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import {
  CheckoutData,
  CheckoutStep,
  ShippingAddress,
  PaymentMethod,
  CheckoutApiResponse,
  OrderSummary
} from '../models/checkout.models';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private readonly STORAGE_KEY = 'checkout_data';
  private checkoutDataSubject = new BehaviorSubject<CheckoutData | null>(null);
  public checkoutData$ = this.checkoutDataSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCheckoutData();
  }

  private loadCheckoutData(): void {
    const savedData = sessionStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.checkoutDataSubject.next(data);
      } catch (error) {
        console.error('Error loading checkout data:', error);
        this.initializeCheckoutData();
      }
    } else {
      this.initializeCheckoutData();
    }
  }

  private initializeCheckoutData(): void {
    const initialData: CheckoutData = {
      currentStep: CheckoutStep.SHIPPING,
      completedSteps: [],
      orderSummary: {
        lineItems: [
          {
            id: '1',
            name: 'Premium Wireless Headphones',
            quantity: 1,
            price: 199.99,
            total: 199.99
          },
          {
            id: '2',
            name: 'USB-C Charging Cable',
            quantity: 2,
            price: 24.99,
            total: 49.98
          }
        ],
        subtotal: 249.97,
        tax: 20.00,
        shipping: 9.99,
        total: 279.96
      }
    };
    this.updateCheckoutData(initialData);
  }

  private saveToStorage(data: CheckoutData): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  private updateCheckoutData(data: CheckoutData): void {
    this.checkoutDataSubject.next(data);
    this.saveToStorage(data);
  }

  getCurrentCheckoutData(): CheckoutData | null {
    return this.checkoutDataSubject.value;
  }

  updateShippingAddress(address: ShippingAddress): void {
    const currentData = this.getCurrentCheckoutData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        shippingAddress: address
      };
      this.updateCheckoutData(updatedData);
    }
  }

  updatePaymentMethod(payment: PaymentMethod): void {
    const currentData = this.getCurrentCheckoutData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        paymentMethod: payment
      };
      this.updateCheckoutData(updatedData);
    }
  }

  setCurrentStep(step: CheckoutStep): void {
    const currentData = this.getCurrentCheckoutData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        currentStep: step
      };
      this.updateCheckoutData(updatedData);
    }
  }

  markStepCompleted(step: CheckoutStep): void {
    const currentData = this.getCurrentCheckoutData();
    if (currentData && !currentData.completedSteps.includes(step)) {
      const updatedData = {
        ...currentData,
        completedSteps: [...currentData.completedSteps, step]
      };
      this.updateCheckoutData(updatedData);
    }
  }

  isStepCompleted(step: CheckoutStep): boolean {
    const currentData = this.getCurrentCheckoutData();
    return currentData ? currentData.completedSteps.includes(step) : false;
  }

  isStepValid(step: CheckoutStep): boolean {
    const currentData = this.getCurrentCheckoutData();
    if (!currentData) return false;

    switch (step) {
      case CheckoutStep.SHIPPING:
        return !!(currentData.shippingAddress?.firstName &&
                  currentData.shippingAddress?.lastName &&
                  currentData.shippingAddress?.address &&
                  currentData.shippingAddress?.city &&
                  currentData.shippingAddress?.state &&
                  currentData.shippingAddress?.zipCode);
      case CheckoutStep.PAYMENT:
        return !!currentData.paymentMethod;
      case CheckoutStep.SUMMARY:
        return this.isStepValid(CheckoutStep.SHIPPING) && this.isStepValid(CheckoutStep.PAYMENT);
      default:
        return false;
    }
  }

  canNavigateToStep(targetStep: CheckoutStep): boolean {
    const currentData = this.getCurrentCheckoutData();
    if (!currentData) return false;

    const steps = [CheckoutStep.SHIPPING, CheckoutStep.PAYMENT, CheckoutStep.SUMMARY];
    const targetIndex = steps.indexOf(targetStep);

    if (targetIndex === 0) return true;

    // Check if all previous steps are completed
    for (let i = 0; i < targetIndex; i++) {
      if (!this.isStepCompleted(steps[i])) {
        return false;
      }
    }
    return true;
  }

  // Mock API calls - in real implementation these would call actual API endpoints
  validateShipping(address: ShippingAddress): Observable<CheckoutApiResponse> {
    // Simulate API call
    return of({ success: true, data: address }).pipe(
      delay(500),
      catchError(error => throwError(() => ({ success: false, message: 'Validation failed', errors: [] })))
    );
  }

  validatePayment(payment: PaymentMethod): Observable<CheckoutApiResponse> {
    // Simulate API call with basic validation
    if (payment.type === 'credit_card') {
      const cardValidation = this.validateCreditCard(payment);
      if (!cardValidation.isValid) {
        return of({
          success: false,
          message: 'Payment validation failed',
          errors: [{ field: 'cardNumber', message: cardValidation.message }]
        }).pipe(delay(500));
      }
    }

    return of({ success: true, data: payment }).pipe(
      delay(500),
      catchError(error => throwError(() => ({ success: false, message: 'Payment validation failed', errors: [] })))
    );
  }

  submitOrder(): Observable<CheckoutApiResponse> {
    const currentData = this.getCurrentCheckoutData();
    if (!currentData || !this.isStepValid(CheckoutStep.SUMMARY)) {
      return throwError(() => ({ success: false, message: 'Invalid checkout data', errors: [] }));
    }

    // Simulate order submission
    const orderId = 'ORDER-' + Date.now();
    return of({
      success: true,
      data: { orderId, total: currentData.orderSummary.total },
      message: 'Order submitted successfully'
    }).pipe(
      delay(1000),
      catchError(error => throwError(() => ({ success: false, message: 'Order submission failed', errors: [] })))
    );
  }

  private validateCreditCard(payment: { cardNumber: string }): { isValid: boolean; message: string } {
    const cardNumber = payment.cardNumber.replace(/\s+/g, '');
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      return { isValid: false, message: 'Invalid card number length' };
    }
    if (!/^\d+$/.test(cardNumber)) {
      return { isValid: false, message: 'Card number must contain only digits' };
    }
    return { isValid: true, message: '' };
  }

  clearCheckoutData(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.initializeCheckoutData();
  }

  // Tracking methods for analytics
  trackStepViewed(step: CheckoutStep): void {
    // In real implementation, this would send analytics events
    console.log('Analytics: checkout_step_viewed', { step });
  }

  trackValidationError(step: CheckoutStep, field: string, errorType: string): void {
    console.log('Analytics: checkout_validation_error', { step, field_name: field, error_type: errorType });
  }

  trackStepCompleted(step: CheckoutStep, completionTime: number, validationAttempts: number): void {
    console.log('Analytics: checkout_step_completed', { step, completion_time: completionTime, validation_attempts: validationAttempts });
  }

  trackPaymentMethodSelected(method: string, stepTime: number): void {
    console.log('Analytics: payment_method_selected', { method, step_time: stepTime });
  }

  trackOrderSubmitted(totalAmount: number, paymentMethod: string, completionTime: number): void {
    console.log('Analytics: checkout_order_submitted', { total_amount: totalAmount, payment_method: paymentMethod, completion_time: completionTime });
  }

  trackStepNavigation(fromStep: CheckoutStep, toStep: CheckoutStep, navigationType: string): void {
    console.log('Analytics: checkout_step_navigation', { from_step: fromStep, to_step: toStep, navigation_type: navigationType });
  }
}