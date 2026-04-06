import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutData, ShippingAddress, PaymentMethod, CreditCardPayment, PayPalPayment } from '../../models/checkout.models';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.css']
})
export class OrderSummaryComponent implements OnInit {
  @Input() checkoutData: CheckoutData | null = null;
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Output() orderCompleted = new EventEmitter<void>();
  @Output() backClicked = new EventEmitter<void>();
  @Output() editShipping = new EventEmitter<void>();
  @Output() editPayment = new EventEmitter<void>();
  @Output() errorCleared = new EventEmitter<void>();
  @ViewChild('formTitle', { static: false }) formTitleRef!: ElementRef<HTMLElement>;

  termsAccepted = false;

  ngOnInit(): void {
    // Focus management for accessibility
    setTimeout(() => {
      const titleElement = document.querySelector('.form-title');
      if (titleElement) {
        (titleElement as HTMLElement).focus();
      }
    }, 100);
  }

  trackByItemId(index: number, item: any): string {
    return item.id;
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  getLastFourDigits(cardNumber: string): string {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.slice(-4);
  }

  getMaskedEmail(email: string): string {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;

    const maskedUsername = username.length > 2
      ? username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1)
      : username;

    return `${maskedUsername}@${domain}`;
  }

  getCountryName(countryCode: string): string {
    const countries: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'Canada',
      'MX': 'Mexico'
    };
    return countries[countryCode] || countryCode;
  }

  getCreditCardPayment(paymentMethod: PaymentMethod | undefined | null): CreditCardPayment | null {
    if (paymentMethod && paymentMethod.type === 'credit_card') {
      return paymentMethod as CreditCardPayment;
    }
    return null;
  }

  getPayPalPayment(paymentMethod: PaymentMethod | undefined | null): PayPalPayment | null {
    if (paymentMethod && paymentMethod.type === 'paypal') {
      return paymentMethod as PayPalPayment;
    }
    return null;
  }

  onTermsChange(): void {
    // Announce change for screen readers
    if (this.termsAccepted) {
      this.announceToScreenReader('Terms and conditions accepted');
    }
  }

  onEditShipping(): void {
    this.announceToScreenReader('Navigating to edit shipping information');
    this.editShipping.emit();
  }

  onEditPayment(): void {
    this.announceToScreenReader('Navigating to edit payment method');
    this.editPayment.emit();
  }

  onBack(): void {
    this.announceToScreenReader('Navigating back to payment method');
    this.backClicked.emit();
  }

  onCompleteOrder(): void {
    if (this.termsAccepted && !this.isSubmitting) {
      this.announceToScreenReader('Submitting order');
      this.orderCompleted.emit();
    }
  }

  clearError(): void {
    this.errorCleared.emit();
  }

  private announceToScreenReader(message: string): void {
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
}