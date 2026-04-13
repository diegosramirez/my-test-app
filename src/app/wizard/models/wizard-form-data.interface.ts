export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface WizardFormData {
  personalInfo: PersonalInfo;
  addressInfo: AddressInfo;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  sessionId: string;
  timestamps: {
    started: Date;
    stepStarted: Date;
    lastUpdated: Date;
  };
}

export enum WizardStep {
  PERSONAL = 'personal',
  ADDRESS = 'address',
  REVIEW = 'review'
}

export interface FormSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  errorType: string;
}

export interface StepValidationState {
  isValid: boolean;
  errors: ValidationError[];
}