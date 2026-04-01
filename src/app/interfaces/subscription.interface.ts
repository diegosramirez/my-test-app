// Core subscription data models with runtime type guards
export interface SubscriptionData {
  email: string;
  normalizedEmail: string;
  timestamp: number;
  validationStatus: 'valid' | 'pending' | 'invalid';
  metadata: StorageMetadata;
}

export interface StorageMetadata {
  storageMethod: 'localStorage' | 'sessionStorage' | 'memory';
  createdAt: number;
  validationHistory: ValidationAttempt[];
  browserInfo?: {
    userAgent: string;
    storageAvailable: boolean;
  };
}

export interface ValidationAttempt {
  timestamp: number;
  result: ValidationResult;
  validationType: 'format' | 'domain' | 'duplicate';
}

export interface NormalizedEmail {
  original: string;
  normalized: string;
  domain: string;
  localPart: string;
  isGmail: boolean;
  variants: string[];
}

// Discriminated union for validation results
export type ValidationResult =
  | { success: true; normalizedEmail: NormalizedEmail }
  | { success: false; error: ValidationError };

// Discriminated union for error types
export type SubscriptionError = ValidationError | StorageError | BusinessLogicError;

export interface ValidationError {
  type: 'validation';
  code: 'FORMAT_INVALID' | 'DOMAIN_INVALID' | 'DUPLICATE_DETECTED' | 'EMPTY_EMAIL';
  message: string;
  technicalDetails: string;
  field?: string;
}

export interface StorageError {
  type: 'storage';
  code: 'STORAGE_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'STORAGE_CORRUPTED' | 'PERMISSION_DENIED';
  message: string;
  technicalDetails: string;
  fallbackUsed: boolean;
}

export interface BusinessLogicError {
  type: 'business';
  code: 'SUBSCRIPTION_LIMIT_REACHED' | 'INVALID_OPERATION' | 'SYSTEM_ERROR';
  message: string;
  technicalDetails: string;
}

// Discriminated union for subscription operation results
export type SubscriptionResult =
  | { success: true; data: SubscriptionData; message: string }
  | { success: false; error: SubscriptionError };

// Runtime type guards for localStorage data validation
export function isSubscriptionData(obj: any): obj is SubscriptionData {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.email === 'string' &&
    typeof obj.normalizedEmail === 'string' &&
    typeof obj.timestamp === 'number' &&
    ['valid', 'pending', 'invalid'].includes(obj.validationStatus) &&
    isStorageMetadata(obj.metadata);
}

export function isStorageMetadata(obj: any): obj is StorageMetadata {
  return obj &&
    typeof obj === 'object' &&
    ['localStorage', 'sessionStorage', 'memory'].includes(obj.storageMethod) &&
    typeof obj.createdAt === 'number' &&
    Array.isArray(obj.validationHistory);
}

export function isValidationError(obj: any): obj is ValidationError {
  return obj &&
    obj.type === 'validation' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.technicalDetails === 'string';
}

export function isStorageError(obj: any): obj is StorageError {
  return obj &&
    obj.type === 'storage' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.technicalDetails === 'string' &&
    typeof obj.fallbackUsed === 'boolean';
}

// Email validation configuration
export interface EmailValidationConfig {
  debounceMs: number;
  enableRealTimeValidation: boolean;
  enableDomainChecking: boolean;
  enableDuplicateDetection: boolean;
  maxValidationHistory: number;
}

export const DEFAULT_VALIDATION_CONFIG: EmailValidationConfig = {
  debounceMs: 300,
  enableRealTimeValidation: true,
  enableDomainChecking: true,
  enableDuplicateDetection: true,
  maxValidationHistory: 10
};

// Accessibility-related interfaces
export interface AccessibilityAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  type: 'error' | 'success' | 'info' | 'warning';
}

export interface ValidationState {
  isValidating: boolean;
  hasError: boolean;
  errorMessage?: string;
  successMessage?: string;
  announcement?: AccessibilityAnnouncement;
}