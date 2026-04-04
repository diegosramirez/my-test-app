import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validators for the contact form
 * Provides validation logic for all form fields with proper error messaging
 */
export class ContactFormValidators {

  /**
   * Validates that a string field is not empty after trimming whitespace
   */
  static required(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return { required: { message: 'This field is required' } };
    }
    return null;
  }

  /**
   * Validates email format using a comprehensive regex
   */
  static email(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null; // Let required validator handle empty values

    // More permissive email regex that accepts common email formats
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(value)) {
      return { email: { message: 'Please enter a valid email address' } };
    }
    return null;
  }

  /**
   * Validates character length with customizable limits
   */
  static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      if (value.length > maxLength) {
        return {
          maxlength: {
            message: `Maximum ${maxLength} characters allowed`,
            actualLength: value.length,
            requiredLength: maxLength
          }
        };
      }
      return null;
    };
  }

  /**
   * Validates minimum character length
   */
  static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null; // Let required validator handle empty values

      if (value.trim().length < minLength) {
        return {
          minlength: {
            message: `Minimum ${minLength} characters required`,
            actualLength: value.trim().length,
            requiredLength: minLength
          }
        };
      }
      return null;
    };
  }

  /**
   * Validates international phone number formats
   * Supports various international formats including country codes
   */
  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || value.trim().length === 0) return null; // Phone is optional

    // Remove all non-digit characters to count digits
    const digitsOnly = value.replace(/[^\d]/g, '');

    // Check if it has the right number of digits
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return {
        phoneNumber: {
          message: 'Please enter a valid phone number (7-15 digits, international format supported)'
        }
      };
    }

    // Basic validation for international phone numbers
    // Allow digits, spaces, hyphens, parentheses, and optional + at the beginning
    const phoneRegex = /^(\+?[\d\s\-\(\).]+)$/;

    if (!phoneRegex.test(value)) {
      return {
        phoneNumber: {
          message: 'Please enter a valid phone number (7-15 digits, international format supported)'
        }
      };
    }

    return null;
  }

  /**
   * Validates that the message contains meaningful content
   */
  static meaningfulMessage(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Check for messages that are too short or only contain repeated characters
    const trimmedValue = value.trim();
    if (trimmedValue.length < 10) {
      return {
        meaningfulMessage: {
          message: 'Please provide a more detailed message (at least 10 characters)'
        }
      };
    }

    // Check for spam-like patterns (same character repeated too many times)
    const isSpamLike = /^(.)\1{9,}$/.test(trimmedValue.replace(/\s/g, ''));
    if (isSpamLike) {
      return {
        meaningfulMessage: {
          message: 'Please provide a meaningful message'
        }
      };
    }

    return null;
  }

  /**
   * Gets the first error message from a control's errors
   */
  static getErrorMessage(control: AbstractControl): string {
    if (!control.errors) return '';

    const firstError = Object.keys(control.errors)[0];
    const error = control.errors[firstError];

    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }

    // Fallback error messages for Angular built-in validators
    switch (firstError) {
      case 'required':
        return 'This field is required';
      case 'email':
        return 'Please enter a valid email address';
      case 'maxlength':
        return `Maximum ${error.requiredLength} characters allowed`;
      case 'minlength':
        return `Minimum ${error.requiredLength} characters required`;
      default:
        return 'Invalid input';
    }
  }

  /**
   * Validates the entire contact form for cross-field validation
   */
  static contactFormValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const formValue = control.value;
    const errors: ValidationErrors = {};

    // Example: Ensure name and message don't contain the same content
    if (formValue.name && formValue.message &&
        formValue.name.trim().toLowerCase() === formValue.message.trim().toLowerCase()) {
      errors['duplicateContent'] = {
        message: 'Name and message cannot be identical'
      };
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }
}