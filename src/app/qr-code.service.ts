import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

export interface QrCodeState {
  inputText: string;
  qrCodeDataUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  characterCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class QrCodeService {

  async generateQrCode(text: string): Promise<string> {
    try {
      if (text.length > 1000) {
        throw new Error('Text must be 1000 characters or less');
      }

      const options = {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const dataUrl = await QRCode.toDataURL(text, options);
      return dataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateInput(text: string): { isValid: boolean; error?: string } {
    if (text.length > 1000) {
      return { isValid: false, error: 'Text must be 1000 characters or less' };
    }

    return { isValid: true };
  }
}