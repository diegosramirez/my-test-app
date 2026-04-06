import { TestBed } from '@angular/core/testing';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@domain.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const result = service.validateEmail(email);
        expect(result.isValid).toBe(true, `Failed for: ${email}`);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = service.validateEmail(email);
        expect(result.isValid).toBe(false, `Should reject: ${email}`);
        expect(result.error).toBeDefined();
      });
    });

    it('should detect common domain typos', () => {
      const typoEmails = [
        'user@gamil.com',
        'test@gmai.com',
        'user@hotmial.com'
      ];

      typoEmails.forEach(email => {
        const result = service.validateEmail(email);
        expect(result.isValid).toBe(false, `Should detect typo: ${email}`);
        expect(result.error).toContain('typos');
      });
    });

    it('should handle empty input', () => {
      const result = service.validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should handle very long emails', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      const result = service.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should give score 0 for empty password', () => {
      const result = service.validatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password is required');
    });

    it('should evaluate weak passwords correctly', () => {
      const weakPasswords = ['123456', 'password', 'abc'];

      weakPasswords.forEach(password => {
        const result = service.validatePasswordStrength(password);
        expect(result.score).toBeLessThan(4);
        expect(result.isValid).toBe(false);
      });
    });

    it('should evaluate strong passwords correctly', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mpl3x#P@ssw0rd',
        'Secure123!'
      ];

      strongPasswords.forEach(password => {
        const result = service.validatePasswordStrength(password);
        expect(result.score).toBeGreaterThanOrEqual(4);
        expect(result.isValid).toBe(true);
      });
    });

    it('should require minimum length', () => {
      const shortPassword = 'Abc1!';
      const result = service.validatePasswordStrength(shortPassword);
      expect(result.feedback).toContain('at least 8 characters');
    });

    it('should require lowercase letters', () => {
      const noLowercase = 'MYPASSWORD123!';
      const result = service.validatePasswordStrength(noLowercase);
      expect(result.feedback).toContain('lowercase letter');
    });

    it('should require uppercase letters', () => {
      const noUppercase = 'mypassword123!';
      const result = service.validatePasswordStrength(noUppercase);
      expect(result.feedback).toContain('uppercase letter');
    });

    it('should require numbers', () => {
      const noNumbers = 'MyPassword!';
      const result = service.validatePasswordStrength(noNumbers);
      expect(result.feedback).toContain('number');
    });

    it('should require special characters', () => {
      const noSpecial = 'MyPassword123';
      const result = service.validatePasswordStrength(noSpecial);
      expect(result.feedback).toContain('special character');
    });

    it('should penalize common passwords', () => {
      const commonPassword = 'password123';
      const result = service.validatePasswordStrength(commonPassword);
      expect(result.feedback).toContain('common password patterns');
    });

    it('should penalize repeated characters', () => {
      const repeatedChars = 'Mypasssss123!';
      const result = service.validatePasswordStrength(repeatedChars);
      expect(result.feedback).toContain('repeated characters');
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return correct labels for different scores', () => {
      expect(service.getPasswordStrengthLabel(0)).toBe('Weak');
      expect(service.getPasswordStrengthLabel(1)).toBe('Weak');
      expect(service.getPasswordStrengthLabel(2)).toBe('Fair');
      expect(service.getPasswordStrengthLabel(3)).toBe('Good');
      expect(service.getPasswordStrengthLabel(4)).toBe('Strong');
      expect(service.getPasswordStrengthLabel(5)).toBe('Very Strong');
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('should return correct colors for different scores', () => {
      expect(service.getPasswordStrengthColor(0)).toBe('#dc3545');
      expect(service.getPasswordStrengthColor(1)).toBe('#dc3545');
      expect(service.getPasswordStrengthColor(2)).toBe('#fd7e14');
      expect(service.getPasswordStrengthColor(3)).toBe('#ffc107');
      expect(service.getPasswordStrengthColor(4)).toBe('#28a745');
      expect(service.getPasswordStrengthColor(5)).toBe('#20c997');
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', (done) => {
      let callCount = 0;
      const mockFn = () => callCount++;
      const debouncedFn = service.debounce(mockFn, 100);

      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not have called yet
      expect(callCount).toBe(0);

      // After delay, should have called once
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });
  });
});