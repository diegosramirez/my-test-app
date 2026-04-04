export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string[];
  email?: string[];
  phone?: string[];
  message?: string[];
}

export interface ContactSubmissionResponse {
  success: boolean;
  message: string;
  errors?: ContactFormErrors;
}

export interface ContactSubmissionState {
  isLoading: boolean;
  isSubmitted: boolean;
  retryCount: number;
  error: string | null;
}