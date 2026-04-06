import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../services/checkout.service';
import { CheckoutData, CartItem } from '../../../models/checkout.models';

@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="review-step">
      <div class="step-header">
        <h2 class="step-title">Review Your Order</h2>
        <p class="step-description">Please review your order details before completing your purchase</p>
      </div>

      <div class="review-sections">
        <!-- Shipping Information -->
        <section class="review-section" aria-labelledby="shipping-heading">
          <div class="section-header">
            <h3 id="shipping-heading" class="section-title">Shipping Address</h3>
            <button
              type="button"
              class="edit-link"
              (click)="editShipping()"
              aria-label="Edit shipping address"
            >
              Edit
            </button>
          </div>
          <div class="section-content">
            @if (checkoutData().shipping.firstName) {
              <div class="address-display">
                <div class="address-name">
                  {{ checkoutData().shipping.firstName }} {{ checkoutData().shipping.lastName }}
                </div>
                <div class="address-line">{{ checkoutData().shipping.street }}</div>
                <div class="address-line">
                  {{ checkoutData().shipping.city }}, {{ checkoutData().shipping.state }} {{ checkoutData().shipping.zipCode }}
                </div>
                <div class="address-line">{{ getCountryName(checkoutData().shipping.country) }}</div>
                @if (checkoutData().shipping.phone) {
                  <div class="address-phone">{{ checkoutData().shipping.phone }}</div>
                }
              </div>
            } @else {
              <div class="empty-section">No shipping address provided</div>
            }
          </div>
        </section>

        <!-- Payment Information -->
        <section class="review-section" aria-labelledby="payment-heading">
          <div class="section-header">
            <h3 id="payment-heading" class="section-title">Payment Method</h3>
            <button
              type="button"
              class="edit-link"
              (click)="editPayment()"
              aria-label="Edit payment method"
            >
              Edit
            </button>
          </div>
          <div class="section-content">
            @if (checkoutData().payment.type === 'credit_card') {
              <div class="payment-display">
                <div class="payment-method">
                  <svg class="payment-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                  Credit Card
                </div>
                @if (getCreditCardInfo(); as cardInfo) {
                  <div class="payment-details">
                    <div>•••• •••• •••• {{ getLastFourDigits(cardInfo.cardNumber) }}</div>
                    <div>{{ cardInfo.cardholderName }}</div>
                    <div>Expires {{ cardInfo.expiryMonth }}/{{ cardInfo.expiryYear }}</div>
                  </div>
                }
              </div>
            } @else if (checkoutData().payment.type === 'paypal') {
              <div class="payment-display">
                <div class="payment-method">
                  <svg class="payment-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.854C5.026 2.366 5.474 2 6.005 2h7.072c2.535 0 4.28.911 5.184 2.709.846 1.681.61 3.642-.704 5.835-1.285 2.145-3.361 3.243-6.166 3.243h-1.758l-.927 3.93c-.061.26-.296.43-.573.43H7.076zm8.426-8.31c2.04 0 3.624-.69 4.709-2.051 1.032-1.295 1.185-2.717.453-4.226-.693-1.428-2.199-2.15-4.477-2.15H9.2L7.537 13.027h2.992c2.374 0 4.299-.69 5.723-2.051z"/>
                  </svg>
                  PayPal
                </div>
                @if (getPayPalInfo(); as paypalInfo) {
                  <div class="payment-details">
                    <div>{{ paypalInfo.email }}</div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-section">No payment method selected</div>
            }
          </div>
        </section>

        <!-- Order Summary -->
        <section class="review-section order-summary" aria-labelledby="order-heading">
          <div class="section-header">
            <h3 id="order-heading" class="section-title">Order Summary</h3>
          </div>
          <div class="section-content">
            <div class="order-items">
              @for (item of checkoutData().orderSummary.items; track item.id) {
                <div class="order-item">
                  @if (item.imageUrl) {
                    <img
                      [src]="item.imageUrl"
                      [alt]="item.name"
                      class="item-image"
                      loading="lazy"
                    />
                  } @else {
                    <div class="item-image-placeholder" [attr.aria-label]="'Image of ' + item.name"></div>
                  }
                  <div class="item-details">
                    <div class="item-name">{{ item.name }}</div>
                    <div class="item-quantity">Quantity: {{ item.quantity }}</div>
                  </div>
                  <div class="item-price">
                    {{ formatCurrency(item.price * item.quantity) }}
                  </div>
                </div>
              }
            </div>

            <div class="order-totals">
              <div class="total-line">
                <span class="total-label">Subtotal</span>
                <span class="total-value">{{ formatCurrency(checkoutData().orderSummary.subtotal) }}</span>
              </div>
              <div class="total-line">
                <span class="total-label">Tax</span>
                <span class="total-value">{{ formatCurrency(checkoutData().orderSummary.tax) }}</span>
              </div>
              <div class="total-line">
                <span class="total-label">Shipping</span>
                <span class="total-value">
                  @if (checkoutData().orderSummary.shipping === 0) {
                    <span class="free-shipping">Free</span>
                  } @else {
                    {{ formatCurrency(checkoutData().orderSummary.shipping) }}
                  }
                </span>
              </div>
              <div class="total-line total-line--final">
                <span class="total-label">Total</span>
                <span class="total-value">{{ formatCurrency(checkoutData().orderSummary.total) }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Order Actions -->
      <div class="order-actions">
        <button
          type="button"
          class="btn btn-secondary"
          (click)="goBack()"
        >
          Back to Payment
        </button>
        <button
          type="button"
          class="btn btn-primary btn-place-order"
          [disabled]="isSubmitting() || !canPlaceOrder()"
          (click)="placeOrder()"
          [attr.aria-describedby]="!canPlaceOrder() ? 'order-status' : null"
        >
          @if (isSubmitting()) {
            <span class="loading-spinner" aria-hidden="true"></span>
            @if (orderProgress() === 'processing') {
              Processing Payment...
            } @else if (orderProgress() === 'confirming') {
              Confirming Order...
            } @else {
              Placing Order...
            }
          } @else {
            <svg class="order-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Complete Purchase
          }
        </button>
      </div>

      @if (!canPlaceOrder()) {
        <div id="order-status" class="order-status" role="alert">
          Please complete all previous steps before placing your order.
        </div>
      }

      @if (orderError()) {
        <div class="order-error" role="alert">
          {{ orderError() }}
        </div>
      }

      <!-- Order Success Modal -->
      @if (orderSuccess()) {
        <div class="modal-overlay" role="dialog" aria-labelledby="success-title" aria-modal="true">
          <div class="modal-content">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h3 id="success-title" class="success-title">Order Confirmed!</h3>
            <p class="success-message">
              Thank you for your purchase. Your order #{{ orderId() }} has been successfully placed.
            </p>
            <div class="success-details">
              <p>You will receive a confirmation email shortly.</p>
              <p>Estimated delivery: 3-5 business days</p>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              (click)="closeSuccessModal()"
              autofocus
            >
              Continue Shopping
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './review-step.component.css'
})
export class ReviewStepComponent implements OnInit {
  constructor(private checkoutService: CheckoutService) {}

  isSubmitting = signal(false);
  orderProgress = signal<'processing' | 'confirming' | 'complete' | null>(null);
  orderSuccess = signal(false);
  orderId = signal('');
  orderError = signal<string | null>(null);

  checkoutData = computed(() => this.checkoutService.getCheckoutData());

  private countries = new Map([
    ['US', 'United States'],
    ['CA', 'Canada'],
    ['MX', 'Mexico']
  ]);


  ngOnInit(): void {
    // Mark step 3 as viewed
    this.checkoutService.state$.subscribe(state => {
      if (state.currentStep === 3) {
        // Step is already tracked in service
      }
    });
  }

  editShipping(): void {
    this.checkoutService.goToStep(1);
  }

  editPayment(): void {
    this.checkoutService.goToStep(2);
  }

  goBack(): void {
    this.checkoutService.goToStep(2);
  }

  canPlaceOrder(): boolean {
    return (
      this.checkoutService.isStepValid(1) &&
      this.checkoutService.isStepValid(2) &&
      !this.isSubmitting()
    );
  }

  async placeOrder(): Promise<void> {
    if (!this.canPlaceOrder()) return;

    this.isSubmitting.set(true);
    this.orderProgress.set('processing');
    this.orderError.set(null);

    try {
      // Simulate order processing steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.orderProgress.set('confirming');

      await new Promise(resolve => setTimeout(resolve, 1000));
      this.orderProgress.set('complete');

      const result = await this.checkoutService.submitOrder();

      if (result.success && result.orderId) {
        this.orderId.set(result.orderId);
        this.orderSuccess.set(true);
      } else {
        // Handle error with proper UI feedback
        console.error('Order failed:', result.error);
        this.orderError.set('Order failed: ' + result.error);
      }
    } catch (error) {
      console.error('Order error:', error);
      this.orderError.set('An error occurred while placing your order. Please try again.');
    } finally {
      this.isSubmitting.set(false);
      this.orderProgress.set(null);
    }
  }

  closeSuccessModal(): void {
    this.orderSuccess.set(false);
    // In a real app, navigate to home or order history
    window.location.href = '/';
  }

  getCountryName(countryCode: string | undefined): string {
    if (!countryCode) return '';
    return this.countries.get(countryCode) || countryCode;
  }

  getLastFourDigits(cardNumber: string | undefined): string {
    if (!cardNumber) return '****';
    return cardNumber.replace(/\s/g, '').slice(-4);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getCreditCardInfo() {
    const payment = this.checkoutData().payment;
    if (payment?.type === 'credit_card') {
      return {
        cardNumber: (payment as any).cardNumber || '',
        cardholderName: (payment as any).cardholderName || '',
        expiryMonth: (payment as any).expiryMonth || '',
        expiryYear: (payment as any).expiryYear || ''
      };
    }
    return null;
  }

  getPayPalInfo() {
    const payment = this.checkoutData().payment;
    if (payment?.type === 'paypal') {
      return {
        email: (payment as any).email || ''
      };
    }
    return null;
  }
}