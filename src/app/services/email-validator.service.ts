import { Injectable } from '@angular/core';
import { NormalizedEmail, ValidationResult, ValidationError } from '../interfaces/subscription.interface';

@Injectable({
  providedIn: 'root'
})
export class EmailValidatorService {
  // RFC 5322 compliant email regex with additional practical constraints
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // More strict regex for basic format validation
  private readonly strictEmailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9]@[a-zA-Z0-9][a-zA-Z0-9.-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

  // Domain validation patterns
  private readonly domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

  // Common email providers for enhanced validation
  private readonly commonProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
  ];

  constructor() {}

  /**
   * Comprehensive email validation with specific error types
   */
  async validateEmail(email: string): Promise<ValidationResult> {
    try {
      // Basic empty check
      if (!email || email.trim().length === 0) {
        return {
          success: false,
          error: this.createValidationError(
            'EMPTY_EMAIL',
            'Email address is required.',
            'Email input is empty or contains only whitespace'
          )
        };
      }

      const trimmedEmail = email.trim();

      // Length validation
      if (trimmedEmail.length > 254) {
        return {
          success: false,
          error: this.createValidationError(
            'FORMAT_INVALID',
            'Email address is too long. Please enter a shorter email address.',
            `Email length ${trimmedEmail.length} exceeds maximum of 254 characters`
          )
        };
      }

      // Basic format validation
      if (!this.emailRegex.test(trimmedEmail)) {
        return {
          success: false,
          error: this.createValidationError(
            'FORMAT_INVALID',
            'Please enter a valid email address.',
            'Email does not match basic format requirements'
          )
        };
      }

      // Strict format validation
      if (!this.strictEmailRegex.test(trimmedEmail)) {
        return {
          success: false,
          error: this.createValidationError(
            'FORMAT_INVALID',
            'Email format is invalid. Please check for consecutive dots or invalid characters.',
            'Email fails strict format validation'
          )
        };
      }

      // Domain validation
      const domainValidation = this.validateDomain(trimmedEmail);
      if (!domainValidation.isValid) {
        return {
          success: false,
          error: this.createValidationError(
            'DOMAIN_INVALID',
            domainValidation.message,
            domainValidation.technicalReason
          )
        };
      }

      // Create normalized email
      const normalizedEmail = this.normalizeEmail(trimmedEmail);

      return {
        success: true,
        normalizedEmail
      };

    } catch (error) {
      console.error('Email validation error:', error);
      return {
        success: false,
        error: this.createValidationError(
          'FORMAT_INVALID',
          'Unable to validate email address. Please try again.',
          `Validation failed with error: ${error}`
        )
      };
    }
  }

  /**
   * Validates domain format and basic requirements
   */
  private validateDomain(email: string): {
    isValid: boolean;
    message: string;
    technicalReason: string;
  } {
    const [localPart, domain] = email.split('@');

    // Check if domain exists
    if (!domain) {
      return {
        isValid: false,
        message: 'Email address must contain a valid domain.',
        technicalReason: 'No domain part found after @ symbol'
      };
    }

    // Domain length validation
    if (domain.length > 253) {
      return {
        isValid: false,
        message: 'Domain name is too long.',
        technicalReason: `Domain length ${domain.length} exceeds maximum of 253 characters`
      };
    }

    // Domain format validation
    if (!this.domainRegex.test(domain)) {
      return {
        isValid: false,
        message: 'Please enter a valid domain name.',
        technicalReason: 'Domain does not match format requirements'
      };
    }

    // Check for consecutive dots
    if (domain.includes('..')) {
      return {
        isValid: false,
        message: 'Domain contains invalid consecutive dots.',
        technicalReason: 'Domain contains consecutive dots which are not allowed'
      };
    }

    // Check for leading/trailing dots
    if (domain.startsWith('.') || domain.endsWith('.')) {
      return {
        isValid: false,
        message: 'Domain cannot start or end with a dot.',
        technicalReason: 'Domain has leading or trailing dot'
      };
    }

    // Local part validation
    if (!localPart || localPart.length === 0) {
      return {
        isValid: false,
        message: 'Email address must have content before the @ symbol.',
        technicalReason: 'Empty local part'
      };
    }

    if (localPart.length > 64) {
      return {
        isValid: false,
        message: 'The part before @ is too long.',
        technicalReason: `Local part length ${localPart.length} exceeds maximum of 64 characters`
      };
    }

    // Check for consecutive dots in local part
    if (localPart.includes('..')) {
      return {
        isValid: false,
        message: 'Email contains invalid consecutive dots.',
        technicalReason: 'Local part contains consecutive dots which are not allowed'
      };
    }

    // Check for leading/trailing dots in local part
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return {
        isValid: false,
        message: 'Email cannot start or end with a dot before the @ symbol.',
        technicalReason: 'Local part has leading or trailing dot'
      };
    }

    return {
      isValid: true,
      message: 'Domain is valid',
      technicalReason: 'Domain passed all validation checks'
    };
  }

  /**
   * Normalizes email for duplicate detection and storage
   */
  normalizeEmail(email: string): NormalizedEmail {
    const [localPart, domain] = email.toLowerCase().trim().split('@');
    const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';

    let normalizedLocal = localPart;
    const variants: string[] = [];

    // Handle Gmail-specific normalization
    if (isGmail) {
      // Remove dots from Gmail addresses (they're ignored by Gmail)
      const withoutDots = localPart.replace(/\./g, '');

      // Remove everything after + (Gmail alias handling)
      const withoutAlias = withoutDots.split('+')[0];

      normalizedLocal = withoutAlias;

      // Generate common variants
      variants.push(`${localPart}@${domain}`); // Original
      variants.push(`${withoutDots}@${domain}`); // Without dots
      variants.push(`${withoutAlias}@${domain}`); // Without alias

      // Add googlemail.com variant for gmail
      if (domain === 'gmail.com') {
        variants.push(`${normalizedLocal}@googlemail.com`);
        variants.push(`${localPart}@googlemail.com`);
      }
    } else {
      // For non-Gmail, only handle + aliases
      normalizedLocal = localPart.split('+')[0];
      variants.push(`${localPart}@${domain}`); // Original
      if (normalizedLocal !== localPart) {
        variants.push(`${normalizedLocal}@${domain}`); // Without alias
      }
    }

    // Normalize domain (convert googlemail to gmail)
    const normalizedDomain = domain === 'googlemail.com' ? 'gmail.com' : domain;

    const normalized = `${normalizedLocal}@${normalizedDomain}`;

    // Remove duplicates from variants and exclude the normalized version
    const uniqueVariants = [...new Set(variants)].filter(v => v !== normalized);

    return {
      original: email,
      normalized,
      domain: normalizedDomain,
      localPart: normalizedLocal,
      isGmail,
      variants: uniqueVariants
    };
  }

  /**
   * Validates email format synchronously (for real-time validation)
   */
  isValidFormat(email: string): boolean {
    if (!email || email.trim().length === 0) {
      return false;
    }

    const trimmedEmail = email.trim();
    return this.emailRegex.test(trimmedEmail) && trimmedEmail.length <= 254;
  }

  /**
   * Quick domain check without full validation
   */
  hasValidDomainFormat(email: string): boolean {
    const parts = email.split('@');
    if (parts.length !== 2) {
      return false;
    }

    const domain = parts[1];
    return Boolean(domain) && this.domainRegex.test(domain);
  }

  /**
   * Checks if domain is a known common provider
   */
  isCommonProvider(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? this.commonProviders.includes(domain) : false;
  }

  /**
   * Creates a structured validation error
   */
  private createValidationError(
    code: ValidationError['code'],
    message: string,
    technicalDetails: string,
    field?: string
  ): ValidationError {
    return {
      type: 'validation',
      code,
      message,
      technicalDetails,
      field
    };
  }

  /**
   * Checks if two emails are equivalent (considering normalization)
   */
  areEmailsEquivalent(email1: string, email2: string): boolean {
    try {
      const normalized1 = this.normalizeEmail(email1);
      const normalized2 = this.normalizeEmail(email2);

      // Check if normalized versions match
      if (normalized1.normalized === normalized2.normalized) {
        return true;
      }

      // Check if either email matches any variant of the other
      return normalized1.variants.includes(email2.toLowerCase()) ||
             normalized2.variants.includes(email1.toLowerCase()) ||
             normalized1.variants.some(variant => normalized2.variants.includes(variant));
    } catch (error) {
      console.error('Error comparing emails:', error);
      return email1.toLowerCase().trim() === email2.toLowerCase().trim();
    }
  }

  /**
   * Gets suggestions for common typos in popular email domains
   */
  getSuggestedDomain(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const suggestions: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmeil.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com'
    };

    return suggestions[domain] || null;
  }
}