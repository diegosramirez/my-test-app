import { Injectable } from '@angular/core';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordStrengthResult {
  score: number; // 0-4 scale
  feedback: string[];
  isValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  /**
   * Validates email format including edge cases like plus addressing and international domains
   */
  validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
      return { isValid: false, error: 'Email is required' };
    }

    // Comprehensive email regex that handles:
    // - Plus addressing (user+tag@domain.com)
    // - International domains
    // - Subdomains
    // - Various TLD formats
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Check for common typos in domain names
    const commonDomainTypos = [
      'gamil.com', 'gmai.com', 'gmial.com', // Gmail typos
      'yahooo.com', 'yaho.com', // Yahoo typos
      'hotmial.com', 'hotmai.com', // Hotmail typos
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && commonDomainTypos.includes(domain)) {
      return { isValid: false, error: 'Please check your email domain for typos' };
    }

    // Additional validation for length
    if (email.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    const localPart = email.split('@')[0];
    if (localPart.length > 64) {
      return { isValid: false, error: 'Email local part is too long' };
    }

    return { isValid: true };
  }

  /**
   * Validates password strength with detailed feedback
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    if (!password) {
      return {
        score: 0,
        feedback: ['Password is required'],
        isValid: false
      };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length requirement (minimum 8 characters)
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Must be at least 8 characters long');
    }

    // Contains lowercase letter
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Must contain at least one lowercase letter');
    }

    // Contains uppercase letter
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Must contain at least one uppercase letter');
    }

    // Contains number
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Must contain at least one number');
    }

    // Contains special character
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Must contain at least one special character');
    }

    // Additional checks for very strong passwords
    if (password.length >= 12) {
      score = Math.min(score + 0.5, 5);
    }

    // Check for common weak patterns
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score = Math.max(score - 2, 0);
      feedback.push('Avoid common password patterns');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(score - 1, 0);
      feedback.push('Avoid repeated characters');
    }

    return {
      score: Math.floor(score),
      feedback,
      isValid: score >= 4 // Require at least 4 out of 5 criteria
    };
  }

  /**
   * Get password strength label for UI display
   */
  getPasswordStrengthLabel(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return 'Weak';
    }
  }

  /**
   * Get password strength color for UI styling
   */
  getPasswordStrengthColor(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return '#dc3545'; // Red
      case 2:
        return '#fd7e14'; // Orange
      case 3:
        return '#ffc107'; // Yellow
      case 4:
        return '#28a745'; // Green
      case 5:
        return '#20c997'; // Teal
      default:
        return '#dc3545';
    }
  }

  /**
   * Debounced validation helper
   */
  debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    }) as T;
  }
}