export interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export type PaymentMethod = 'credit_card' | 'paypal';

export interface CreditCardPayment {
  type: 'credit_card';
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export interface PayPalPayment {
  type: 'paypal';
  email: string;
}

export type PaymentData = CreditCardPayment | PayPalPayment;

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface OrderSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface CheckoutData {
  shipping: Partial<ShippingAddress>;
  payment: Partial<PaymentData>;
  orderSummary: OrderSummary;
}

export type CheckoutStep = 1 | 2 | 3;

export interface CheckoutState {
  currentStep: CheckoutStep;
  data: CheckoutData;
  isStepValid: {
    [key in CheckoutStep]: boolean;
  };
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Analytics events
export interface CheckoutEvent {
  eventName: string;
  step?: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  properties?: Record<string, any>;
}