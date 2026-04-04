export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface FormValidationState {
  [key: string]: {
    invalid: boolean;
    touched: boolean;
    errors: string[];
  };
}

export interface ContactSubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: string;
  errors?: {
    [field: string]: string[];
  };
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submissionError: string | null;
  retryCount: number;
}

export interface ContactFormAnalytics {
  pageUrl: string;
  userType: string;
  fieldName?: string;
  errorType?: string;
  completionTime?: number;
  retryCount?: number;
  fieldsCompleted?: string[];
  timeSpent?: number;
  submissionId?: string;
  userFeedback?: string;
}