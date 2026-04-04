/**
 * Interface defining the structure of contact form data
 * Used for form validation and API communication
 */
export interface ContactFormData {
  /**
   * User's full name (required)
   * Maximum length: 50 characters
   */
  name: string;

  /**
   * User's email address (required)
   * Must be valid email format
   */
  email: string;

  /**
   * User's phone number (optional)
   * Supports international formats
   */
  phone?: string;

  /**
   * User's message (required)
   * Maximum length: 1000 characters
   */
  message: string;
}

/**
 * Interface for API response structure
 */
export interface FormSubmissionResponse {
  /** Whether the submission was successful */
  success: boolean;

  /** Response message from the server */
  message: string;

  /** Optional field-specific validation errors */
  errors?: { [fieldName: string]: string[] };
}

/**
 * Interface for form validation errors
 */
export interface FormValidationError {
  /** The field that has the error */
  fieldName: keyof ContactFormData;

  /** Type of validation error */
  errorType: string;

  /** Human-readable error message */
  message: string;
}

/**
 * Interface for tracking form interaction events
 */
export interface FormTrackingEvent {
  /** Name of the event being tracked */
  eventName: string;

  /** Event properties for analytics */
  properties: Record<string, any>;

  /** Timestamp when the event occurred */
  timestamp: Date;
}