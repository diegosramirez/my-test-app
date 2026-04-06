export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export type PaymentMethod = 'credit-card' | 'paypal';

export interface CreditCardPayment {
  type: 'credit-card';
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export interface PayPalPayment {
  type: 'paypal';
  email: string;
}

export type PaymentData = CreditCardPayment | PayPalPayment;

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderSummary {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface CheckoutData {
  shipping: ShippingAddress | null;
  payment: PaymentData | null;
  order: OrderSummary | null;
}

export interface CheckoutStep {
  id: number;
  name: string;
  label: string;
  completed: boolean;
  valid: boolean;
}

export interface CheckoutTrackingEvent {
  eventName: string;
  properties: Record<string, any>;
}

export interface CheckoutValidationError {
  field: string;
  message: string;
}

export interface CheckoutApiResponse {
  success: boolean;
  orderId?: string;
  errors?: CheckoutValidationError[];
}