import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import * as QRCode from 'qrcode';

export interface QrGenerationOptions {
  width: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QrCodeService {
  private readonly defaultOptions: QrGenerationOptions = {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  generateQrCode(text: string, customOptions?: Partial<QrGenerationOptions>): Observable<string> {
    const options = { ...this.defaultOptions, ...customOptions };

    return from(QRCode.toDataURL(text, options));
  }

  validateInput(text: string): { isValid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { isValid: false, error: 'Text cannot be empty' };
    }

    if (text.length > 2000) {
      return { isValid: false, error: 'Text cannot exceed 2000 characters' };
    }

    return { isValid: true };
  }

  downloadQrCode(dataUrl: string, filename: string = 'qrcode'): void {
    try {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();

      // Cleanup
      setTimeout(() => {
        link.remove();
      }, 100);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      throw new Error('Download failed');
    }
  }
}