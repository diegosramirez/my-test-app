import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-generator.component.html',
  styleUrls: ['./qr-generator.component.css']
})
export class QrGeneratorComponent implements OnInit, OnDestroy {
  inputText = '';
  qrCodeDataUrl = '';
  isLoading = false;
  errorMessage = '';
  characterLimit = 2048;

  private destroy$ = new Subject<void>();
  private inputSubject$ = new Subject<string>();

  // Sample QR code data
  sampleData = [
    { type: 'URL', value: 'https://example.com', label: 'Website URL' },
    { type: 'WiFi', value: 'WIFI:T:WPA;S:MyNetwork;P:password123;;', label: 'WiFi Network' },
    { type: 'Contact', value: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEMAIL:john@example.com\nEND:VCARD', label: 'Contact Info' }
  ];

  ngOnInit(): void {
    // Set up debounced input handling
    this.inputSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe((text: string) => {
        this.generateQRCode(text);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Note: QRCode.toDataURL() returns data URLs (data:image/png;base64,...)
    // which don't need to be revoked, only blob URLs (blob:...) do
  }

  onInputChange(text: string): void {
    // Enforce character limit with truncation
    if (text.length > this.characterLimit) {
      text = text.substring(0, this.characterLimit);
      this.inputText = text;
    }

    this.clearError();

    if (text.trim() === '') {
      this.qrCodeDataUrl = '';
      this.isLoading = false;
      return;
    }

    this.inputSubject$.next(text);
  }

  private async generateQRCode(text: string): Promise<void> {
    if (!text.trim()) {
      this.qrCodeDataUrl = '';
      return;
    }

    try {
      this.isLoading = true;
      this.clearError();

      const startTime = performance.now();

      // Generate QR code with optimal settings
      const dataUrl = await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 400 // High resolution for responsive scaling
      });

      const endTime = performance.now();
      const generationTime = endTime - startTime;

      // Check if generation time exceeds threshold for user feedback
      if (generationTime > 200) {
        console.warn(`QR generation took ${generationTime.toFixed(1)}ms`);
      }

      this.qrCodeDataUrl = dataUrl;
      this.isLoading = false;

    } catch (error) {
      this.handleGenerationError(error);
    }
  }

  private handleGenerationError(error: any): void {
    this.isLoading = false;
    this.qrCodeDataUrl = '';

    console.error('QR generation failed:', error);

    // Provide specific error guidance based on the error type
    if (this.inputText.length > this.characterLimit) {
      this.errorMessage = 'Try shorter text - maximum 2,048 characters allowed';
    } else if (this.inputText.includes('\0') || this.inputText.includes('\uffff')) {
      this.errorMessage = 'Check for unsupported characters - some control characters are not allowed';
    } else if (error.message && error.message.includes('too large')) {
      this.errorMessage = 'Text is too complex for QR code - try reducing content';
    } else {
      this.errorMessage = 'QR code generation failed - please try again or use different text';
    }
  }

  private clearError(): void {
    this.errorMessage = '';
  }

  get characterCount(): number {
    return this.inputText.length;
  }

  get characterCountDisplay(): string {
    return `${this.characterCount}/${this.characterLimit}`;
  }

  get isAtCharacterLimit(): boolean {
    return this.characterCount >= this.characterLimit;
  }

  useSample(sampleValue: string): void {
    this.inputText = sampleValue;
    this.onInputChange(sampleValue);
  }

  get isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  onQRCodeClick(): void {
    // For mobile tap-to-enlarge functionality
    if (this.qrCodeDataUrl && this.isMobileViewport) {
      // Simple implementation: open in new tab for mobile
      window.open(this.qrCodeDataUrl, '_blank');
    }
  }
}