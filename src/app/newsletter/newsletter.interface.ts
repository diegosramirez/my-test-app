export interface NewsletterSubscription {
  email: string;
  timestamp: string;
  status: 'active' | 'pending' | 'unsubscribed';
  id: string;
}

export interface NewsletterValidationError {
  type: 'required' | 'email' | 'duplicate' | 'storage' | 'network';
  message: string;
}

export interface NewsletterFormState {
  email: string;
  isValid: boolean;
  isSubmitting: boolean;
  showSuccess: boolean;
  error: NewsletterValidationError | null;
}

export interface NewsletterSubmissionResult {
  success: boolean;
  message: string;
  isDuplicate?: boolean;
  subscription?: NewsletterSubscription;
}

export interface NewsletterTrackingEvent {
  eventName: string;
  properties: Record<string, any>;
  timestamp: string;
}