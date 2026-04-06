import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { CheckoutData, OrderSummary, ShippingAddress, PaymentData } from '../../models/checkout.models';

@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="review-step">
      <h2 class="step-title">Order Review</h2>
      <p class="step-description">Please review your order details before completing your purchase.</p>

      <div *ngIf="checkoutData" class="review-sections">
        <!-- Shipping Information -->
        <div class="review-section">
          <div class="section-header">
            <h3 class="section-title">Shipping Address</h3>
            <button
              type="button"
              class="edit-button"
              (click)="editSection('shipping')"
              aria-label="Edit shipping address"
            >
              Edit
            </button>
          </div>
          <div *ngIf="checkoutData.shipping" class="section-content">
            <div class="address-info">
              <p class="recipient">{{ checkoutData.shipping.firstName }} {{ checkoutData.shipping.lastName }}</p>
              <p class="address-line">{{ checkoutData.shipping.address }}</p>
              <p class="city-state-zip">
                {{ checkoutData.shipping.city }}, {{ checkoutData.shipping.state }} {{ checkoutData.shipping.zipCode }}
              </p>
            </div>
          </div>
          <div *ngIf="!checkoutData.shipping" class="section-missing">
            <p>Shipping address not provided</p>
          </div>
        </div>

        <!-- Payment Information -->
        <div class="review-section">
          <div class="section-header">
            <h3 class="section-title">Payment Method</h3>
            <button
              type="button"
              class="edit-button"
              (click)="editSection('payment')"
              aria-label="Edit payment method"
            >
              Edit
            </button>
          </div>
          <div *ngIf="checkoutData.payment" class="section-content">
            <div *ngIf="checkoutData.payment.type === 'credit-card'" class="payment-info">
              <div class="payment-method">
                <span class="method-icon">💳</span>
                <div class="method-details">
                  <p class="method-name">Credit Card</p>
                  <p class="card-details">
                    **** **** **** {{ getLastFourDigits(checkoutData.payment.cardNumber) }}
                  </p>
                  <p class="cardholder">{{ checkoutData.payment.cardholderName }}</p>
                </div>
              </div>
            </div>
            <div *ngIf="checkoutData.payment.type === 'paypal'" class="payment-info">
              <div class="payment-method">
                <span class="method-icon">🅿️</span>
                <div class="method-details">
                  <p class="method-name">PayPal</p>
                  <p class="paypal-email">{{ checkoutData.payment.email }}</p>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="!checkoutData.payment" class="section-missing">
            <p>Payment method not selected</p>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="review-section order-summary-section">
          <div class="section-header">
            <h3 class="section-title">Order Summary</h3>
          </div>
          <div *ngIf="checkoutData.order" class="section-content">
            <!-- Items -->
            <div class="order-items">
              <div
                *ngFor="let item of checkoutData.order.items; trackBy: trackByItemId"
                class="order-item"
              >
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-quantity">Qty: {{ item.quantity }}</span>
                </div>
                <span class="item-price">\${{ formatPrice(item.price * item.quantity) }}</span>
              </div>
            </div>

            <!-- Pricing Breakdown -->
            <div class="pricing-breakdown">
              <div class="pricing-row">
                <span class="pricing-label">Subtotal</span>
                <span class="pricing-value">\${{ formatPrice(checkoutData.order.subtotal) }}</span>
              </div>
              <div class="pricing-row">
                <span class="pricing-label">Shipping</span>
                <span class="pricing-value">\${{ formatPrice(checkoutData.order.shipping) }}</span>
              </div>
              <div class="pricing-row">
                <span class="pricing-label">Tax</span>
                <span class="pricing-value">\${{ formatPrice(checkoutData.order.tax) }}</span>
              </div>
              <div class="pricing-row total-row">
                <span class="pricing-label">Total</span>
                <span class="pricing-value">\${{ formatPrice(checkoutData.order.total) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Confirmation -->
        <div class="review-section confirmation-section">
          <div class="section-header">
            <h3 class="section-title">Confirmation</h3>
          </div>
          <div class="section-content">
            <div class="confirmation-actions">
              <button
                type="button"
                class="place-order-button"
                [disabled]="!canPlaceOrder() || isProcessing"
                (click)="onPlaceOrder()"
                [attr.aria-describedby]="!canPlaceOrder() ? 'order-requirements' : null"
              >
                <span *ngIf="!isProcessing">Place Order - \${{ formatPrice(checkoutData?.order?.total ?? 0) }}</span>
                <span *ngIf="isProcessing" class="processing-text">
                  <span class="spinner" aria-hidden="true"></span>
                  Processing Order...
                </span>
              </button>

              <div *ngIf="!canPlaceOrder()" id="order-requirements" class="requirements-message" role="alert">
                Please complete all required sections to place your order.
              </div>

              <div *ngIf="orderError" class="error-message" role="alert">
                {{ orderError }}
                <button type="button" class="retry-button" (click)="onRetryOrder()">
                  Try Again
                </button>
              </div>

              <div *ngIf="orderSuccess" class="success-message" role="alert">
                🎉 Order placed successfully! Order #{{ orderId }}
              </div>
            </div>

            <div class="terms-notice">
              <p>By placing your order, you agree to our
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .review-step {
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
      margin-bottom: 2rem;
      font-size: 1rem;
    }

    .review-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .review-section {
      border: 1px solid #dee2e6;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #212529;
      margin: 0;
    }

    .edit-button {
      background: none;
      border: none;
      color: #007bff;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
    }

    .edit-button:hover {
      background-color: rgba(0, 123, 255, 0.1);
      text-decoration: underline;
    }

    .edit-button:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    .section-content {
      padding: 1.5rem;
    }

    .section-missing {
      padding: 1.5rem;
      color: #dc3545;
      font-style: italic;
    }

    /* Shipping Address */
    .address-info {
      line-height: 1.5;
    }

    .recipient {
      font-weight: 600;
      color: #212529;
      margin-bottom: 0.5rem;
    }

    .address-line,
    .city-state-zip {
      color: #495057;
      margin-bottom: 0.25rem;
    }

    /* Payment Method */
    .payment-method {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .method-icon {
      font-size: 1.5rem;
    }

    .method-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .method-name {
      font-weight: 600;
      color: #212529;
    }

    .card-details,
    .cardholder,
    .paypal-email {
      color: #495057;
      font-size: 0.875rem;
    }

    /* Order Summary */
    .order-summary-section {
      background-color: #f8f9fa;
    }

    .order-items {
      margin-bottom: 1.5rem;
    }

    .order-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #dee2e6;
    }

    .order-item:last-child {
      border-bottom: none;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item-name {
      font-weight: 500;
      color: #212529;
    }

    .item-quantity {
      font-size: 0.875rem;
      color: #6c757d;
    }

    .item-price {
      font-weight: 500;
      color: #212529;
    }

    .pricing-breakdown {
      border-top: 1px solid #dee2e6;
      padding-top: 1rem;
    }

    .pricing-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }

    .pricing-row.total-row {
      font-weight: 600;
      font-size: 1.125rem;
      color: #212529;
      border-top: 2px solid #dee2e6;
      padding-top: 1rem;
      margin-top: 0.5rem;
    }

    .pricing-label {
      color: #495057;
    }

    .pricing-value {
      color: #212529;
    }

    /* Confirmation */
    .confirmation-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .place-order-button {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .place-order-button:hover:not(:disabled) {
      background-color: #218838;
    }

    .place-order-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .place-order-button:focus {
      outline: 2px solid #28a745;
      outline-offset: 2px;
    }

    .processing-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .requirements-message {
      padding: 0.75rem;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 0.25rem;
      color: #856404;
      font-size: 0.875rem;
    }

    .error-message {
      padding: 0.75rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 0.25rem;
      color: #721c24;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .retry-button {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.25rem;
      cursor: pointer;
      margin-left: 0.5rem;
    }

    .retry-button:hover {
      background-color: #c82333;
    }

    .success-message {
      padding: 0.75rem;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 0.25rem;
      color: #155724;
      font-size: 0.875rem;
    }

    .terms-notice {
      font-size: 0.875rem;
      color: #6c757d;
      text-align: center;
      line-height: 1.5;
    }

    .terms-notice a {
      color: #007bff;
      text-decoration: none;
    }

    .terms-notice a:hover {
      text-decoration: underline;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .review-step {
        padding: 1rem;
      }

      .section-header {
        padding: 0.75rem 1rem;
      }

      .section-content {
        padding: 1rem;
      }

      .order-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .place-order-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      }
    }
  `]
})
export class ReviewStepComponent implements OnInit {
  @Output() editStep = new EventEmitter<number>();

  private checkoutService = inject(CheckoutService);

  checkoutData: CheckoutData | null = null;
  isProcessing = false;
  orderError: string | null = null;
  orderSuccess = false;
  orderId: string | null = null;

  ngOnInit(): void {
    this.checkoutData = this.checkoutService.checkoutData();
  }

  editSection(section: 'shipping' | 'payment'): void {
    const stepNumber = section === 'shipping' ? 1 : 2;
    this.editStep.emit(stepNumber);
  }

  canPlaceOrder(): boolean {
    return !!(this.checkoutData?.shipping && this.checkoutData?.payment);
  }

  onPlaceOrder(): void {
    if (!this.canPlaceOrder() || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.orderError = null;
    this.orderSuccess = false;

    this.checkoutService.submitOrder().subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.orderSuccess = true;
          this.orderId = response.orderId || 'N/A';
        } else {
          this.orderError = 'Order submission failed. Please check your information and try again.';
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.orderError = 'Network error occurred. Please check your connection and try again.';
      }
    });
  }

  onRetryOrder(): void {
    this.orderError = null;
    this.onPlaceOrder();
  }

  getLastFourDigits(cardNumber: string): string {
    return cardNumber.replace(/\s/g, '').slice(-4);
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  trackByItemId(index: number, item: any): string {
    return item.id;
  }
}