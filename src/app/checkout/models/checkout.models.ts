export enum CheckoutStep {
  SHIPPING = 'shipping',
  PAYMENT = 'payment',
  SUMMARY = 'summary'
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

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

export type PaymentMethod = CreditCardPayment | PayPalPayment;

export interface OrderLineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderSummary {
  lineItems: OrderLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface CheckoutData {
  shippingAddress?: ShippingAddress;
  paymentMethod?: PaymentMethod;
  orderSummary: OrderSummary;
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
}

export interface ValidationState {
  [key: string]: {
    isValid: boolean;
    errors: string[];
  };
}

export interface CheckoutStepValidation {
  [CheckoutStep.SHIPPING]: ValidationState;
  [CheckoutStep.PAYMENT]: ValidationState;
  [CheckoutStep.SUMMARY]: ValidationState;
}

export interface CheckoutApiResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: {
    field: string;
    message: string;
  }[];
  message?: string;
}