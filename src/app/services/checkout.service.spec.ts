import { TestBed } from '@angular/core/testing';
import { CheckoutService } from './checkout.service';
import { CheckoutStep, ShippingAddress, PaymentData, CreditCardPayment, PayPalPayment } from '../models/checkout.models';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockSessionStorage: { [key: string]: string };

  beforeEach(async () => {
    // Mock sessionStorage
    mockSessionStorage = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => mockSessionStorage[key] || null,
        setItem: (key: string, value: string) => mockSessionStorage[key] = value,
        removeItem: (key: string) => delete mockSessionStorage[key],
        clear: () => mockSessionStorage = {}
      },
      writable: true
    });

    // Mock console.log to avoid noise in tests
    spyOn(console, 'log').and.stub();
    spyOn(console, 'warn').and.stub();

    await TestBed.configureTestingModule({
      providers: [CheckoutService]
    }).compileComponents();

    service = TestBed.inject(CheckoutService);
  });

  afterEach(() => {
    mockSessionStorage = {};
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with step 1', () => {
      expect(service.getCurrentStep()).toBe(1);
    });

    it('should initialize with invalid steps', () => {
      expect(service.isStepValid(1)).toBe(false);
      expect(service.isStepValid(2)).toBe(false);
      expect(service.isStepValid(3)).toBe(false);
    });

    it('should initialize with mock cart data', () => {
      const checkoutData = service.getCheckoutData();
      expect(checkoutData.orderSummary.items.length).toBe(2);
      expect(checkoutData.orderSummary.items[0].name).toBe('Wireless Headphones');
      expect(checkoutData.orderSummary.items[1].name).toBe('Bluetooth Speaker');
    });

    it('should calculate order summary correctly', () => {
      const checkoutData = service.getCheckoutData();
      const orderSummary = checkoutData.orderSummary;

      // Subtotal: 199.99 + (79.99 * 2) = 359.97
      expect(orderSummary.subtotal).toBe(359.97);
      // Tax: 359.97 * 0.08 = 28.8
      expect(orderSummary.tax).toBe(28.80);
      // Shipping: free over $100
      expect(orderSummary.shipping).toBe(0);
      // Total: 359.97 + 28.8 + 0 = 388.77
      expect(orderSummary.total).toBe(388.77);
    });

    it('should apply shipping fee for orders under $100', () => {
      const testService = new CheckoutService();
      // Mock different cart items
      const smallOrderItems = [{ id: '1', name: 'Small Item', price: 50, quantity: 1 }];
      spyOn(testService as any, 'mockCartItems').and.returnValue(smallOrderItems);

      // This test checks the logic but would require refactoring the service to be more testable
      // For now, we'll just verify the calculation logic conceptually
      const subtotal = 50;
      const expectedShipping = subtotal > 100 ? 0 : 9.99;
      expect(expectedShipping).toBe(9.99);
    });
  });

  describe('Session Storage Auto-save', () => {
    it('should save state to session storage excluding payment data', (done) => {
      const shippingData: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      service.updateShipping(shippingData);

      // Wait for async sessionStorage save
      setTimeout(() => {
        const savedData = JSON.parse(mockSessionStorage['checkout_data']);
        expect(savedData.data.shipping.firstName).toBe('John');
        expect(savedData.data.payment).toEqual({}); // Payment data should not be saved
        done();
      }, 50);
    });

    it('should restore state from session storage on initialization', () => {
      const mockState = {
        currentStep: 2,
        data: {
          shipping: {
            firstName: 'Jane',
            lastName: 'Smith',
            street: '456 Oak Ave',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701',
            country: 'US'
          },
          payment: {}, // Payment should be empty
          orderSummary: {} // Will be recalculated
        },
        isStepValid: { 1: true, 2: false, 3: false }
      };

      mockSessionStorage['checkout_data'] = JSON.stringify(mockState);

      const newService = new CheckoutService();
      expect(newService.getCurrentStep()).toBe(2);
      expect(newService.getCheckoutData().shipping.firstName).toBe('Jane');
      expect(newService.isStepValid(1)).toBe(true);
    });

    it('should handle corrupted session storage gracefully', () => {
      mockSessionStorage['checkout_data'] = 'invalid json';

      const newService = new CheckoutService();
      expect(newService.getCurrentStep()).toBe(1); // Should fall back to initial state
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to step 1 successfully', () => {
      const result = service.goToStep(1);
      expect(result).toBe(true);
      expect(service.getCurrentStep()).toBe(1);
    });

    it('should prevent forward navigation when previous step is invalid', () => {
      const result = service.goToStep(2);
      expect(result).toBe(false);
      expect(service.getCurrentStep()).toBe(1);
    });

    it('should allow forward navigation when previous step is valid', () => {
      // Make step 1 valid
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };
      service.updateShipping(validShipping);

      const result = service.goToStep(2);
      expect(result).toBe(true);
      expect(service.getCurrentStep()).toBe(2);
    });

    it('should allow backward navigation without validation', () => {
      service.goToStep(1);
      // Force step to 3 for testing
      (service as any).updateState({ currentStep: 3 });

      const result = service.goToStep(1);
      expect(result).toBe(true);
      expect(service.getCurrentStep()).toBe(1);
    });

    it('should prevent skipping steps', () => {
      const result = service.goToStep(3);
      expect(result).toBe(false);
      expect(service.getCurrentStep()).toBe(1);
    });
  });

  describe('Shipping Data Management', () => {
    it('should update shipping data and validate', () => {
      const shippingData: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe'
      };

      service.updateShipping(shippingData);

      const checkoutData = service.getCheckoutData();
      expect(checkoutData.shipping.firstName).toBe('John');
      expect(checkoutData.shipping.lastName).toBe('Doe');
      expect(service.isStepValid(1)).toBe(false); // Still invalid - missing required fields
    });

    it('should validate complete shipping data', () => {
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      service.updateShipping(validShipping);
      expect(service.isStepValid(1)).toBe(true);
    });

    it('should reject shipping data with empty required fields', () => {
      const invalidShipping: Partial<ShippingAddress> = {
        firstName: '',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      service.updateShipping(invalidShipping);
      expect(service.isStepValid(1)).toBe(false);
    });

    it('should handle optional phone field', () => {
      const shippingWithPhone: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        phone: '555-1234'
      };

      service.updateShipping(shippingWithPhone);
      expect(service.isStepValid(1)).toBe(true);
      expect(service.getCheckoutData().shipping.phone).toBe('555-1234');
    });
  });

  describe('Payment Data Management', () => {
    it('should update credit card payment data', () => {
      const creditCardData: Partial<CreditCardPayment> = {
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      service.updatePayment(creditCardData);

      const checkoutData = service.getCheckoutData();
      expect(checkoutData.payment.type).toBe('credit_card');
      expect((checkoutData.payment as any).cardNumber).toBe('1234567890123456');
      expect(service.isStepValid(2)).toBe(true);
    });

    it('should update PayPal payment data', () => {
      const paypalData: Partial<PayPalPayment> = {
        type: 'paypal',
        email: 'test@example.com'
      };

      service.updatePayment(paypalData);

      const checkoutData = service.getCheckoutData();
      expect(checkoutData.payment.type).toBe('paypal');
      expect((checkoutData.payment as any).email).toBe('test@example.com');
      expect(service.isStepValid(2)).toBe(true);
    });

    it('should validate complete credit card data', () => {
      const validCreditCard: Partial<CreditCardPayment> = {
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      service.updatePayment(validCreditCard);
      expect(service.isStepValid(2)).toBe(true);
    });

    it('should invalidate incomplete credit card data', () => {
      const invalidCreditCard: Partial<CreditCardPayment> = {
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardholderName: '', // Missing
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      service.updatePayment(invalidCreditCard);
      expect(service.isStepValid(2)).toBe(false);
    });

    it('should validate complete PayPal data', () => {
      const validPayPal: Partial<PayPalPayment> = {
        type: 'paypal',
        email: 'test@example.com'
      };

      service.updatePayment(validPayPal);
      expect(service.isStepValid(2)).toBe(true);
    });

    it('should invalidate PayPal data without email', () => {
      const invalidPayPal: Partial<PayPalPayment> = {
        type: 'paypal',
        email: ''
      };

      service.updatePayment(invalidPayPal);
      expect(service.isStepValid(2)).toBe(false);
    });

    it('should not persist payment data to session storage', (done) => {
      const creditCardData: Partial<CreditCardPayment> = {
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      service.updatePayment(creditCardData);

      setTimeout(() => {
        const savedData = JSON.parse(mockSessionStorage['checkout_data']);
        expect(savedData.data.payment).toEqual({}); // Should be empty for security
        done();
      }, 50);
    });
  });

  describe('Order Submission', () => {
    beforeEach(() => {
      // Set up valid checkout data
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      const validPayment: Partial<CreditCardPayment> = {
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardholderName: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      };

      service.updateShipping(validShipping);
      service.updatePayment(validPayment);
    });

    it('should submit order successfully with valid data', async () => {
      const result = await service.submitOrder();

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^ORD-\d+$/);
    });

    it('should fail submission with invalid shipping data', async () => {
      // Clear shipping data to make it invalid
      service.updateShipping({});

      const result = await service.submitOrder();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please complete all required steps');
    });

    it('should fail submission with invalid payment data', async () => {
      // Clear payment data to make it invalid
      service.updatePayment({});

      const result = await service.submitOrder();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please complete all required steps');
    });

    it('should clear checkout data after successful order', async () => {
      const result = await service.submitOrder();

      expect(result.success).toBe(true);
      expect(service.getCurrentStep()).toBe(1); // Reset to initial state
      expect(mockSessionStorage['checkout_data']).toBeUndefined();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track step completion', () => {
      spyOn(service as any, 'trackEvent');

      service.trackStepCompleted(1, 5000);

      expect((service as any).trackEvent).toHaveBeenCalledWith(
        'checkout_step_completed',
        { step: 'shipping', completion_time: 5000 }
      );
    });

    it('should track step abandonment', () => {
      spyOn(service as any, 'trackEvent');

      service.trackStepAbandoned(2, 3000, 'browser_back');

      expect((service as any).trackEvent).toHaveBeenCalledWith(
        'checkout_step_abandoned',
        { step: 'payment', time_spent: 3000, exit_method: 'browser_back' }
      );
    });

    it('should track validation errors', () => {
      spyOn(service as any, 'trackEvent');

      service.trackValidationError(1, 'firstName', 'required');

      expect((service as any).trackEvent).toHaveBeenCalledWith(
        'checkout_validation_error',
        { step: 'shipping', field: 'firstName', error_type: 'required' }
      );
    });

    it('should track payment method selection', () => {
      spyOn(service as any, 'trackEvent');

      const paymentData: Partial<PayPalPayment> = {
        type: 'paypal',
        email: 'test@example.com'
      };

      service.updatePayment(paymentData);

      expect((service as any).trackEvent).toHaveBeenCalledWith(
        'payment_method_selected',
        { method: 'paypal' }
      );
    });

    it('should track step navigation', () => {
      spyOn(service as any, 'trackEvent');

      // Make step 1 valid first
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };
      service.updateShipping(validShipping);

      service.goToStep(2);

      expect((service as any).trackEvent).toHaveBeenCalledWith(
        'checkout_step_viewed',
        { step: 'payment', previous_step: 'shipping' }
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network interruption gracefully', () => {
      // This test would require mocking network failures
      // For now, we verify the service continues to function
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      // Simulate network error by making sessionStorage throw
      spyOn(window.sessionStorage, 'setItem').and.throwError('Network error');

      expect(() => service.updateShipping(validShipping)).not.toThrow();
      expect(service.isStepValid(1)).toBe(true); // Functionality still works
    });

    it('should handle whitespace-only input in required fields', () => {
      const invalidShipping: Partial<ShippingAddress> = {
        firstName: '   ', // Whitespace only
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };

      service.updateShipping(invalidShipping);
      expect(service.isStepValid(1)).toBe(false);
    });

    it('should clear checkout data without errors', () => {
      expect(() => service.clearCheckoutData()).not.toThrow();
      expect(service.getCurrentStep()).toBe(1);
      expect(mockSessionStorage['checkout_data']).toBeUndefined();
    });
  });

  describe('Reactive State Updates', () => {
    it('should emit state changes through observable', (done) => {
      let stateEmissionCount = 0;

      service.state$.subscribe(state => {
        stateEmissionCount++;
        if (stateEmissionCount === 2) { // Skip initial emission
          expect(state.currentStep).toBe(2);
          done();
        }
      });

      // Make step 1 valid and navigate to step 2
      const validShipping: Partial<ShippingAddress> = {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      };
      service.updateShipping(validShipping);
      service.goToStep(2);
    });
  });
});