import { FormControl } from '@angular/forms';
import { ContactFormValidators } from './contact-form.validators';

describe('ContactFormValidators', () => {
  describe('email validator', () => {
    it('should return null for empty values (let required handle empty)', () => {
      const control = new FormControl('');
      const result = ContactFormValidators.email(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = ContactFormValidators.email(control);
      expect(result).toBeNull();
    });

    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'x@domain.org',
        'firstname.lastname@subdomain.domain.com',
        'email@123.123.123.123', // This would pass the regex but may not be a real case
        'email@domain-one.example',
        '_______@domain.com',
        'test123@domain123.co'
      ];

      validEmails.forEach(email => {
        const control = new FormControl(email);
        const result = ContactFormValidators.email(control);
        expect(result).toBeNull();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain',
        'test..test@domain.com',
        'test@',
        'test@domain.',
        'test.domain.com',
        'test@domain..com',
        '.test@domain.com',
        'test@domain,com',
        'test@domain@domain.com',
        'test space@domain.com',
        'test@domain space.com'
      ];

      invalidEmails.forEach(email => {
        const control = new FormControl(email);
        const result = ContactFormValidators.email(control);
        expect(result).toEqual({
          email: {
            actualValue: email,
            message: 'Please enter a valid email address (e.g., name@example.com)'
          }
        });
      });
    });

    it('should handle edge case emails correctly', () => {
      // Test boundary conditions
      const control1 = new FormControl('a@b.co'); // minimum valid length
      expect(ContactFormValidators.email(control1)).toBeNull();

      const control2 = new FormControl('verylongemailaddressthatshouldbetechnicallyvalidbutquitelong@verylongdomainnamethatshouldstillpassvalidation.com');
      expect(ContactFormValidators.email(control2)).toBeNull();
    });
  });

  describe('maxLength validator', () => {
    it('should return null for empty values', () => {
      const validator = ContactFormValidators.maxLength(100);
      const control = new FormControl('');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const validator = ContactFormValidators.maxLength(100);
      const control = new FormControl(null);
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null when under character limit', () => {
      const validator = ContactFormValidators.maxLength(500);
      const control = new FormControl('This is a short message');
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return null when exactly at character limit', () => {
      const validator = ContactFormValidators.maxLength(10);
      const control = new FormControl('1234567890'); // exactly 10 characters
      const result = validator(control);
      expect(result).toBeNull();
    });

    it('should return error when over character limit', () => {
      const validator = ContactFormValidators.maxLength(10);
      const control = new FormControl('12345678901'); // 11 characters
      const result = validator(control);
      expect(result).toEqual({
        maxlength: {
          actualLength: 11,
          requiredLength: 10,
          message: 'Message must be no more than 10 characters (currently 11)'
        }
      });
    });

    it('should handle message field 500 character limit correctly', () => {
      const validator = ContactFormValidators.maxLength(500);

      // Create exactly 500 characters
      const exactly500 = 'a'.repeat(500);
      const control500 = new FormControl(exactly500);
      expect(validator(control500)).toBeNull();

      // Create 501 characters
      const over500 = 'a'.repeat(501);
      const control501 = new FormControl(over500);
      const result = validator(control501);
      expect(result).toEqual({
        maxlength: {
          actualLength: 501,
          requiredLength: 500,
          message: 'Message must be no more than 500 characters (currently 501)'
        }
      });
    });

    it('should handle unicode characters correctly', () => {
      const validator = ContactFormValidators.maxLength(5);
      const emojiString = '😀😁😂😃😄'; // 5 emoji characters
      const control = new FormControl(emojiString);
      expect(validator(control)).toBeNull();

      const tooLong = '😀😁😂😃😄😅'; // 6 emoji characters
      const controlTooLong = new FormControl(tooLong);
      const result = validator(controlTooLong);
      expect(result).toEqual({
        maxlength: {
          actualLength: 6,
          requiredLength: 5,
          message: 'Message must be no more than 5 characters (currently 6)'
        }
      });
    });
  });

  describe('phone validator', () => {
    it('should return null for empty values (phone is optional)', () => {
      const control = new FormControl('');
      const result = ContactFormValidators.phone(control);
      expect(result).toBeNull();
    });

    it('should return null for null values', () => {
      const control = new FormControl(null);
      const result = ContactFormValidators.phone(control);
      expect(result).toBeNull();
    });

    it('should validate various correct phone number formats', () => {
      const validPhones = [
        '1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '+1-123-456-7890',
        '+1 123 456 7890',
        '123.456.7890',
        '123 456 7890',
        '+44 20 7946 0958', // UK number
        '+1 (555) 123-4567',
        '555-123-4567',
        '5551234567890', // Long international
        '+1234567890123' // Long international with plus
      ];

      validPhones.forEach(phone => {
        const control = new FormControl(phone);
        const result = ContactFormValidators.phone(control);
        expect(result).toBeNull();
      });
    });

    it('should reject invalid phone number formats', () => {
      const invalidPhones = [
        'abc123',
        '123',
        '123-456',
        'phone',
        '12-34-56',
        '+++123456',
        '123456789', // too short (only 9 digits)
        'abcdefghij',
        '!@#$%^&*()',
        '12345678a9',
        ''
      ];

      invalidPhones.forEach(phone => {
        if (phone !== '') { // empty is valid (optional field)
          const control = new FormControl(phone);
          const result = ContactFormValidators.phone(control);
          expect(result).toEqual({
            phone: {
              actualValue: phone,
              message: 'Please enter a valid phone number (e.g., (555) 123-4567 or +1-555-123-4567)'
            }
          });
        }
      });
    });

    it('should handle edge cases and spacing correctly', () => {
      // Test with lots of spaces
      const control1 = new FormControl('  123 456 7890  ');
      expect(ContactFormValidators.phone(control1)).toBeNull();

      // Test minimum valid length (10 digits after space removal)
      const control2 = new FormControl('1234567890');
      expect(ContactFormValidators.phone(control2)).toBeNull();

      // Test just under minimum (9 digits)
      const control3 = new FormControl('123456789');
      expect(ContactFormValidators.phone(control3)).toEqual({
        phone: {
          actualValue: '123456789',
          message: 'Please enter a valid phone number (e.g., (555) 123-4567 or +1-555-123-4567)'
        }
      });
    });
  });

  describe('required validator', () => {
    it('should return error for empty string', () => {
      const control = new FormControl('');
      const result = ContactFormValidators.required(control);
      expect(result).toEqual({
        required: { message: 'This field is required' }
      });
    });

    it('should return error for null values', () => {
      const control = new FormControl(null);
      const result = ContactFormValidators.required(control);
      expect(result).toEqual({
        required: { message: 'This field is required' }
      });
    });

    it('should return error for undefined values', () => {
      const control = new FormControl(undefined);
      const result = ContactFormValidators.required(control);
      expect(result).toEqual({
        required: { message: 'This field is required' }
      });
    });

    it('should return error for whitespace-only strings', () => {
      const whitespaceValues = ['   ', '\t', '\n', '  \t\n  ', '\r\n'];

      whitespaceValues.forEach(value => {
        const control = new FormControl(value);
        const result = ContactFormValidators.required(control);
        expect(result).toEqual({
          required: { message: 'This field is required' }
        });
      });
    });

    it('should return null for valid non-empty strings', () => {
      const validValues = [
        'John Doe',
        'test@example.com',
        'Hello world',
        '123',
        '  valid with spaces  ', // has content beyond whitespace
        'a', // single character
        '0' // zero as string
      ];

      validValues.forEach(value => {
        const control = new FormControl(value);
        const result = ContactFormValidators.required(control);
        expect(result).toBeNull();
      });
    });

    it('should handle numbers correctly', () => {
      const control1 = new FormControl(123);
      expect(ContactFormValidators.required(control1)).toBeNull();

      const control2 = new FormControl(0);
      expect(ContactFormValidators.required(control2)).toBeNull();

      const control3 = new FormControl(-1);
      expect(ContactFormValidators.required(control3)).toBeNull();
    });

    it('should handle boolean values correctly', () => {
      const control1 = new FormControl(true);
      expect(ContactFormValidators.required(control1)).toBeNull();

      const control2 = new FormControl(false);
      expect(ContactFormValidators.required(control2)).toBeNull();
    });

    it('should handle objects and arrays correctly', () => {
      const control1 = new FormControl({});
      expect(ContactFormValidators.required(control1)).toBeNull();

      const control2 = new FormControl([]);
      expect(ContactFormValidators.required(control2)).toBeNull();

      const control3 = new FormControl({ name: 'test' });
      expect(ContactFormValidators.required(control3)).toBeNull();
    });
  });

  describe('validator integration scenarios', () => {
    it('should work correctly when multiple validators are applied', () => {
      // Test email with both required and email validators
      const control = new FormControl('');

      // Required should catch empty
      expect(ContactFormValidators.required(control)).toEqual({
        required: { message: 'This field is required' }
      });

      // Email should ignore empty (let required handle it)
      expect(ContactFormValidators.email(control)).toBeNull();
    });

    it('should validate complex form scenarios', () => {
      // Test message field with both required and maxLength
      const messageControl1 = new FormControl('');
      expect(ContactFormValidators.required(messageControl1)).toEqual({
        required: { message: 'This field is required' }
      });
      expect(ContactFormValidators.maxLength(500)(messageControl1)).toBeNull();

      // Valid message
      const messageControl2 = new FormControl('Valid message');
      expect(ContactFormValidators.required(messageControl2)).toBeNull();
      expect(ContactFormValidators.maxLength(500)(messageControl2)).toBeNull();

      // Too long message
      const longMessage = 'a'.repeat(501);
      const messageControl3 = new FormControl(longMessage);
      expect(ContactFormValidators.required(messageControl3)).toBeNull();
      expect(ContactFormValidators.maxLength(500)(messageControl3)).toEqual({
        maxlength: {
          actualLength: 501,
          requiredLength: 500,
          message: 'Message must be no more than 500 characters (currently 501)'
        }
      });
    });
  });
});