import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class ContactFormValidators {
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(control.value);

    return isValid ? null : { email: {
      actualValue: control.value,
      message: 'Please enter a valid email address (e.g., name@example.com)'
    }};
  }

  static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const length = control.value.length;
      if (length > maxLength) {
        return {
          maxlength: {
            actualLength: length,
            requiredLength: maxLength,
            message: `Message must be no more than ${maxLength} characters (currently ${length})`
          }
        };
      }

      return null;
    };
  }

  static phone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Phone is optional
    }

    // Allow various phone number formats but ensure at least 10 digits are present
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    const digitCount = (control.value.replace(/[^\d]/g, '')).length;
    const isValid = phoneRegex.test(control.value) && digitCount >= 10;

    return isValid ? null : { phone: {
      actualValue: control.value,
      message: 'Please enter a valid phone number (e.g., (555) 123-4567 or +1-555-123-4567)'
    }};
  }

  static required(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value.toString().trim().length === 0) {
      return { required: { message: 'This field is required' } };
    }
    return null;
  }
}