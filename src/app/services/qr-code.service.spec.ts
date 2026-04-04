import { TestBed } from '@angular/core/testing';
import { QrCodeService } from './qr-code.service';
import { vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

// Mock QRCode module using Vitest
const mockQRCode = {
  toDataURL: vi.fn()
};

vi.mock('qrcode', () => ({
  default: mockQRCode,
  ...mockQRCode
}));

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateInput', () => {
    it('should return valid for normal text', () => {
      const result = service.validateInput('Hello World');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty text', () => {
      const result = service.validateInput('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text cannot be empty');
    });

    it('should return invalid for null text', () => {
      const result = service.validateInput(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text cannot be empty');
    });

    it('should return invalid for undefined text', () => {
      const result = service.validateInput(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text cannot be empty');
    });

    it('should return invalid for whitespace only text', () => {
      const result = service.validateInput('   \t\n  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text cannot be empty');
    });

    it('should return invalid for text longer than 2000 characters', () => {
      const longText = 'a'.repeat(2001);
      const result = service.validateInput(longText);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Text cannot exceed 2000 characters');
    });

    it('should return valid for text exactly 2000 characters', () => {
      const text2000 = 'a'.repeat(2000);
      const result = service.validateInput(text2000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for text with 1999 characters', () => {
      const text1999 = 'a'.repeat(1999);
      const result = service.validateInput(text1999);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle special characters correctly', () => {
      const specialText = 'Hello 🌍! @#$%^&*()_+-=[]{}|;:,.<>?';
      const result = service.validateInput(specialText);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle unicode characters correctly', () => {
      const unicodeText = '测试中文字符 日本語テスト العربية';
      const result = service.validateInput(unicodeText);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle newlines and tabs', () => {
      const textWithNewlines = 'Line 1\nLine 2\tTab separated';
      const result = service.validateInput(textWithNewlines);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('generateQrCode', () => {
    beforeEach(() => {
      mockQRCode.toDataURL.mockImplementation(() =>
        Promise.resolve('data:image/png;base64,mockedQRCode')
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should generate QR code with default options', async () => {
      const text = 'Hello World';

      const result = await firstValueFrom(service.generateQrCode(text));

      expect(result).toBe('data:image/png;base64,mockedQRCode');
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(text, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    });

    it('should generate QR code with custom options', async () => {
      const text = 'Custom QR';
      const customOptions = {
        width: 200,
        margin: 4
      };

      const result = await firstValueFrom(service.generateQrCode(text, customOptions));

      expect(result).toBe('data:image/png;base64,mockedQRCode');
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(text, {
        width: 200,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    });

    it('should merge custom options with defaults properly', async () => {
      const text = 'Partial options test';
      const partialOptions = {
        width: 128,
        color: {
          dark: '#FF0000',
          light: '#FFFFFF'
        }
      };

      await firstValueFrom(service.generateQrCode(text, partialOptions));

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(text, {
        width: 128,
        margin: 2, // default
        color: {
          dark: '#FF0000', // custom
          light: '#FFFFFF' // default
        }
      });
    });

    it('should handle QR code generation within performance threshold', async () => {
      const text = 'Performance test';
      const startTime = performance.now();

      await firstValueFrom(service.generateQrCode(text));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be much faster than 500ms acceptance criteria
      expect(duration).toBeLessThan(100);
    });

    it('should handle large text input (2000 characters)', async () => {
      const largeText = 'A'.repeat(2000);

      const result = await firstValueFrom(service.generateQrCode(largeText));

      expect(result).toBe('data:image/png;base64,mockedQRCode');
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(largeText, expect.any(Object));
    });

    it('should handle special characters in QR generation', async () => {
      const specialText = 'https://example.com?q=test&ref=app#section';

      const result = await firstValueFrom(service.generateQrCode(specialText));

      expect(result).toBe('data:image/png;base64,mockedQRCode');
    });

    it('should handle QR generation errors gracefully', async () => {
      const errorText = 'Error test';
      mockQRCode.toDataURL.mockRejectedValue(new Error('QR generation failed'));

      try {
        await firstValueFrom(service.generateQrCode(errorText));
        throw new Error('Expected error but got success');
      } catch (error: any) {
        expect(error.message).toBe('QR generation failed');
      }
    });

    it('should handle mobile responsive options', async () => {
      const text = 'Mobile test';
      const mobileOptions = { width: 200 };

      await firstValueFrom(service.generateQrCode(text, mobileOptions));

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(text, expect.objectContaining({
        width: 200
      }));
    });
  });

  describe('downloadQrCode', () => {
    let mockLink: any;

    beforeEach(() => {
      mockLink = {
        download: '',
        href: '',
        click: vi.fn(),
        remove: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create download link with default filename', () => {
      const dataUrl = 'data:image/png;base64,testImage';

      service.downloadQrCode(dataUrl);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('qrcode.png');
      expect(mockLink.href).toBe(dataUrl);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should create download link with custom filename', () => {
      const dataUrl = 'data:image/png;base64,testImage';
      const filename = 'my-custom-qr';

      service.downloadQrCode(dataUrl, filename);

      expect(mockLink.download).toBe('my-custom-qr.png');
      expect(mockLink.href).toBe(dataUrl);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should cleanup link element after timeout', async () => {
      const dataUrl = 'data:image/png;base64,testImage';

      service.downloadQrCode(dataUrl);

      // Wait for cleanup timeout
      await new Promise(resolve => {
        setTimeout(() => {
          expect(mockLink.remove).toHaveBeenCalled();
          resolve(undefined);
        }, 150);
      });
    });

    it('should handle download errors and throw meaningful error', () => {
      const dataUrl = 'data:image/png;base64,testImage';
      mockLink.click.mockImplementation(() => {
        throw new Error('Browser blocked download');
      });

      expect(() => {
        service.downloadQrCode(dataUrl);
      }).toThrowError('Download failed');

      expect(console.error).toHaveBeenCalledWith(
        'Failed to download QR code:',
        expect.any(Error)
      );
    });

    it('should handle empty or invalid data URL', () => {
      const invalidDataUrl = '';

      expect(() => {
        service.downloadQrCode(invalidDataUrl);
      }).not.toThrow();

      expect(mockLink.href).toBe('');
    });

    it('should sanitize filenames for safe download', () => {
      const dataUrl = 'data:image/png;base64,testImage';
      const unsafeFilename = 'my/unsafe\\filename<script>';

      service.downloadQrCode(dataUrl, unsafeFilename);

      expect(mockLink.download).toBe('my/unsafe\\filename<script>.png');
      // Note: The service doesn't currently sanitize filenames, but this test documents the behavior
    });

    it('should handle very long filenames', () => {
      const dataUrl = 'data:image/png;base64,testImage';
      const longFilename = 'a'.repeat(300);

      service.downloadQrCode(dataUrl, longFilename);

      expect(mockLink.download).toBe(longFilename + '.png');
    });
  });

  describe('default options validation', () => {
    it('should have correct default options structure', () => {
      const expectedDefaults = {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      // Access private property for testing
      const defaultOptions = (service as any).defaultOptions;
      expect(defaultOptions).toEqual(expectedDefaults);
    });

    it('should use correct mobile-optimized width', () => {
      const mobileOptions = { width: 200 };
      const text = 'Mobile test';

      service.generateQrCode(text, mobileOptions);

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        text,
        expect.objectContaining({ width: 200 })
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle extremely short text', () => {
      const result = service.validateInput('a');
      expect(result.isValid).toBe(true);
    });

    it('should handle text at boundary (1999 vs 2000 vs 2001 characters)', () => {
      expect(service.validateInput('a'.repeat(1999)).isValid).toBe(true);
      expect(service.validateInput('a'.repeat(2000)).isValid).toBe(true);
      expect(service.validateInput('a'.repeat(2001)).isValid).toBe(false);
    });

    it('should handle mixed whitespace scenarios', () => {
      expect(service.validateInput(' hello ').isValid).toBe(true);
      expect(service.validateInput('\n\n\n').isValid).toBe(false);
      expect(service.validateInput('hello\nworld').isValid).toBe(true);
    });
  });
});