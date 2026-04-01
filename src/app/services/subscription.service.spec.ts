import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { SubscriptionService } from './subscription.service';
import { StorageService } from './storage.service';
import { EmailValidatorService } from './email-validator.service';
import {
  SubscriptionData,
  ValidationState,
  EmailValidationConfig,
  SubscriptionError,
  ValidationError,
  StorageError,
  BusinessLogicError
} from '../interfaces/subscription.interface';

describe('SubscriptionService - Comprehensive Test Suite', () => {
  let service: SubscriptionService;
  let storageService: jasmine.SpyObj<StorageService>;
  let emailValidatorService: jasmine.SpyObj<EmailValidatorService>;

  beforeEach(() => {
    const storageSpyObj = jasmine.createSpyObj('StorageService', [
      'store',
      'retrieve',
      'remove',
      'clear',
      'getKeys',
      'isAvailable',
      'getStorageMethod',
      'getStorageInfo',
      'cleanup',
      'createStorageError'
    ]);

    const emailValidatorSpyObj = jasmine.createSpyObj('EmailValidatorService', [
      'validateEmail',
      'normalizeEmail',
      'areEmailsEquivalent',
      'isValidFormat',
      'hasValidDomainFormat',
      'isCommonProvider',
      'getSuggestedDomain'
    ]);

    TestBed.configureTestingModule({
      providers: [
        SubscriptionService,
        { provide: StorageService, useValue: storageSpyObj },
        { provide: EmailValidatorService, useValue: emailValidatorSpyObj }
      ]
    });

    service = TestBed.inject(SubscriptionService);
    storageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
    emailValidatorService = TestBed.inject(EmailValidatorService) as jasmine.SpyObj<EmailValidatorService>;

    // Default mock returns
    storageService.getStorageMethod.and.returnValue('localStorage');
    storageService.isAvailable.and.returnValue(true);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateEmail', () => {
    it('should validate email format successfully', async () => {
      const testEmail = 'test@example.com';
      const mockNormalizedEmail = {
        original: testEmail,
        normalized: testEmail.toLowerCase(),
        domain: 'example.com',
        localPart: 'test',
        isGmail: false,
        variants: []
      };

      emailValidatorService.validateEmail.and.returnValue(Promise.resolve({
        success: true,
        normalizedEmail: mockNormalizedEmail
      }));

      storageService.retrieve.and.returnValue(Promise.resolve([]));

      const result = await service.validateEmail(testEmail);

      expect(result.success).toBe(true);
      expect(emailValidatorService.validateEmail).toHaveBeenCalledWith(testEmail);
    });

    it('should return error for invalid email format', async () => {
      const testEmail = 'invalid-email';
      const mockError = {
        type: 'validation' as const,
        code: 'FORMAT_INVALID' as const,
        message: 'Please enter a valid email address.',
        technicalDetails: 'Email does not match basic format requirements'
      };

      emailValidatorService.validateEmail.and.returnValue(Promise.resolve({
        success: false,
        error: mockError
      }));

      const result = await service.validateEmail(testEmail);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORMAT_INVALID');
      }
    });

    it('should detect duplicate emails', async () => {
      const testEmail = 'test@example.com';
      const mockNormalizedEmail = {
        original: testEmail,
        normalized: testEmail.toLowerCase(),
        domain: 'example.com',
        localPart: 'test',
        isGmail: false,
        variants: []
      };

      emailValidatorService.validateEmail.and.returnValue(Promise.resolve({
        success: true,
        normalizedEmail: mockNormalizedEmail
      }));

      emailValidatorService.normalizeEmail.and.returnValue(mockNormalizedEmail);

      // Mock existing subscriptions
      const existingSubscriptions = [{
        email: testEmail,
        normalizedEmail: testEmail.toLowerCase(),
        timestamp: Date.now(),
        validationStatus: 'valid' as const,
        metadata: {
          storageMethod: 'localStorage' as const,
          createdAt: Date.now(),
          validationHistory: []
        }
      }];

      storageService.retrieve.and.returnValue(Promise.resolve(['test@example.com']));
      service.getSubscriptions = jasmine.createSpy().and.returnValue(Promise.resolve(existingSubscriptions));

      const result = await service.validateEmail(testEmail);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DUPLICATE_DETECTED');
      }
    });
  });

  describe('subscribe', () => {
    it('should successfully subscribe with valid email', async () => {
      const testEmail = 'test@example.com';
      const mockNormalizedEmail = {
        original: testEmail,
        normalized: testEmail.toLowerCase(),
        domain: 'example.com',
        localPart: 'test',
        isGmail: false,
        variants: []
      };

      // Mock validation success
      emailValidatorService.validateEmail.and.returnValue(Promise.resolve({
        success: true,
        normalizedEmail: mockNormalizedEmail
      }));

      emailValidatorService.normalizeEmail.and.returnValue(mockNormalizedEmail);
      storageService.retrieve.and.returnValue(Promise.resolve([]));
      storageService.store.and.returnValue(Promise.resolve(true));
      storageService.getStorageMethod.and.returnValue('localStorage');

      const result = await service.subscribe(testEmail);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(testEmail);
        expect(result.data.normalizedEmail).toBe(testEmail.toLowerCase());
      }
    });

    it('should fail subscription with invalid email', async () => {
      const testEmail = 'invalid-email';
      const mockError = {
        type: 'validation' as const,
        code: 'FORMAT_INVALID' as const,
        message: 'Please enter a valid email address.',
        technicalDetails: 'Email does not match basic format requirements'
      };

      emailValidatorService.validateEmail.and.returnValue(Promise.resolve({
        success: false,
        error: mockError
      }));

      const result = await service.subscribe(testEmail);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORMAT_INVALID');
      }
    });
  });

  describe('validateFormatSync', () => {
    it('should return valid for properly formatted email', () => {
      emailValidatorService.isValidFormat.and.returnValue(true);

      const result = service.validateFormatSync('test@example.com');

      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty email', () => {
      const result = service.validateFormatSync('');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should return invalid for malformed email', () => {
      emailValidatorService.isValidFormat.and.returnValue(false);

      const result = service.validateFormatSync('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Please enter a valid email address');
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      service.getSubscriptions = jasmine.createSpy().and.returnValue(Promise.resolve([]));
      storageService.getStorageMethod.and.returnValue('localStorage');
      storageService.isAvailable.and.returnValue(true);
      storageService.getStorageInfo.and.returnValue(Promise.resolve({
        method: 'localStorage',
        available: true,
        persistent: true
      }));

      const info = await service.getStorageInfo();

      expect(info.storageMethod).toBe('localStorage');
      expect(info.totalSubscriptions).toBe(0);
      expect(info.storageAvailable).toBe(true);
    });
  });
});