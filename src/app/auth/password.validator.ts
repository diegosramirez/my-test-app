import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordValidationResult {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

/**
 * Custom password validator that checks multiple requirements
 */
export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const password = control.value as string;
    const result = validatePassword(password);

    if (result.isValid) {
      return null;
    }

    return { passwordRequirements: result };
  };
}

/**
 * Validate password against all requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  const isValid = minLength && hasUppercase && hasNumber;

  return {
    minLength,
    hasUppercase,
    hasNumber,
    isValid
  };
}

/**
 * Validator function for password confirmation
 */
export function confirmPasswordValidator(passwordControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const password = control.parent.get(passwordControlName);
    const confirmPassword = control;

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }

    return null;
  };
}