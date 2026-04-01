import { TestBed } from '@angular/core/testing';
import { EmailValidatorService } from './email-validator.service';
import { ValidationError, NormalizedEmail } from '../interfaces/subscription.interface';

describe('EmailValidatorService', () => {
  let service: EmailValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmailValidatorService]
    });
    service = TestBed.inject(EmailValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Email Format Validation - Acceptance Criteria', () => {
    it('should validate properly formatted emails successfully', async () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user_name@domain-name.com',
        'first.last@subdomain.example.org'
      ];

      for (const email of validEmails) {
        const result = await service.validateEmail(email);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.normalizedEmail.original).toBe(email);
          expect(result.normalizedEmail.normalized).toBe(email.toLowerCase());
        }
      }
    });

    it('should return specific error types for different validation failures', async () => {
      const testCases = [
        { email: '', expectedCode: 'EMPTY_EMAIL', description: 'empty email' },
        { email: '   ', expectedCode: 'EMPTY_EMAIL', description: 'whitespace only' },
        { email: 'invalid-email', expectedCode: 'FORMAT_INVALID', description: 'missing @ symbol' },
        { email: 'user@', expectedCode: 'DOMAIN_INVALID', description: 'missing domain' },
        { email: '@domain.com', expectedCode: 'DOMAIN_INVALID', description: 'missing local part' },
        { email: 'user..name@domain.com', expectedCode: 'FORMAT_INVALID', description: 'consecutive dots in local part' },
        { email: '.user@domain.com', expectedCode: 'FORMAT_INVALID', description: 'leading dot in local part' },
        { email: 'user.@domain.com', expectedCode: 'FORMAT_INVALID', description: 'trailing dot in local part' },
        { email: 'user@domain..com', expectedCode: 'DOMAIN_INVALID', description: 'consecutive dots in domain' },
        { email: 'user@.domain.com', expectedCode: 'DOMAIN_INVALID', description: 'leading dot in domain' },
        { email: 'user@domain.', expectedCode: 'DOMAIN_INVALID', description: 'trailing dot in domain' }
      ];

      for (const testCase of testCases) {
        const result = await service.validateEmail(testCase.email);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(testCase.expectedCode);
          expect(result.error.message).toBeTruthy();
          expect(result.error.technicalDetails).toBeTruthy();
          expect(result.error.type).toBe('validation');
        }
      }
    });

    it('should provide user-friendly error messages without technical details', async () => {
      const result = await service.validateEmail('invalid-email');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/please enter a valid email address/i);
        expect(result.error.message).not.toContain('regex');
        expect(result.error.message).not.toContain('RFC');
        expect(result.error.technicalDetails).toBeTruthy(); // Technical details should exist but be separate
      }
    });

    it('should handle email length validation', async () => {
      // Email too long (over 254 characters)
      const longEmail = 'a'.repeat(250) + '@example.com'; // 261 characters total
      const result = await service.validateEmail(longEmail);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORMAT_INVALID');
        expect(result.error.message).toContain('too long');
      }
    });

    it('should handle local part length validation', async () => {
      // Local part too long (over 64 characters)
      const longLocalPart = 'a'.repeat(65) + '@example.com';
      const result = await service.validateEmail(longLocalPart);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DOMAIN_INVALID');
        expect(result.error.message).toContain('before @');
      }
    });

    it('should handle domain length validation', async () => {
      // Domain too long (over 253 characters)
      const longDomain = 'user@' + 'a'.repeat(250) + '.com';
      const result = await service.validateEmail(longDomain);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DOMAIN_INVALID');
        expect(result.error.message).toContain('Domain name is too long');
      }
    });

    it('should handle validation exceptions gracefully', async () => {
      // Spy on console.error to verify error logging
      spyOn(console, 'error');

      // Force an error by mocking a method to throw
      spyOn(service as any, 'validateDomain').and.throwError('Forced error');

      const result = await service.validateEmail('test@example.com');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORMAT_INVALID');
        expect(result.error.message).toContain('Unable to validate');
        expect(console.error).toHaveBeenCalled();
      }
    });
  });

  describe('Email Normalization and Duplicate Detection - Acceptance Criteria', () => {
    it('should normalize Gmail addresses correctly', () => {
      const testCases = [
        {
          input: 'user.name+tag@gmail.com',
          expected: {
            normalized: 'username@gmail.com',
            isGmail: true,
            variants: [
              'user.name+tag@gmail.com',
              'username@gmail.com',
              'username@googlemail.com',
              'user.name+tag@googlemail.com'
            ]
          }
        },
        {
          input: 'USER.NAME@googlemail.com',
          expected: {
            normalized: 'username@gmail.com',
            isGmail: true
          }
        }
      ];

      for (const testCase of testCases) {
        const result = service.normalizeEmail(testCase.input);
        expect(result.normalized).toBe(testCase.expected.normalized);
        expect(result.isGmail).toBe(testCase.expected.isGmail);
        expect(result.original).toBe(testCase.input);

        if (testCase.expected.variants) {
          // Check that all expected variants are included
          for (const variant of testCase.expected.variants) {
            expect([result.normalized, ...result.variants]).toContain(variant);
          }
        }
      }
    });

    it('should handle non-Gmail email normalization', () => {
      const testCases = [
        'user.name+tag@yahoo.com',
        'User.Name@OUTLOOK.COM',
        'test+alias@custom-domain.co.uk'
      ];

      for (const email of testCases) {
        const result = service.normalizeEmail(email);
        expect(result.isGmail).toBe(false);
        expect(result.normalized.toLowerCase()).toBe(result.normalized);

        // Should still handle + aliases for non-Gmail
        if (email.includes('+')) {
          expect(result.normalized).not.toContain('+');
        }
      }
    });

    it('should detect equivalent emails across variations', () => {
      const equivalentPairs = [
        ['user.name@gmail.com', 'username@gmail.com'],
        ['user+tag@gmail.com', 'user@googlemail.com'],
        ['USER@DOMAIN.COM', 'user@domain.com'],
        ['test+alias@example.com', 'test@example.com']
      ];

      for (const [email1, email2] of equivalentPairs) {
        expect(service.areEmailsEquivalent(email1, email2)).toBe(true);
        expect(service.areEmailsEquivalent(email2, email1)).toBe(true); // Commutative
      }
    });

    it('should not detect false positives in email equivalence', () => {
      const nonEquivalentPairs = [
        ['user@gmail.com', 'different@gmail.com'],
        ['test@example.com', 'test@different.com'],
        ['user@domain.com', 'user2@domain.com']
      ];

      for (const [email1, email2] of nonEquivalentPairs) {
        expect(service.areEmailsEquivalent(email1, email2)).toBe(false);
      }
    });

    it('should handle email equivalence errors gracefully', () => {
      spyOn(console, 'error');

      // Test with malformed emails that might cause errors
      const result = service.areEmailsEquivalent('malformed', 'also-malformed');

      expect(typeof result).toBe('boolean');
      // Should fallback to simple string comparison
    });
  });

  describe('Synchronous Validation Methods', () => {
    it('should validate email format synchronously', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk'
      ];

      const invalidEmails = [
        '',
        'invalid',
        'user@',
        '@domain.com',
        'a'.repeat(255) + '@example.com' // Too long
      ];

      for (const email of validEmails) {
        expect(service.isValidFormat(email)).toBe(true);
      }

      for (const email of invalidEmails) {
        expect(service.isValidFormat(email)).toBe(false);
      }
    });

    it('should validate domain format quickly', () => {
      expect(service.hasValidDomainFormat('user@valid-domain.com')).toBe(true);
      expect(service.hasValidDomainFormat('user@invalid..domain.com')).toBe(false);
      expect(service.hasValidDomainFormat('user@')).toBe(false);
      expect(service.hasValidDomainFormat('invalid-email')).toBe(false);
    });

    it('should identify common email providers', () => {
      const commonEmails = [
        'user@gmail.com',
        'test@yahoo.com',
        'name@hotmail.com',
        'email@outlook.com'
      ];

      const uncommonEmails = [
        'user@my-company.com',
        'test@custom-domain.org'
      ];

      for (const email of commonEmails) {
        expect(service.isCommonProvider(email)).toBe(true);
      }

      for (const email of uncommonEmails) {
        expect(service.isCommonProvider(email)).toBe(false);
      }
    });
  });

  describe('Email Suggestions for Typos', () => {
    it('should suggest corrections for common domain typos', () => {
      const typoCorrections = [
        { input: 'user@gmai.com', expected: 'gmail.com' },
        { input: 'user@gmial.com', expected: 'gmail.com' },
        { input: 'user@yahooo.com', expected: 'yahoo.com' },
        { input: 'user@hotmial.com', expected: 'hotmail.com' },
        { input: 'user@outlok.com', expected: 'outlook.com' }
      ];

      for (const correction of typoCorrections) {
        const suggestion = service.getSuggestedDomain(correction.input);
        expect(suggestion).toBe(correction.expected);
      }
    });

    it('should return null for correct domains', () => {
      const correctEmails = [
        'user@gmail.com',
        'test@example.com',
        'name@custom-domain.org'
      ];

      for (const email of correctEmails) {
        const suggestion = service.getSuggestedDomain(email);
        expect(suggestion).toBe(null);
      }
    });

    it('should return null for emails without domains', () => {
      const malformedEmails = [
        'user',
        'invalid-email',
        '@domain.com'
      ];

      for (const email of malformedEmails) {
        const suggestion = service.getSuggestedDomain(email);
        expect(suggestion).toBe(null);
      }
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle unicode and international domains', async () => {
      // Note: Basic implementation may not fully support IDN, but should handle gracefully
      const unicodeEmail = 'test@münchen.de';
      const result = await service.validateEmail(unicodeEmail);

      // Should either validate successfully or fail gracefully
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toBeTruthy();
      }
    });

    it('should handle emails with special characters', async () => {
      const specialCharEmails = [
        'user+tag@example.com', // Plus addressing
        'user.name@example.com', // Dots in local part
        'user_name@example.com', // Underscores
        'user-name@example-domain.com' // Hyphens
      ];

      for (const email of specialCharEmails) {
        const result = await service.validateEmail(email);
        expect(result.success).toBe(true);
      }
    });

    it('should handle very short and very long valid emails', async () => {
      // Very short valid email
      const shortEmail = 'a@b.co';
      const shortResult = await service.validateEmail(shortEmail);
      expect(shortResult.success).toBe(true);

      // Long but valid email (just under limits)
      const longLocal = 'a'.repeat(60); // 60 chars (under 64 limit)
      const longDomain = 'b'.repeat(60) + '.com'; // Under domain limits
      const longEmail = `${longLocal}@${longDomain}`;

      if (longEmail.length <= 254) { // Total length check
        const longResult = await service.validateEmail(longEmail);
        expect(longResult.success).toBe(true);
      }
    });

    it('should normalize email variants consistently', () => {
      const email = 'User.Name+Tag@Gmail.Com';
      const result1 = service.normalizeEmail(email);
      const result2 = service.normalizeEmail(email.toLowerCase());
      const result3 = service.normalizeEmail('username@gmail.com');

      // All should normalize to the same result
      expect(result1.normalized).toBe(result2.normalized);
      expect(result1.normalized).toBe(result3.normalized);
    });

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        null as any,
        undefined as any,
        123 as any,
        {} as any,
        [] as any
      ];

      for (const input of malformedInputs) {
        expect(() => service.isValidFormat(input)).not.toThrow();
        expect(() => service.hasValidDomainFormat(input)).not.toThrow();
        expect(() => service.isCommonProvider(input)).not.toThrow();
      }
    });
  });

  describe('Performance and Validation Metrics', () => {
    it('should validate emails within reasonable time limits', async () => {
      const emails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'invalid-email',
        'user@toolong' + 'a'.repeat(250) + '.com'
      ];

      for (const email of emails) {
        const start = Date.now();
        await service.validateEmail(email);
        const duration = Date.now() - start;

        // Validation should complete within 100ms for any email
        expect(duration).toBeLessThan(100);
      }
    });

    it('should provide consistent validation results', async () => {
      const testEmail = 'test@example.com';

      // Run validation multiple times
      const results = await Promise.all([
        service.validateEmail(testEmail),
        service.validateEmail(testEmail),
        service.validateEmail(testEmail)
      ]);

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].success).toBe(results[0].success);
        if (results[i].success && results[0].success) {
          expect(results[i].normalizedEmail.normalized)
            .toBe(results[0].normalizedEmail.normalized);
        }
      }
    });
  });
});