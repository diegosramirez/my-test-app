import { ImageUtils } from './image.utils';
import { GalleryImage, ResponsiveBreakpoints } from '../types/gallery.types';

// Mock canvas and image for browser APIs
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  height = 0;

  set src(value: string) {
    // Simulate WebP test image
    if (value.includes('data:image/webp')) {
      setTimeout(() => {
        this.height = 2; // WebP test should return height of 2
        this.onload?.();
      }, 0);
    }
  }
}

class MockCanvas {
  width = 0;
  height = 0;

  getContext() {
    return {
      fillStyle: '',
      font: '',
      textAlign: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    };
  }

  toDataURL() {
    return 'data:image/png;base64,mock';
  }
}

// Setup global mocks
global.Image = MockImage as any;
global.HTMLCanvasElement = MockCanvas as any;
Object.defineProperty(document, 'createElement', {
  value: (tagName: string) => {
    if (tagName === 'canvas') {
      return new MockCanvas();
    }
    return {};
  }
});

describe('ImageUtils', () => {
  describe('isValidImageUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(ImageUtils.isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(ImageUtils.isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should return true for data URLs', () => {
      expect(ImageUtils.isValidImageUrl('data:image/png;base64,abc123')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(ImageUtils.isValidImageUrl('invalid-url')).toBe(false);
      expect(ImageUtils.isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
      expect(ImageUtils.isValidImageUrl('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(ImageUtils.isValidImageUrl(null as any)).toBe(false);
      expect(ImageUtils.isValidImageUrl(undefined as any)).toBe(false);
    });
  });

  describe('calculateAspectRatio', () => {
    it('should calculate correct aspect ratio for common ratios', () => {
      expect(ImageUtils.calculateAspectRatio(16, 9)).toBe('16:9');
      expect(ImageUtils.calculateAspectRatio(4, 3)).toBe('4:3');
      expect(ImageUtils.calculateAspectRatio(1, 1)).toBe('1:1');
    });

    it('should simplify aspect ratios', () => {
      expect(ImageUtils.calculateAspectRatio(32, 18)).toBe('16:9');
      expect(ImageUtils.calculateAspectRatio(800, 600)).toBe('4:3');
      expect(ImageUtils.calculateAspectRatio(1920, 1080)).toBe('16:9');
    });

    it('should handle edge cases', () => {
      expect(ImageUtils.calculateAspectRatio(1, 0)).toBe('1:0');
      expect(ImageUtils.calculateAspectRatio(0, 1)).toBe('0:1');
    });
  });

  describe('parseAspectRatio', () => {
    it('should parse aspect ratio strings correctly', () => {
      expect(ImageUtils.parseAspectRatio('16:9')).toBeCloseTo(0.5625);
      expect(ImageUtils.parseAspectRatio('4:3')).toBeCloseTo(0.75);
      expect(ImageUtils.parseAspectRatio('1:1')).toBe(1);
    });

    it('should handle decimal ratios', () => {
      expect(ImageUtils.parseAspectRatio('1.5:1')).toBeCloseTo(0.6667, 4);
    });
  });

  describe('getColumnsForWidth', () => {
    const mockBreakpoints: ResponsiveBreakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1200,
      large: 1200
    };

    it('should return 1 column for mobile widths', () => {
      expect(ImageUtils.getColumnsForWidth(320, mockBreakpoints)).toBe(1);
      expect(ImageUtils.getColumnsForWidth(479, mockBreakpoints)).toBe(1);
    });

    it('should return 2 columns for tablet widths', () => {
      expect(ImageUtils.getColumnsForWidth(480, mockBreakpoints)).toBe(2);
      expect(ImageUtils.getColumnsForWidth(767, mockBreakpoints)).toBe(2);
    });

    it('should return 3 columns for desktop widths', () => {
      expect(ImageUtils.getColumnsForWidth(768, mockBreakpoints)).toBe(3);
      expect(ImageUtils.getColumnsForWidth(1199, mockBreakpoints)).toBe(3);
    });

    it('should return 4 columns for large widths', () => {
      expect(ImageUtils.getColumnsForWidth(1200, mockBreakpoints)).toBe(4);
      expect(ImageUtils.getColumnsForWidth(2000, mockBreakpoints)).toBe(4);
    });
  });

  describe('supportsWebP', () => {
    it('should return a promise that resolves to boolean', async () => {
      const result = await ImageUtils.supportsWebP();
      expect(typeof result).toBe('boolean');
    });

    it('should resolve to true when WebP is supported', async () => {
      const result = await ImageUtils.supportsWebP();
      expect(result).toBe(true); // Our mock returns height 2 for WebP test
    });
  });

  describe('getOptimizedImageUrl', () => {
    const mockImage: GalleryImage = {
      id: 'test-1',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      fullSizeUrl: 'https://example.com/full.jpg',
      alt: 'Test image'
    };

    it('should return thumbnail URL when not full size', () => {
      const result = ImageUtils.getOptimizedImageUrl(mockImage, false, false);
      expect(result).toBe(mockImage.thumbnailUrl);
    });

    it('should return full size URL when requested', () => {
      const result = ImageUtils.getOptimizedImageUrl(mockImage, true, false);
      expect(result).toBe(mockImage.fullSizeUrl);
    });

    it('should add WebP format parameter when supported', () => {
      const result = ImageUtils.getOptimizedImageUrl(mockImage, false, true);
      expect(result).toBe('https://example.com/thumb.jpg?format=webp');
    });

    it('should use & separator when URL already has parameters', () => {
      const imageWithParams = {
        ...mockImage,
        thumbnailUrl: 'https://example.com/thumb.jpg?size=200'
      };
      const result = ImageUtils.getOptimizedImageUrl(imageWithParams, false, true);
      expect(result).toBe('https://example.com/thumb.jpg?size=200&format=webp');
    });

    it('should not modify URLs that already have format parameter', () => {
      const imageWithFormat = {
        ...mockImage,
        thumbnailUrl: 'https://example.com/thumb.jpg?format=png'
      };
      const result = ImageUtils.getOptimizedImageUrl(imageWithFormat, false, true);
      expect(result).toBe('https://example.com/thumb.jpg?format=png');
    });

    it('should not modify data URLs', () => {
      const dataImage = {
        ...mockImage,
        thumbnailUrl: 'data:image/png;base64,abc123'
      };
      const result = ImageUtils.getOptimizedImageUrl(dataImage, false, true);
      expect(result).toBe('data:image/png;base64,abc123');
    });

    it('should not add WebP to URLs that are already WebP', () => {
      const webpImage = {
        ...mockImage,
        thumbnailUrl: 'https://example.com/thumb.webp'
      };
      const result = ImageUtils.getOptimizedImageUrl(webpImage, false, true);
      expect(result).toBe('https://example.com/thumb.webp');
    });
  });

  describe('isValidGalleryImage', () => {
    const validImage: GalleryImage = {
      id: 'test-1',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      fullSizeUrl: 'https://example.com/full.jpg',
      alt: 'Test image'
    };

    it('should return true for valid gallery image', () => {
      expect(ImageUtils.isValidGalleryImage(validImage)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(ImageUtils.isValidGalleryImage(null)).toBe(false);
      expect(ImageUtils.isValidGalleryImage(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(ImageUtils.isValidGalleryImage({ ...validImage, id: '' })).toBe(false);
      expect(ImageUtils.isValidGalleryImage({ ...validImage, thumbnailUrl: '' })).toBe(false);
      expect(ImageUtils.isValidGalleryImage({ ...validImage, fullSizeUrl: '' })).toBe(false);
      expect(ImageUtils.isValidGalleryImage({ ...validImage, alt: '' })).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(ImageUtils.isValidGalleryImage({
        ...validImage,
        thumbnailUrl: 'invalid-url'
      })).toBe(false);

      expect(ImageUtils.isValidGalleryImage({
        ...validImage,
        fullSizeUrl: 'invalid-url'
      })).toBe(false);
    });

    it('should return false for non-string field types', () => {
      expect(ImageUtils.isValidGalleryImage({
        ...validImage,
        id: 123 as any
      })).toBe(false);

      expect(ImageUtils.isValidGalleryImage({
        ...validImage,
        alt: null as any
      })).toBe(false);
    });

    it('should return true with optional fields', () => {
      const imageWithOptionals = {
        ...validImage,
        caption: 'Test caption',
        width: 800,
        height: 600,
        loadingState: 'loaded' as const
      };
      expect(ImageUtils.isValidGalleryImage(imageWithOptionals)).toBe(true);
    });
  });

  describe('generatePlaceholder', () => {
    it('should generate a data URL placeholder', () => {
      const placeholder = ImageUtils.generatePlaceholder(200, 150);
      expect(placeholder).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle custom background color', () => {
      const placeholder = ImageUtils.generatePlaceholder(200, 150, '#ff0000');
      expect(placeholder).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle different dimensions', () => {
      const placeholder1 = ImageUtils.generatePlaceholder(100, 100);
      const placeholder2 = ImageUtils.generatePlaceholder(300, 200);

      expect(placeholder1).toMatch(/^data:image\/png;base64,/);
      expect(placeholder2).toMatch(/^data:image\/png;base64,/);
      expect(placeholder1).not.toBe(placeholder2);
    });
  });

  describe('generateErrorPlaceholder', () => {
    it('should generate an error placeholder data URL', () => {
      const placeholder = ImageUtils.generateErrorPlaceholder(200, 150);
      expect(placeholder).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle different dimensions for error state', () => {
      const placeholder1 = ImageUtils.generateErrorPlaceholder(100, 100);
      const placeholder2 = ImageUtils.generateErrorPlaceholder(300, 200);

      expect(placeholder1).toMatch(/^data:image\/png;base64,/);
      expect(placeholder2).toMatch(/^data:image\/png;base64,/);
      expect(placeholder1).not.toBe(placeholder2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle zero dimensions in aspect ratio calculation', () => {
      expect(() => ImageUtils.calculateAspectRatio(0, 0)).not.toThrow();
    });

    it('should handle negative dimensions gracefully', () => {
      expect(() => ImageUtils.calculateAspectRatio(-10, 5)).not.toThrow();
    });

    it('should handle malformed aspect ratio strings', () => {
      expect(() => ImageUtils.parseAspectRatio('invalid')).not.toThrow();
      expect(ImageUtils.parseAspectRatio('invalid')).toBeNaN();
    });

    it('should handle empty aspect ratio strings', () => {
      expect(() => ImageUtils.parseAspectRatio('')).not.toThrow();
    });

    it('should handle canvas context being null', () => {
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue({
        width: 0,
        height: 0,
        getContext: () => null,
        toDataURL: () => 'data:image/png;base64,fallback'
      });

      expect(() => ImageUtils.generatePlaceholder(100, 100)).not.toThrow();

      document.createElement = originalCreateElement;
    });
  });
});