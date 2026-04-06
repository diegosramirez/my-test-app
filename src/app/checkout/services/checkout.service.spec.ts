import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CheckoutService } from './checkout.service';
import {
  CheckoutStep,
  CheckoutData,
  ShippingAddress,
  PaymentMethod,
  CreditCardPayment,
  PayPalPayment
} from '../models/checkout.models';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;
  let mockSessionStorage: { [key: string]: string };

  const mockShippingAddress: ShippingAddress = {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US'
  };

  const mockCreditCardPayment: CreditCardPayment = {
    type: 'credit_card',
    cardNumber: '4111 1111 1111 1111',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
    cardholderName: 'John Doe'
  };

  const mockPayPalPayment: PayPalPayment = {
    type: 'paypal',
    email: 'john.doe@example.com'
  };

  beforeEach(() => {
    // Mock sessionStorage
    mockSessionStorage = {};
    vi.spyOn(sessionStorage, 'getItem').mockImplementation((key: string) => {
      return mockSessionStorage[key] || null;
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation((key: string, value: string) => {
      mockSessionStorage[key] = value;
    });
    vi.spyOn(sessionStorage, 'removeItem').mockImplementation((key: string) => {
      delete mockSessionStorage[key];
    });

    // Mock console methods for analytics tracking
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CheckoutService]
    });

    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default checkout data when no saved data exists', () => {
      const checkoutData = service.getCurrentCheckoutData();

      expect(checkoutData).toBeTruthy();
      expect(checkoutData?.currentStep).toBe(CheckoutStep.SHIPPING);
      expect(checkoutData?.completedSteps).toEqual([]);
      expect(checkoutData?.orderSummary).toBeTruthy();
      expect(checkoutData?.orderSummary.total).toBe(279.96);
    });

    it('should load existing checkout data from sessionStorage on initialization', () => {
      const savedData: CheckoutData = {
        currentStep: CheckoutStep.PAYMENT,
        completedSteps: [CheckoutStep.SHIPPING],
        shippingAddress: mockShippingAddress,
        orderSummary: {
          lineItems: [],
          subtotal: 100,
          tax: 10,
          shipping: 5,
          total: 115
        }
      };

      mockSessionStorage['checkout_data'] = JSON.stringify(savedData);

      // Create new service instance to test loading
      const newService = TestBed.inject(CheckoutService);
      const loadedData = newService.getCurrentCheckoutData();

      expect(loadedData?.currentStep).toBe(CheckoutStep.PAYMENT);
      expect(loadedData?.completedSteps).toContain(CheckoutStep.SHIPPING);
      expect(loadedData?.shippingAddress).toEqual(mockShippingAddress);
    });

    it('should handle corrupted sessionStorage data gracefully', () => {
      mockSessionStorage['checkout_data'] = 'invalid-json';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const newService = TestBed.inject(CheckoutService);
      const checkoutData = newService.getCurrentCheckoutData();

      expect(checkoutData).toBeTruthy();
      expect(checkoutData?.currentStep).toBe(CheckoutStep.SHIPPING);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    it('should save checkout data to sessionStorage when updated', () => {
      service.updateShippingAddress(mockShippingAddress);

      const savedData = JSON.parse(mockSessionStorage['checkout_data']);
      expect(savedData.shippingAddress).toEqual(mockShippingAddress);
    });

    it('should emit updated data when checkout data changes', async () => {
      const dataPromise = new Promise<any>(resolve => {
        service.checkoutData$.subscribe(data => {
          if (data?.shippingAddress) {
            resolve(data);
          }
        });
      });

      service.updateShippingAddress(mockShippingAddress);
      const data = await dataPromise;
      expect(data.shippingAddress).toEqual(mockShippingAddress);
    });

    it('should update payment method and persist data', () => {
      service.updatePaymentMethod(mockCreditCardPayment);

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.paymentMethod).toEqual(mockCreditCardPayment);

      const savedData = JSON.parse(mockSessionStorage['checkout_data']);
      expect(savedData.paymentMethod).toEqual(mockCreditCardPayment);
    });

    it('should clear checkout data and reinitialize', () => {
      service.updateShippingAddress(mockShippingAddress);
      service.clearCheckoutData();

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.shippingAddress).toBeUndefined();
      expect(checkoutData?.currentStep).toBe(CheckoutStep.SHIPPING);
      expect(mockSessionStorage['checkout_data']).toBeUndefined();
    });
  });

  describe('Step Management', () => {
    it('should set current step and persist', () => {
      service.setCurrentStep(CheckoutStep.PAYMENT);

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.currentStep).toBe(CheckoutStep.PAYMENT);
    });

    it('should mark step as completed', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.completedSteps).toContain(CheckoutStep.SHIPPING);
    });

    it('should not duplicate completed steps', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);
      service.markStepCompleted(CheckoutStep.SHIPPING);

      const checkoutData = service.getCurrentCheckoutData();
      const shippingSteps = checkoutData?.completedSteps.filter(step => step === CheckoutStep.SHIPPING);
      expect(shippingSteps?.length).toBe(1);
    });

    it('should check if step is completed', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);

      expect(service.isStepCompleted(CheckoutStep.SHIPPING)).toBe(true);
      expect(service.isStepCompleted(CheckoutStep.PAYMENT)).toBe(false);
    });
  });

  describe('Step Validation', () => {
    it('should validate shipping step with complete address', () => {
      service.updateShippingAddress(mockShippingAddress);

      expect(service.isStepValid(CheckoutStep.SHIPPING)).toBe(true);
    });

    it('should invalidate shipping step with incomplete address', () => {
      const incompleteAddress = { ...mockShippingAddress, firstName: '' };
      service.updateShippingAddress(incompleteAddress as ShippingAddress);

      expect(service.isStepValid(CheckoutStep.SHIPPING)).toBe(false);
    });

    it('should validate payment step with payment method', () => {
      service.updatePaymentMethod(mockCreditCardPayment);

      expect(service.isStepValid(CheckoutStep.PAYMENT)).toBe(true);
    });

    it('should invalidate payment step without payment method', () => {
      expect(service.isStepValid(CheckoutStep.PAYMENT)).toBe(false);
    });

    it('should validate summary step when shipping and payment are valid', () => {
      service.updateShippingAddress(mockShippingAddress);
      service.updatePaymentMethod(mockCreditCardPayment);

      expect(service.isStepValid(CheckoutStep.SUMMARY)).toBe(true);
    });

    it('should invalidate summary step when dependencies are invalid', () => {
      service.updateShippingAddress(mockShippingAddress);
      // No payment method

      expect(service.isStepValid(CheckoutStep.SUMMARY)).toBe(false);
    });

    it('should return false for validation when no checkout data exists', () => {
      service.clearCheckoutData();
      vi.spyOn(service, 'getCurrentCheckoutData').mockReturnValue(null);

      expect(service.isStepValid(CheckoutStep.SHIPPING)).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    it('should allow navigation to shipping step always', () => {
      expect(service.canNavigateToStep(CheckoutStep.SHIPPING)).toBe(true);
    });

    it('should allow navigation to payment step when shipping is completed', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);

      expect(service.canNavigateToStep(CheckoutStep.PAYMENT)).toBe(true);
    });

    it('should deny navigation to payment step when shipping is not completed', () => {
      expect(service.canNavigateToStep(CheckoutStep.PAYMENT)).toBe(false);
    });

    it('should allow navigation to summary step when shipping and payment are completed', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);
      service.markStepCompleted(CheckoutStep.PAYMENT);

      expect(service.canNavigateToStep(CheckoutStep.SUMMARY)).toBe(true);
    });

    it('should deny navigation to summary step when prerequisites are not met', () => {
      service.markStepCompleted(CheckoutStep.SHIPPING);
      // Payment step not completed

      expect(service.canNavigateToStep(CheckoutStep.SUMMARY)).toBe(false);
    });

    it('should return false for navigation when no checkout data exists', () => {
      vi.spyOn(service, 'getCurrentCheckoutData').mockReturnValue(null);

      expect(service.canNavigateToStep(CheckoutStep.PAYMENT)).toBe(false);
    });
  });

  describe('API Methods', () => {
    it('should validate shipping address successfully', async () => {
      const response = await firstValueFrom(service.validateShipping(mockShippingAddress));
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockShippingAddress);
    });

    it('should validate credit card payment successfully', async () => {
      const response = await firstValueFrom(service.validatePayment(mockCreditCardPayment));
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCreditCardPayment);
    });

    it('should validate PayPal payment successfully', (done) => {
      service.validatePayment(mockPayPalPayment).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockPayPalPayment);
        done();
      });
    });

    it('should reject invalid credit card numbers', (done) => {
      const invalidCard: CreditCardPayment = {
        ...mockCreditCardPayment,
        cardNumber: '123' // Too short
      };

      service.validatePayment(invalidCard).subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Payment validation failed');
        expect(response.errors).toBeDefined();
        done();
      });
    });

    it('should submit order successfully when data is valid', (done) => {
      service.updateShippingAddress(mockShippingAddress);
      service.updatePaymentMethod(mockCreditCardPayment);

      service.submitOrder().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data?.orderId).toContain('ORDER-');
        expect(response.data?.total).toBe(279.96);
        expect(response.message).toBe('Order submitted successfully');
        done();
      });
    });

    it('should reject order submission with invalid data', (done) => {
      // No shipping address or payment method

      service.submitOrder().subscribe({
        error: (error) => {
          expect(error.success).toBe(false);
          expect(error.message).toBe('Invalid checkout data');
          done();
        }
      });
    });

    it('should handle API errors gracefully', (done) => {
      // Mock a network error by overriding the observable
      const originalValidateShipping = service.validateShipping.bind(service);
      vi.spyOn(service, 'validateShipping').mockImplementation(() => {
        throw new Error('Network error');
      });

      try {
        service.validateShipping(mockShippingAddress);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        done();
      }
    });
  });

  describe('Credit Card Validation', () => {
    it('should validate credit card with valid number', () => {
      const validCard = { cardNumber: '1234567890123456' };
      const validation = (service as any).validateCreditCard(validCard);

      expect(validation.isValid).toBe(true);
    });

    it('should reject credit card with short number', () => {
      const invalidCard = { cardNumber: '123456' };
      const validation = (service as any).validateCreditCard(invalidCard);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('Invalid card number length');
    });

    it('should reject credit card with long number', () => {
      const invalidCard = { cardNumber: '12345678901234567890' };
      const validation = (service as any).validateCreditCard(invalidCard);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('Invalid card number length');
    });

    it('should reject credit card with non-numeric characters', () => {
      const invalidCard = { cardNumber: '1234abcd5678efgh' };
      const validation = (service as any).validateCreditCard(invalidCard);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('Card number must contain only digits');
    });

    it('should handle credit card with spaces', () => {
      const cardWithSpaces = { cardNumber: '1234 5678 9012 3456' };
      const validation = (service as any).validateCreditCard(cardWithSpaces);

      expect(validation.isValid).toBe(true);
    });
  });

  describe('Analytics Tracking', () => {
    it('should track step viewed', () => {
      service.trackStepViewed(CheckoutStep.SHIPPING);

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: checkout_step_viewed',
        { step: CheckoutStep.SHIPPING }
      );
    });

    it('should track validation error', () => {
      service.trackValidationError(CheckoutStep.SHIPPING, 'firstName', 'required');

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: checkout_validation_error',
        {
          step: CheckoutStep.SHIPPING,
          field_name: 'firstName',
          error_type: 'required'
        }
      );
    });

    it('should track step completed', () => {
      service.trackStepCompleted(CheckoutStep.SHIPPING, 30000, 2);

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: checkout_step_completed',
        {
          step: CheckoutStep.SHIPPING,
          completion_time: 30000,
          validation_attempts: 2
        }
      );
    });

    it('should track payment method selected', () => {
      service.trackPaymentMethodSelected('credit_card', 15000);

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: payment_method_selected',
        {
          method: 'credit_card',
          step_time: 15000
        }
      );
    });

    it('should track order submitted', () => {
      service.trackOrderSubmitted(279.96, 'credit_card', 120000);

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: checkout_order_submitted',
        {
          total_amount: 279.96,
          payment_method: 'credit_card',
          completion_time: 120000
        }
      );
    });

    it('should track step navigation', () => {
      service.trackStepNavigation(CheckoutStep.SHIPPING, CheckoutStep.PAYMENT, 'next');

      expect(console.log).toHaveBeenCalledWith(
        'Analytics: checkout_step_navigation',
        {
          from_step: CheckoutStep.SHIPPING,
          to_step: CheckoutStep.PAYMENT,
          navigation_type: 'next'
        }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null checkout data in getCurrentCheckoutData', () => {
      service.clearCheckoutData();
      vi.spyOn(service, 'getCurrentCheckoutData').mockReturnValue(null);

      expect(() => service.updateShippingAddress(mockShippingAddress)).not.toThrow();
      expect(() => service.updatePaymentMethod(mockCreditCardPayment)).not.toThrow();
      expect(() => service.setCurrentStep(CheckoutStep.PAYMENT)).not.toThrow();
      expect(() => service.markStepCompleted(CheckoutStep.SHIPPING)).not.toThrow();
    });

    it('should handle missing required fields in shipping address', () => {
      const partialAddress = {
        firstName: 'John',
        lastName: 'Doe'
        // Missing other required fields
      } as ShippingAddress;

      service.updateShippingAddress(partialAddress);
      expect(service.isStepValid(CheckoutStep.SHIPPING)).toBe(false);
    });

    it('should handle unknown step in validation', () => {
      expect(service.isStepValid('unknown' as CheckoutStep)).toBe(false);
    });

    it('should handle PayPal payment type correctly', () => {
      service.updatePaymentMethod(mockPayPalPayment);
      expect(service.isStepValid(CheckoutStep.PAYMENT)).toBe(true);

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.paymentMethod?.type).toBe('paypal');
    });

    it('should handle step completion edge cases', () => {
      // Test with null data
      vi.spyOn(service, 'getCurrentCheckoutData').mockReturnValue(null);

      expect(service.isStepCompleted(CheckoutStep.SHIPPING)).toBe(false);
      expect(() => service.markStepCompleted(CheckoutStep.SHIPPING)).not.toThrow();
    });

    it('should handle sessionStorage quota exceeded error', () => {
      const largeMockData = {
        ...service.getCurrentCheckoutData(),
        largeData: 'x'.repeat(10000000) // Very large string
      };

      vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => {
        (service as any).saveToStorage(largeMockData);
      }).not.toThrow();
    });
  });

  describe('Reactive Behavior', () => {
    it('should emit checkout data changes to subscribers', (done) => {
      let emissionCount = 0;

      service.checkoutData$.subscribe(data => {
        emissionCount++;
        if (emissionCount === 2) { // Initial + our update
          expect(data?.currentStep).toBe(CheckoutStep.PAYMENT);
          done();
        }
      });

      service.setCurrentStep(CheckoutStep.PAYMENT);
    });

    it('should maintain data consistency across multiple operations', () => {
      service.updateShippingAddress(mockShippingAddress);
      service.updatePaymentMethod(mockCreditCardPayment);
      service.setCurrentStep(CheckoutStep.SUMMARY);
      service.markStepCompleted(CheckoutStep.SHIPPING);
      service.markStepCompleted(CheckoutStep.PAYMENT);

      const checkoutData = service.getCurrentCheckoutData();
      expect(checkoutData?.shippingAddress).toEqual(mockShippingAddress);
      expect(checkoutData?.paymentMethod).toEqual(mockCreditCardPayment);
      expect(checkoutData?.currentStep).toBe(CheckoutStep.SUMMARY);
      expect(checkoutData?.completedSteps).toContain(CheckoutStep.SHIPPING);
      expect(checkoutData?.completedSteps).toContain(CheckoutStep.PAYMENT);
    });
  });
});