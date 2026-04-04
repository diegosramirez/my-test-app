import { TestBed } from '@angular/core/testing';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [QrCodeService]
    }).compileComponents();

    service = TestBed.inject(QrCodeService);
  });

  describe('validateInput', () => {
    it('should return valid for normal text', () => {
      const result = service.validateInput('Hello World');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for empty text', () => {
      const result = service.validateInput('');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for text at maximum length (1000 characters)', () => {
      const maxLengthText = 'a'.repeat(1000);
      const result = service.validateInput(maxLengthText);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for text exceeding 1000 characters', () => {
      const oversizedText = 'a'.repeat(1001);
      const result = service.validateInput(oversizedText);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text must be 1000 characters or less');
    });

    it('should return invalid for text much longer than limit', () => {
      const oversizedText = 'a'.repeat(5000);
      const result = service.validateInput(oversizedText);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text must be 1000 characters or less');
    });

    it('should return valid for text with special characters under limit', () => {
      const specialText = '🌍'.repeat(250); // Unicode characters
      const result = service.validateInput(specialText);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle whitespace-only text correctly', () => {
      const whitespaceText = '   \n\t  '.repeat(100); // Under 1000 chars
      const result = service.validateInput(whitespaceText);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate boundary condition at exactly 1000 characters', () => {
      const boundaryText = 'x'.repeat(1000);
      const result = service.validateInput(boundaryText);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(boundaryText.length).toBe(1000);
    });

    it('should validate boundary condition at exactly 1001 characters', () => {
      const boundaryText = 'x'.repeat(1001);
      const result = service.validateInput(boundaryText);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text must be 1000 characters or less');
      expect(boundaryText.length).toBe(1001);
    });
  });

  describe('generateQrCode', () => {
    it('should throw error for text exceeding 1000 characters', async () => {
      const oversizedText = 'a'.repeat(1001);

      await expect(service.generateQrCode(oversizedText)).rejects.toThrow('Text must be 1000 characters or less');
    });

    it('should throw error for text exactly at 1001 characters', async () => {
      const oversizedText = 'a'.repeat(1001);

      await expect(service.generateQrCode(oversizedText)).rejects.toThrow('Text must be 1000 characters or less');
    });

    it('should accept empty text without error validation', async () => {
      // This test verifies that empty text doesn't get rejected by validation
      // The actual QR code generation will be handled by the QRCode library
      // We're just testing that our validation logic allows empty text
      const promise = service.generateQrCode('');

      // The promise might resolve or reject depending on the QRCode library behavior
      // but it shouldn't reject due to our empty text validation
      try {
        await promise;
        // If it resolves, that's fine
        expect(true).toBe(true);
      } catch (error) {
        // If it rejects, it should not be due to our empty text validation
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('Input text cannot be empty');
      }
    });

    it('should accept whitespace text without error validation', async () => {
      // Similar test for whitespace - should not be rejected by our validation
      const promise = service.generateQrCode('   \n\t  ');

      try {
        await promise;
        expect(true).toBe(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('Input text cannot be empty');
      }
    });
  });

  describe('service injection and configuration', () => {
    it('should be created as singleton service', () => {
      const service1 = TestBed.inject(QrCodeService);
      const service2 = TestBed.inject(QrCodeService);

      expect(service1).toBe(service2);
      expect(service).toBeTruthy();
    });
  });
});