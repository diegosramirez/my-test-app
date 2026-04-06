import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CheckoutService } from './checkout.service';
import {
  CheckoutData,
  ShippingAddress,
  CreditCardPayment,
  PayPalPayment,
  CheckoutApiResponse
} from '../models/checkout.models';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CheckoutService]
    });

    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Step Navigation', () => {
    it('should initialize with step 1', () => {
      expect(service.currentStep()).toBe(1);
    });

    it('should navigate to valid steps', () => {
      service.goToStep(2);
      expect(service.currentStep()).toBe(2);

      service.goToStep(3);
      expect(service.currentStep()).toBe(3);
    });

    it('should not navigate to invalid steps', () => {
      service.goToStep(0);
      expect(service.currentStep()).toBe(1);

      service.goToStep(4);
      expect(service.currentStep()).toBe(1);
    });

    it('should track step_entered event when navigating to step', () => {
      const trackSpy = vi.spyOn(console, 'log');

      service.goToStep(2);

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_step_entered',
        properties: {
          step_number: 2,
          step_name: 'payment',
          data_restored: false
        }
      });
    });

    it('should go to next step when current step is valid and can proceed', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);
      service.nextStep();

      expect(service.currentStep()).toBe(2);
    });

    it('should not go to next step when current step is invalid', () => {
      service.nextStep();
      expect(service.currentStep()).toBe(1);
    });

    it('should go to previous step', () => {
      service.goToStep(2);
      service.previousStep();
      expect(service.currentStep()).toBe(1);
    });

    it('should not go to previous step from step 1', () => {
      service.previousStep();
      expect(service.currentStep()).toBe(1);
    });

    it('should track step_completed event when completing step', () => {
      const trackSpy = vi.spyOn(console, 'log');
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);
      service.nextStep();

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', expect.objectContaining({
        eventName: 'checkout_step_completed',
        properties: expect.objectContaining({
          step_number: 1,
          validation_errors: 0
        })
      }));
    });

    it('should handle browser navigation and track event', () => {
      const trackSpy = vi.spyOn(console, 'log');

      service.handleBrowserNavigation('back');

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_browser_navigation',
        properties: {
          direction: 'back',
          current_step: 1
        }
      });
    });
  });

  describe('Data Management and Persistence', () => {
    it('should initialize with empty checkout data when no stored data', () => {
      const data = service.checkoutData();
      expect(data.shipping).toBeNull();
      expect(data.payment).toBeNull();
      expect(data.order).not.toBeNull(); // Order is initialized with mock data
    });

    it('should update and persist shipping data', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);

      expect(service.checkoutData().shipping).toEqual(mockShipping);

      // Check localStorage persistence
      const storedData = JSON.parse(localStorage.getItem('checkout-data') || '{}');
      expect(storedData.shipping).toEqual(mockShipping);
    });

    it('should track data_saved event when updating shipping', () => {
      const trackSpy = vi.spyOn(console, 'log');
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_data_saved',
        properties: {
          step_number: 1,
          fields_saved: Object.keys(mockShipping)
        }
      });
    });

    it('should update and persist payment data', () => {
      const mockPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updatePayment(mockPayment);

      expect(service.checkoutData().payment).toEqual(mockPayment);

      // Check localStorage persistence
      const storedData = JSON.parse(localStorage.getItem('checkout-data') || '{}');
      expect(storedData.payment).toEqual(mockPayment);
    });

    it('should track payment_method_selected and data_saved events when updating payment', () => {
      const trackSpy = vi.spyOn(console, 'log');
      const mockPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updatePayment(mockPayment);

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'payment_method_selected',
        properties: {
          method_type: 'credit-card'
        }
      });

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_data_saved',
        properties: {
          step_number: 2,
          fields_saved: ['payment_method']
        }
      });
    });

    it('should restore data from localStorage on initialization', () => {
      const mockData: CheckoutData = {
        shipping: {
          firstName: 'Jane',
          lastName: 'Smith',
          address: '456 Oak St',
          city: 'Somewhere',
          state: 'NY',
          zipCode: '67890'
        },
        payment: {
          type: 'paypal',
          email: 'jane@example.com'
        },
        order: null
      };

      localStorage.setItem('checkout-data', JSON.stringify(mockData));

      // Create new service instance to test restoration
      const newService = TestBed.inject(CheckoutService);

      expect(newService.checkoutData().shipping).toEqual(mockData.shipping);
      expect(newService.checkoutData().payment).toEqual(mockData.payment);
    });

    it('should track data_restored flag when navigating with stored data', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      localStorage.setItem('checkout-data', JSON.stringify({ shipping: mockShipping, payment: null, order: null }));

      const newService = TestBed.inject(CheckoutService);
      const trackSpy = vi.spyOn(console, 'log');

      newService.goToStep(2);

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_step_entered',
        properties: {
          step_number: 2,
          step_name: 'payment',
          data_restored: true
        }
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('checkout-data', 'invalid json');

      const newService = TestBed.inject(CheckoutService);
      const data = newService.checkoutData();

      expect(data.shipping).toBeNull();
      expect(data.payment).toBeNull();
    });

    it('should clear stored data after successful order submission', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);
      expect(localStorage.getItem('checkout-data')).not.toBeNull();

      service.submitOrder().subscribe();

      const req = httpMock.expectOne('/api/checkout/submit');
      req.flush({ success: true, orderId: '12345' });

      expect(localStorage.getItem('checkout-data')).toBeNull();
    });
  });

  describe('Form Validation', () => {
    it('should validate shipping address correctly', () => {
      const validShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(validShipping);
      const steps = service.steps();
      const shippingStep = steps.find(s => s.name === 'shipping');

      expect(shippingStep?.valid).toBe(true);
      expect(shippingStep?.completed).toBe(true);
    });

    it('should invalidate incomplete shipping address', () => {
      const incompleteShipping = {
        firstName: 'John',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      } as ShippingAddress;

      service.updateShipping(incompleteShipping);
      const steps = service.steps();
      const shippingStep = steps.find(s => s.name === 'shipping');

      expect(shippingStep?.valid).toBe(false);
      expect(shippingStep?.completed).toBe(false);
    });

    it('should validate credit card payment correctly', () => {
      const validPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updatePayment(validPayment);
      const steps = service.steps();
      const paymentStep = steps.find(s => s.name === 'payment');

      expect(paymentStep?.valid).toBe(true);
      expect(paymentStep?.completed).toBe(true);
    });

    it('should validate PayPal payment correctly', () => {
      const validPayment: PayPalPayment = {
        type: 'paypal',
        email: 'user@example.com'
      };

      service.updatePayment(validPayment);
      const steps = service.steps();
      const paymentStep = steps.find(s => s.name === 'payment');

      expect(paymentStep?.valid).toBe(true);
      expect(paymentStep?.completed).toBe(true);
    });

    it('should invalidate incomplete payment data', () => {
      const incompletePayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: ''
      };

      service.updatePayment(incompletePayment);
      const steps = service.steps();
      const paymentStep = steps.find(s => s.name === 'payment');

      expect(paymentStep?.valid).toBe(false);
      expect(paymentStep?.completed).toBe(false);
    });

    it('should validate order completeness for review step', () => {
      const validShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      const validPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updateShipping(validShipping);
      service.updatePayment(validPayment);

      const steps = service.steps();
      const reviewStep = steps.find(s => s.name === 'review');

      expect(reviewStep?.valid).toBe(true);
    });

    it('should report canProceed correctly based on current step validity', () => {
      // Initially should not be able to proceed
      expect(service.canProceed()).toBe(false);

      // After adding shipping, should be able to proceed from step 1
      const validShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(validShipping);
      expect(service.canProceed()).toBe(true);

      // Move to step 2, should not be able to proceed without payment
      service.goToStep(2);
      expect(service.canProceed()).toBe(false);

      // Add payment, should be able to proceed
      const validPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updatePayment(validPayment);
      expect(service.canProceed()).toBe(true);
    });
  });

  describe('Address Validation API', () => {
    it('should validate address via API', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.validateAddress(mockShipping).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne('/api/checkout/validate-address');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockShipping);
      req.flush({ valid: true });
    });

    it('should handle address validation API failure gracefully', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.validateAddress(mockShipping).subscribe(result => {
        expect(result).toBe(true); // Fallback to valid on API failure
      });

      const req = httpMock.expectOne('/api/checkout/validate-address');
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('Order Submission and Error Handling', () => {
    it('should submit order successfully', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      const mockPayment: CreditCardPayment = {
        type: 'credit-card',
        cardNumber: '1234 5678 9012 3456',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      };

      service.updateShipping(mockShipping);
      service.updatePayment(mockPayment);

      expect(service.isLoading()).toBe(false);

      service.submitOrder().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.orderId).toBe('12345');
        expect(service.isLoading()).toBe(false);
      });

      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne('/api/checkout/submit');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.shipping).toEqual(mockShipping);
      expect(req.request.body.payment).toEqual(mockPayment);

      req.flush({ success: true, orderId: '12345' });
    });

    it('should track checkout_completed event on successful submission', () => {
      const trackSpy = vi.spyOn(console, 'log');

      service.submitOrder().subscribe();

      const req = httpMock.expectOne('/api/checkout/submit');
      req.flush({ success: true, orderId: '12345' });

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', expect.objectContaining({
        eventName: 'checkout_completed',
        properties: expect.objectContaining({
          steps_completed: expect.any(Number),
          retry_count: 0
        })
      }));
    });

    it('should handle order submission failure and set error message', () => {
      service.submitOrder().subscribe({
        error: (error) => {
          expect(service.error()).toBe('Order submission failed. Please try again.');
          expect(service.isLoading()).toBe(false);
        }
      });

      const req = httpMock.expectOne('/api/checkout/submit');
      req.error(new ProgressEvent('Network error'));
    });

    it('should track checkout_error_recovery event on submission failure', () => {
      const trackSpy = vi.spyOn(console, 'log');

      service.submitOrder().subscribe({
        error: () => {}
      });

      const req = httpMock.expectOne('/api/checkout/submit');
      req.error(new ProgressEvent('Network error'));

      expect(trackSpy).toHaveBeenCalledWith('Tracking event:', {
        eventName: 'checkout_error_recovery',
        properties: {
          error_type: 'api_failure',
          recovery_method: 'retry_button'
        }
      });
    });

    it('should prevent duplicate submissions during loading', () => {
      service.submitOrder().subscribe();

      // Try to submit again while first request is pending
      service.submitOrder().subscribe();

      // Should only have one request
      const req = httpMock.expectOne('/api/checkout/submit');
      req.flush({ success: true, orderId: '12345' });
    });

    it('should handle API response with errors', () => {
      service.submitOrder().subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.errors).toBeDefined();
        expect(service.isLoading()).toBe(false);
      });

      const req = httpMock.expectOne('/api/checkout/submit');
      req.flush({
        success: false,
        errors: [{ field: 'cardNumber', message: 'Invalid card number' }]
      });
    });
  });

  describe('Order Data Initialization', () => {
    it('should initialize with mock order data', () => {
      const data = service.checkoutData();

      expect(data.order).not.toBeNull();
      expect(data.order?.items).toHaveLength(2);
      expect(data.order?.total).toBe(128.76);
      expect(data.order?.subtotal).toBe(109.97);
      expect(data.order?.shipping).toBe(9.99);
      expect(data.order?.tax).toBe(8.80);
    });

    it('should not reinitialize order data if it already exists', () => {
      const existingOrder = {
        items: [{ id: '1', name: 'Custom Product', price: 50, quantity: 1 }],
        subtotal: 50,
        shipping: 5,
        tax: 4,
        total: 59
      };

      localStorage.setItem('checkout-data', JSON.stringify({
        shipping: null,
        payment: null,
        order: existingOrder
      }));

      // Create fresh TestBed configuration to ensure new service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [CheckoutService]
      });

      const newService = TestBed.inject(CheckoutService);
      const data = newService.checkoutData();

      expect(data.order).toEqual(existingOrder);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle localStorage being unavailable', () => {
      // Mock localStorage to throw an error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const warnSpy = vi.spyOn(console, 'warn');

      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      // Should not throw an error
      expect(() => service.updateShipping(mockShipping)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Failed to save checkout data to localStorage:', expect.any(Error));

      setItemSpy.mockRestore();
    });

    it('should handle empty step arrays gracefully', () => {
      const currentStepData = service.currentStepData();
      expect(currentStepData).toBeDefined();
      expect(currentStepData?.id).toBe(1);
    });

    it('should handle invalid payment type', () => {
      const invalidPayment = {
        type: 'invalid-type'
      } as any;

      service.updatePayment(invalidPayment);
      const steps = service.steps();
      const paymentStep = steps.find(s => s.name === 'payment');

      expect(paymentStep?.valid).toBe(false);
    });

    it('should maintain step state consistency during rapid navigation', () => {
      const mockShipping: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      };

      service.updateShipping(mockShipping);

      // Rapid navigation
      service.goToStep(2);
      service.goToStep(3);
      service.goToStep(1);

      expect(service.currentStep()).toBe(1);
      expect(service.checkoutData().shipping).toEqual(mockShipping);
    });
  });
});