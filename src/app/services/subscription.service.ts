import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  SubscriptionData,
  SubscriptionResult,
  ValidationResult,
  ValidationError,
  StorageMetadata,
  ValidationAttempt,
  EmailValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
  ValidationState,
  AccessibilityAnnouncement,
  isSubscriptionData
} from '../interfaces/subscription.interface';
import { StorageService } from './storage.service';
import { EmailValidatorService } from './email-validator.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly SUBSCRIPTION_KEY_PREFIX = 'subscription_';
  private readonly EMAIL_LIST_KEY = 'email_subscriptions';

  private config: EmailValidationConfig = DEFAULT_VALIDATION_CONFIG;
  private validationStateSubject = new BehaviorSubject<ValidationState>({
    isValidating: false,
    hasError: false
  });

  public validationState$: Observable<ValidationState> = this.validationStateSubject.asObservable();

  constructor(
    private storageService: StorageService,
    private emailValidator: EmailValidatorService
  ) {}

  /**
   * Updates validation configuration
   */
  updateConfig(config: Partial<EmailValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current validation configuration
   */
  getConfig(): EmailValidationConfig {
    return { ...this.config };
  }

  /**
   * Validates email with comprehensive checks
   */
  async validateEmail(email: string): Promise<ValidationResult> {
    this.updateValidationState({ isValidating: true, hasError: false });

    try {
      const startTime = Date.now();

      // Primary validation using email validator service
      const validationResult = await this.emailValidator.validateEmail(email);

      if (!validationResult.success) {
        this.updateValidationState({
          isValidating: false,
          hasError: true,
          errorMessage: validationResult.error.message,
          announcement: {
            message: validationResult.error.message,
            priority: 'assertive',
            type: 'error'
          }
        });

        this.logValidationAttempt(email, validationResult, 'format');
        return validationResult;
      }

      // Check for duplicates if enabled
      if (this.config.enableDuplicateDetection) {
        const isDuplicate = await this.checkDuplicate(email);

        if (isDuplicate) {
          const error: ValidationError = {
            type: 'validation',
            code: 'DUPLICATE_DETECTED',
            message: 'This email address is already subscribed.',
            technicalDetails: `Duplicate detected for normalized email: ${validationResult.normalizedEmail.normalized}`,
            field: 'email'
          };

          const duplicateResult: ValidationResult = { success: false, error };

          this.updateValidationState({
            isValidating: false,
            hasError: true,
            errorMessage: error.message,
            announcement: {
              message: error.message,
              priority: 'polite',
              type: 'error'
            }
          });

          this.logValidationAttempt(email, duplicateResult, 'duplicate');
          return duplicateResult;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Email validation completed in ${duration}ms for ${validationResult.normalizedEmail.original}`);

      this.updateValidationState({
        isValidating: false,
        hasError: false,
        successMessage: 'Email address is valid.',
        announcement: {
          message: 'Email address is valid.',
          priority: 'polite',
          type: 'success'
        }
      });

      this.logValidationAttempt(email, validationResult, 'format');
      return validationResult;

    } catch (error) {
      console.error('Email validation failed:', error);

      const validationError: ValidationError = {
        type: 'validation',
        code: 'FORMAT_INVALID',
        message: 'Unable to validate email address. Please try again.',
        technicalDetails: `Validation error: ${error}`,
        field: 'email'
      };

      const errorResult: ValidationResult = { success: false, error: validationError };

      this.updateValidationState({
        isValidating: false,
        hasError: true,
        errorMessage: validationError.message,
        announcement: {
          message: 'Validation error occurred. Please try again.',
          priority: 'assertive',
          type: 'error'
        }
      });

      this.logValidationAttempt(email, errorResult, 'format');
      return errorResult;
    }
  }

  /**
   * Checks for duplicate email addresses with normalization
   */
  async checkDuplicate(email: string): Promise<boolean> {
    try {
      const normalizedEmail = this.emailValidator.normalizeEmail(email);
      const existingEmails = await this.getSubscriptions();

      // Check against normalized email
      const duplicateFound = existingEmails.some(subscription =>
        subscription.normalizedEmail === normalizedEmail.normalized
      );

      if (duplicateFound) {
        console.log(`Duplicate detected for ${email} (normalized: ${normalizedEmail.normalized})`);
        return true;
      }

      // Check against variants for comprehensive duplicate detection
      for (const subscription of existingEmails) {
        if (this.emailValidator.areEmailsEquivalent(email, subscription.email)) {
          console.log(`Equivalent email detected for ${email} matching ${subscription.email}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Duplicate check failed:', error);
      // On error, assume no duplicate to avoid blocking valid subscriptions
      return false;
    }
  }

  /**
   * Complete subscription flow with validation and storage
   */
  async subscribe(email: string): Promise<SubscriptionResult> {
    try {
      // Validate email first
      const validationResult = await this.validateEmail(email);

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Create subscription data
      const subscription = await this.createSubscriptionData(
        validationResult.normalizedEmail.original,
        validationResult.normalizedEmail.normalized
      );

      // Store the subscription
      const stored = await this.storeSubscription(subscription);

      if (!stored) {
        return {
          success: false,
          error: this.storageService.createStorageError(
            'STORAGE_UNAVAILABLE',
            'Unable to save subscription. Please try again.',
            'Failed to store subscription data',
            this.storageService.getStorageMethod() === 'memory'
          )
        };
      }

      // Update email list
      await this.updateEmailList(subscription.normalizedEmail);

      this.updateValidationState({
        isValidating: false,
        hasError: false,
        successMessage: `Successfully subscribed ${subscription.email}!`,
        announcement: {
          message: `Successfully subscribed with email ${subscription.email}`,
          priority: 'polite',
          type: 'success'
        }
      });

      console.log(`Successfully subscribed: ${subscription.email}`);

      return {
        success: true,
        data: subscription,
        message: `Successfully subscribed ${subscription.email}!`
      };

    } catch (error) {
      console.error('Subscription failed:', error);

      const businessError = {
        type: 'business' as const,
        code: 'SYSTEM_ERROR' as const,
        message: 'Subscription failed. Please try again later.',
        technicalDetails: `Subscription error: ${error}`
      };

      this.updateValidationState({
        isValidating: false,
        hasError: true,
        errorMessage: businessError.message,
        announcement: {
          message: 'Subscription failed. Please try again.',
          priority: 'assertive',
          type: 'error'
        }
      });

      return {
        success: false,
        error: businessError
      };
    }
  }

  /**
   * Retrieves all subscriptions with data validation
   */
  async getSubscriptions(): Promise<SubscriptionData[]> {
    try {
      const emailList = await this.storageService.retrieve<string[]>(this.EMAIL_LIST_KEY) || [];
      const subscriptions: SubscriptionData[] = [];

      for (const normalizedEmail of emailList) {
        const key = this.getSubscriptionKey(normalizedEmail);
        const data = await this.storageService.retrieve<SubscriptionData>(key);

        if (data && isSubscriptionData(data)) {
          subscriptions.push(data);
        } else if (data) {
          // Clean up corrupted data
          console.warn(`Removing corrupted subscription data for ${normalizedEmail}`);
          await this.storageService.remove(key);
        }
      }

      // Sort by timestamp (newest first)
      return subscriptions.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Failed to retrieve subscriptions:', error);
      return [];
    }
  }

  /**
   * Removes a subscription
   */
  async unsubscribe(email: string): Promise<boolean> {
    try {
      const normalizedEmail = this.emailValidator.normalizeEmail(email);
      const key = this.getSubscriptionKey(normalizedEmail.normalized);

      const removed = await this.storageService.remove(key);

      if (removed) {
        await this.removeFromEmailList(normalizedEmail.normalized);
        console.log(`Successfully unsubscribed: ${email}`);
      }

      return removed;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Gets storage information and statistics
   */
  async getStorageInfo(): Promise<{
    storageMethod: string;
    totalSubscriptions: number;
    storageAvailable: boolean;
    storageStats: any;
  }> {
    const subscriptions = await this.getSubscriptions();
    const storageStats = await this.storageService.getStorageInfo();

    return {
      storageMethod: this.storageService.getStorageMethod(),
      totalSubscriptions: subscriptions.length,
      storageAvailable: this.storageService.isAvailable(),
      storageStats
    };
  }

  /**
   * Performs cleanup operations
   */
  async cleanup(maxAgeMs?: number): Promise<{ removed: number; errors: number }> {
    return await this.storageService.cleanup(maxAgeMs);
  }

  /**
   * Creates subscription data with metadata
   */
  private async createSubscriptionData(email: string, normalizedEmail: string): Promise<SubscriptionData> {
    const now = Date.now();

    const metadata: StorageMetadata = {
      storageMethod: this.storageService.getStorageMethod(),
      createdAt: now,
      validationHistory: [],
      browserInfo: {
        userAgent: navigator.userAgent,
        storageAvailable: this.storageService.isAvailable()
      }
    };

    return {
      email,
      normalizedEmail,
      timestamp: now,
      validationStatus: 'valid',
      metadata
    };
  }

  /**
   * Stores subscription data
   */
  private async storeSubscription(subscription: SubscriptionData): Promise<boolean> {
    const key = this.getSubscriptionKey(subscription.normalizedEmail);
    return await this.storageService.store(key, subscription);
  }

  /**
   * Updates the email list for quick lookups
   */
  private async updateEmailList(normalizedEmail: string): Promise<void> {
    try {
      const emailList = await this.storageService.retrieve<string[]>(this.EMAIL_LIST_KEY) || [];

      if (!emailList.includes(normalizedEmail)) {
        emailList.push(normalizedEmail);
        await this.storageService.store(this.EMAIL_LIST_KEY, emailList);
      }
    } catch (error) {
      console.error('Failed to update email list:', error);
    }
  }

  /**
   * Removes email from the list
   */
  private async removeFromEmailList(normalizedEmail: string): Promise<void> {
    try {
      const emailList = await this.storageService.retrieve<string[]>(this.EMAIL_LIST_KEY) || [];
      const updatedList = emailList.filter(email => email !== normalizedEmail);
      await this.storageService.store(this.EMAIL_LIST_KEY, updatedList);
    } catch (error) {
      console.error('Failed to remove from email list:', error);
    }
  }

  /**
   * Generates storage key for subscription
   */
  private getSubscriptionKey(normalizedEmail: string): string {
    return `${this.SUBSCRIPTION_KEY_PREFIX}${normalizedEmail}`;
  }

  /**
   * Updates validation state and notifies observers
   */
  private updateValidationState(update: Partial<ValidationState>): void {
    const current = this.validationStateSubject.value;
    const newState = { ...current, ...update };
    this.validationStateSubject.next(newState);
  }

  /**
   * Logs validation attempts for analysis
   */
  private async logValidationAttempt(
    email: string,
    result: ValidationResult,
    validationType: 'format' | 'domain' | 'duplicate'
  ): Promise<void> {
    try {
      const attempt: ValidationAttempt = {
        timestamp: Date.now(),
        result,
        validationType
      };

      // Store in browser console for debugging
      console.log(`Validation attempt logged:`, {
        email: email.substring(0, 3) + '***', // Partial email for privacy
        success: result.success,
        type: validationType,
        timestamp: attempt.timestamp
      });

      // Could be extended to send to analytics service
    } catch (error) {
      console.error('Failed to log validation attempt:', error);
    }
  }

  /**
   * Creates debounced validation observable for real-time validation
   */
  createDebouncedValidation(emailInput$: Observable<string>): Observable<string> {
    return emailInput$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged(),
      // Note: Returns debounced email string. For async validation, use validateEmail() method separately
    );
  }

  /**
   * Validates email format synchronously for immediate feedback
   */
  validateFormatSync(email: string): { isValid: boolean; message?: string } {
    if (!email || email.trim().length === 0) {
      return { isValid: false, message: 'Email is required' };
    }

    if (!this.emailValidator.isValidFormat(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    return { isValid: true };
  }
}