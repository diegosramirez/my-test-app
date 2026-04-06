import { GalleryImage, ResponsiveBreakpoints } from '../types/gallery.types';

export class ImageUtils {
  /**
   * Validates if a URL is a valid image URL
   */
  static isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const validProtocols = ['http:', 'https:', 'data:'];
      return validProtocols.includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Calculates aspect ratio from width and height
   */
  static calculateAspectRatio(width: number, height: number): string {
    const gcd = this.getGreatestCommonDivisor(width, height);
    return `${width / gcd}:${height / gcd}`;
  }

  /**
   * Parses aspect ratio string to decimal
   */
  static parseAspectRatio(aspectRatio: string): number {
    const [width, height] = aspectRatio.split(':').map(Number);
    return height / width;
  }

  /**
   * Determines number of columns based on screen width
   */
  static getColumnsForWidth(width: number, breakpoints: ResponsiveBreakpoints): number {
    if (width >= breakpoints.large) return 4;
    if (width >= breakpoints.desktop) return 3;
    if (width >= breakpoints.tablet) return 2;
    return 1;
  }

  /**
   * Checks if browser supports WebP format
   */
  static supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Creates optimized image URL based on device capabilities
   */
  static getOptimizedImageUrl(image: GalleryImage, isFullSize: boolean = false, supportsWebP: boolean = false): string {
    const baseUrl = isFullSize ? image.fullSizeUrl : image.thumbnailUrl;

    // If URL already has format parameter or is data URL, return as is
    if (baseUrl.includes('format=') || baseUrl.startsWith('data:')) {
      return baseUrl;
    }

    // Add WebP format if supported
    if (supportsWebP && !baseUrl.includes('.webp')) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}format=webp`;
    }

    return baseUrl;
  }

  /**
   * Validates gallery image object
   */
  static isValidGalleryImage(image: any): image is GalleryImage {
    return (
      typeof image === 'object' &&
      image !== null &&
      typeof image.id === 'string' &&
      typeof image.thumbnailUrl === 'string' &&
      typeof image.fullSizeUrl === 'string' &&
      typeof image.alt === 'string' &&
      this.isValidImageUrl(image.thumbnailUrl) &&
      this.isValidImageUrl(image.fullSizeUrl)
    );
  }

  /**
   * Generates placeholder image data URL
   */
  static generatePlaceholder(width: number, height: number, backgroundColor: string = '#f0f0f0'): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Add loading indicator
      ctx.fillStyle = '#ccc';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', width / 2, height / 2);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Calculates greatest common divisor for aspect ratio calculation
   */
  private static getGreatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.getGreatestCommonDivisor(b, a % b);
  }

  /**
   * Creates error placeholder image
   */
  static generateErrorPlaceholder(width: number, height: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Red background for error state
      ctx.fillStyle = '#ffebee';
      ctx.fillRect(0, 0, width, height);

      // Error icon (simple X)
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.3, height * 0.3);
      ctx.lineTo(width * 0.7, height * 0.7);
      ctx.moveTo(width * 0.7, height * 0.3);
      ctx.lineTo(width * 0.3, height * 0.7);
      ctx.stroke();

      // Error text
      ctx.fillStyle = '#f44336';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Failed to load', width / 2, height * 0.8);
    }

    return canvas.toDataURL('image/png');
  }
}