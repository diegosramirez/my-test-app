import { TestBed } from '@angular/core/testing';
import { FormWizardService } from './form-wizard.service';
import { WizardStep } from '../models/wizard-form-data.interface';

describe('FormWizardService', () => {
  let service: FormWizardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormWizardService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default form data', () => {
    service.formData$.subscribe(data => {
      expect(data.personalInfo.name).toBe('');
      expect(data.personalInfo.email).toBe('');
      expect(data.personalInfo.phone).toBe('');
      expect(data.addressInfo.street).toBe('');
      expect(data.currentStep).toBe(WizardStep.PERSONAL);
      expect(data.completedSteps).toEqual([]);
    });
  });

  it('should save personal info step data', () => {
    const personalData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    };

    service.saveStepData(WizardStep.PERSONAL, personalData);

    service.formData$.subscribe(data => {
      expect(data.personalInfo).toEqual(personalData);
    });
  });

  it('should save address info step data', () => {
    const addressData = {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    };

    service.saveStepData(WizardStep.ADDRESS, addressData);

    service.formData$.subscribe(data => {
      expect(data.addressInfo).toEqual(addressData);
    });
  });

  it('should validate personal info step correctly', () => {
    // Invalid - empty data
    expect(service.isStepValid(WizardStep.PERSONAL)).toBeFalsy();

    // Save valid personal data
    service.saveStepData(WizardStep.PERSONAL, {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    });

    expect(service.isStepValid(WizardStep.PERSONAL)).toBeTruthy();
  });

  it('should validate address info step correctly', () => {
    // Invalid - empty data
    expect(service.isStepValid(WizardStep.ADDRESS)).toBeFalsy();

    // Save valid address data
    service.saveStepData(WizardStep.ADDRESS, {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    });

    expect(service.isStepValid(WizardStep.ADDRESS)).toBeTruthy();
  });

  it('should control step access correctly', () => {
    // Personal step should always be accessible
    expect(service.canAccessStep(WizardStep.PERSONAL)).toBeTruthy();

    // Address step should not be accessible without valid personal data
    expect(service.canAccessStep(WizardStep.ADDRESS)).toBeFalsy();

    // Save valid personal data
    service.saveStepData(WizardStep.PERSONAL, {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    });

    // Now address step should be accessible
    expect(service.canAccessStep(WizardStep.ADDRESS)).toBeTruthy();

    // Review step should not be accessible without valid address data
    expect(service.canAccessStep(WizardStep.REVIEW)).toBeFalsy();

    // Save valid address data
    service.saveStepData(WizardStep.ADDRESS, {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    });

    // Now review step should be accessible
    expect(service.canAccessStep(WizardStep.REVIEW)).toBeTruthy();
  });

  it('should update current step', () => {
    service.setCurrentStep(WizardStep.ADDRESS);

    service.currentStep$.subscribe(step => {
      expect(step).toBe(WizardStep.ADDRESS);
    });

    service.formData$.subscribe(data => {
      expect(data.currentStep).toBe(WizardStep.ADDRESS);
    });
  });

  it('should clear form data', () => {
    // Save some data first
    service.saveStepData(WizardStep.PERSONAL, {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    });

    service.clearFormData();

    service.formData$.subscribe(data => {
      expect(data.personalInfo.name).toBe('');
      expect(data.personalInfo.email).toBe('');
      expect(data.personalInfo.phone).toBe('');
      expect(data.currentStep).toBe(WizardStep.PERSONAL);
      expect(data.completedSteps).toEqual([]);
    });
  });

  it('should persist data to localStorage', () => {
    const personalData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    };

    service.saveStepData(WizardStep.PERSONAL, personalData);

    const stored = localStorage.getItem('wizard-form-data');
    expect(stored).toBeTruthy();

    const parsedData = JSON.parse(stored!);
    expect(parsedData.personalInfo).toEqual(personalData);
  });

  it('should load data from localStorage on initialization', () => {
    const testData = {
      personalInfo: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '(555) 987-6543'
      },
      addressInfo: {
        street: '456 Oak Street',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210'
      },
      currentStep: WizardStep.ADDRESS,
      completedSteps: [WizardStep.PERSONAL],
      sessionId: 'test-session',
      timestamps: {
        started: new Date(),
        stepStarted: new Date(),
        lastUpdated: new Date()
      }
    };

    localStorage.setItem('wizard-form-data', JSON.stringify(testData));

    // Create new service instance to test loading
    const newService = new FormWizardService();

    newService.formData$.subscribe(data => {
      expect(data.personalInfo.name).toBe('Jane Doe');
      expect(data.currentStep).toBe(WizardStep.ADDRESS);
    });
  });
});