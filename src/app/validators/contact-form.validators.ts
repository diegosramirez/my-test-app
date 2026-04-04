import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class ContactFormValidators {

  /**
   * Validates international phone numbers with flexible formatting
   * Accepts formats like: +1-234-567-8900, (123) 456-7890, +44 20 7946 0958, etc.
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.trim() === '') {
        return null; // Don't validate empty values (use required validator for that)
      }

      const phoneValue = control.value.trim();

      // Remove all non-digit characters except + at the start
      const digitsOnly = phoneValue.replace(/[^\d+]/g, '');

      // Check if it starts with + (international format)
      const isInternational = phoneValue.startsWith('+');

      // Basic validation rules:
      // 1. Should contain only digits, spaces, hyphens, parentheses, and optional + at start
      // 2. Should have reasonable length (7-15 digits for international standards)
      // 3. Should not have + in the middle

      const validCharPattern = /^[+]?[\d\s\-\(\)\.\#\*]+$/;
      if (!validCharPattern.test(phoneValue)) {
        return { phoneFormat: { message: 'Phone number contains invalid characters' } };
      }

      // Check for + in the middle
      if (phoneValue.includes('+') && !phoneValue.startsWith('+')) {
        return { phoneFormat: { message: 'Plus sign (+) can only be at the beginning' } };
      }

      // Extract digits for length validation
      const digits = digitsOnly.replace(/^\+/, ''); // Remove leading +

      if (digits.length < 7) {
        return { phoneFormat: { message: 'Phone number is too short (minimum 7 digits)' } };
      }

      if (digits.length > 15) {
        return { phoneFormat: { message: 'Phone number is too long (maximum 15 digits)' } };
      }

      // Additional validation for common patterns
      if (isInternational) {
        // International format should have country code (1-4 digits after +)
        const countryCodeMatch = digitsOnly.match(/^\+(\d{1,4})/);
        if (!countryCodeMatch) {
          return { phoneFormat: { message: 'Invalid international format' } };
        }
      }

      // Check for suspicious patterns (all same digit, sequential digits, etc.)
      if (/^(\d)\1{6,}$/.test(digits)) {
        return { phoneFormat: { message: 'Phone number cannot be all the same digit' } };
      }

      return null;
    };
  }

  /**
   * Enhanced email validator that provides more specific error messages
   */
  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.trim() === '') {
        return null;
      }

      const email = control.value.trim().toLowerCase();

      // Basic format check
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailPattern.test(email)) {
        // More specific error messages
        if (!email.includes('@')) {
          return { emailFormat: { message: 'Email must contain an @ symbol' } };
        }

        if (email.indexOf('@') !== email.lastIndexOf('@')) {
          return { emailFormat: { message: 'Email cannot contain multiple @ symbols' } };
        }

        const parts = email.split('@');
        if (parts[0].length === 0) {
          return { emailFormat: { message: 'Email must have text before the @ symbol' } };
        }

        if (parts[1].length === 0) {
          return { emailFormat: { message: 'Email must have a domain after the @ symbol' } };
        }

        if (!parts[1].includes('.')) {
          return { emailFormat: { message: 'Email domain must contain a period' } };
        }

        const domainParts = parts[1].split('.');
        if (domainParts[domainParts.length - 1].length < 2) {
          return { emailFormat: { message: 'Email domain extension must be at least 2 characters' } };
        }

        return { emailFormat: { message: 'Please enter a valid email address' } };
      }

      // Additional checks for common issues
      if (email.startsWith('.') || email.endsWith('.')) {
        return { emailFormat: { message: 'Email cannot start or end with a period' } };
      }

      if (email.includes('..')) {
        return { emailFormat: { message: 'Email cannot contain consecutive periods' } };
      }

      return null;
    };
  }

  /**
   * Custom required validator with specific error message
   */
  static required(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.toString().trim() === '') {
        return { required: { message: `${fieldName} is required` } };
      }
      return null;
    };
  }

  /**
   * Minimum length validator with custom message
   */
  static minLength(min: number, fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const length = control.value.toString().trim().length;
      if (length < min) {
        return {
          minlength: {
            message: `${fieldName} must be at least ${min} character${min === 1 ? '' : 's'} long`,
            requiredLength: min,
            actualLength: length
          }
        };
      }
      return null;
    };
  }

  /**
   * Maximum length validator with custom message
   */
  static maxLength(max: number, fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const length = control.value.toString().length;
      if (length > max) {
        return {
          maxlength: {
            message: `${fieldName} cannot exceed ${max} character${max === 1 ? '' : 's'}`,
            requiredLength: max,
            actualLength: length
          }
        };
      }
      return null;
    };
  }

  /**
   * Validates that the message contains meaningful content (not just whitespace or repeated characters)
   */
  static meaningfulContent(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const content = control.value.toString().trim();

      if (content.length === 0) {
        return null; // Handle by required validator
      }

      // Check for minimum meaningful content
      if (content.length < 10) {
        return { meaningfulContent: { message: 'Please provide a more detailed message' } };
      }

      // Check for repeated characters (more than 5 consecutive same characters)
      if (/(.)\1{5,}/.test(content)) {
        return { meaningfulContent: { message: 'Message cannot contain excessive repeated characters' } };
      }

      // Check for mostly non-alphabetic characters (spam detection)
      const alphabeticChars = (content.match(/[a-zA-Z]/g) || []).length;
      const totalChars = content.length;
      if (alphabeticChars / totalChars < 0.3 && totalChars > 20) {
        return { meaningfulContent: { message: 'Please write your message using words' } };
      }

      return null;
    };
  }
}