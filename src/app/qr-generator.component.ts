import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, Subject, switchMap, takeUntil } from 'rxjs';
import { from } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-generator-container">
      <div class="input-section">
        <h1>QR Code Generator</h1>
        <div class="input-wrapper">
          <textarea
            [formControl]="textControl"
            placeholder="Enter text to generate QR code"
            class="text-input"
            [class.error]="textControl.invalid && textControl.touched"
            maxlength="2000"
          ></textarea>
          <div class="character-counter" [class.warning]="characterCount > 1800">
            {{ characterCount }}/2000 characters
          </div>
          <div class="error-message" *ngIf="textControl.invalid && textControl.touched">
            Maximum 2000 characters allowed
          </div>
        </div>
      </div>

      <div class="qr-section">
        <div *ngIf="isLoading" class="loading-state">
          Generating QR code...
        </div>

        <div *ngIf="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>

        <div *ngIf="qrCodeDataUrl && !isLoading && !errorMessage"
             class="qr-display">
          <img
            [src]="qrCodeDataUrl"
            alt="Generated QR code"
            class="qr-image"
            [class.mobile]="isMobile">

          <div class="action-buttons">
            <button
              (click)="copyQRCode()"
              class="action-btn copy-btn"
              [disabled]="isLoading">
              {{ copyButtonText }}
            </button>
            <button
              (click)="downloadQRCode()"
              class="action-btn download-btn"
              [disabled]="isLoading">
              Download PNG
            </button>
          </div>
        </div>

        <div *ngIf="!qrCodeDataUrl && !isLoading && !errorMessage && textControl.value"
             class="empty-state">
          Enter text above to generate QR code
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qr-generator-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      font-size: 2rem;
    }

    .input-section {
      margin-bottom: 30px;
    }

    .input-wrapper {
      position: relative;
    }

    .text-input {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      resize: vertical;
      font-family: inherit;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .text-input:focus {
      outline: none;
      border-color: #007bff;
    }

    .text-input.error {
      border-color: #dc3545;
    }

    .character-counter {
      text-align: right;
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }

    .character-counter.warning {
      color: #ff6b35;
      font-weight: bold;
    }

    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }

    .qr-section {
      text-align: center;
    }

    .loading-state {
      color: #666;
      font-style: italic;
      padding: 20px;
    }

    .error-state {
      color: #dc3545;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 12px;
      margin: 20px 0;
    }

    .qr-display {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .qr-image {
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      width: 300px;
      height: 300px;
    }

    .qr-image.mobile {
      width: 250px;
      height: 250px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .copy-btn {
      background: #007bff;
      color: white;
    }

    .copy-btn:hover:not(:disabled) {
      background: #0056b3;
    }

    .copy-btn.success {
      background: #28a745;
    }

    .download-btn {
      background: #28a745;
      color: white;
    }

    .download-btn:hover:not(:disabled) {
      background: #1e7e34;
    }

    .empty-state {
      color: #666;
      font-style: italic;
      padding: 40px 20px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      margin: 20px 0;
    }

    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .qr-generator-container {
        padding: 15px;
      }

      h1 {
        font-size: 1.5rem;
        margin-bottom: 20px;
      }

      .text-input {
        font-size: 16px; /* Prevent zoom on iOS */
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }

      .action-btn {
        width: 200px;
      }
    }

    @media (max-width: 480px) {
      .qr-image {
        width: 250px !important;
        height: 250px !important;
      }
    }
  `],
  animations: []
})
export class QrGeneratorComponent implements OnDestroy {
  textControl = new FormControl('', [Validators.maxLength(2000)]);
  qrCodeDataUrl: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  copyButtonText = 'Copy QR Code';
  isMobile = false;

  private destroy$ = new Subject<void>();
  private readonly CHARACTER_LIMIT = 2000;
  private resizeListener?: () => void;

  constructor(private cdr: ChangeDetectorRef) {
    this.checkMobileDevice();
    this.setupTextInputListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  get characterCount(): number {
    return this.textControl.value?.length || 0;
  }

  private checkMobileDevice(): void {
    this.isMobile = window.innerWidth <= 768;
    this.resizeListener = () => {
      this.isMobile = window.innerWidth <= 768;
      this.cdr.markForCheck();
    };
    window.addEventListener('resize', this.resizeListener);
  }

  private setupTextInputListener(): void {
    this.textControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(text => {
        if (!text || text.trim() === '') {
          this.clearQRCode();
        } else if (text.length <= this.CHARACTER_LIMIT) {
          this.generateQRCode(text);
        }
      });
  }

  private clearQRCode(): void {
    this.qrCodeDataUrl = null;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  private generateQRCode(text: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const startTime = Date.now();
    const qrWidth = this.isMobile ? 250 : 300;

    from(QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      width: qrWidth,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (dataUrl) => {
        const generationTime = Date.now() - startTime;

        if (generationTime > 500) {
          console.warn(`QR generation took ${generationTime}ms, exceeding 500ms target`);
        }

        this.qrCodeDataUrl = dataUrl;
        this.isLoading = false;
        this.errorMessage = null;
        this.cdr.markForCheck();

        // Track generation event
        this.trackEvent('qr_code_generated', {
          character_count: text.length,
          generation_time: generationTime
        });
      },
      error: (error) => {
        console.error('QR Code generation failed:', error);
        this.errorMessage = 'Failed to generate QR code. Please try again.';
        this.qrCodeDataUrl = null;
        this.isLoading = false;
        this.cdr.markForCheck();

        // Track error event
        this.trackEvent('qr_generation_error', {
          error_type: error.message || 'unknown',
          character_count: text.length
        });
      }
    });
  }

  async copyQRCode(): Promise<void> {
    if (!this.qrCodeDataUrl) return;

    try {
      // Convert base64 data URL to blob
      const response = await fetch(this.qrCodeDataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch QR code data: ${response.statusText}`);
      }
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);

      this.copyButtonText = 'Copied!';
      this.cdr.markForCheck();

      // Reset button text after 2 seconds
      setTimeout(() => {
        this.copyButtonText = 'Copy QR Code';
        this.cdr.markForCheck();
      }, 2000);

      // Track copy event
      this.trackEvent('qr_code_copied', {
        character_count: this.textControl.value?.length || 0,
        success: true
      });
    } catch (error) {
      console.error('Failed to copy QR code:', error);
      this.copyButtonText = 'Copy Failed';
      this.cdr.markForCheck();

      // Reset button text after 2 seconds
      setTimeout(() => {
        this.copyButtonText = 'Copy QR Code';
        this.cdr.markForCheck();
      }, 2000);

      // Track copy failure
      this.trackEvent('qr_code_copied', {
        character_count: this.textControl.value?.length || 0,
        success: false
      });
    }
  }

  downloadQRCode(): void {
    if (!this.qrCodeDataUrl) return;

    try {
      const link = document.createElement('a');
      link.href = this.qrCodeDataUrl;

      // Generate meaningful filename
      const text = this.textControl.value || '';
      const truncatedText = text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `qr-code-${truncatedText}-${timestamp}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track download event
      this.trackEvent('qr_code_downloaded', {
        character_count: text.length,
        file_format: 'png'
      });
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  }

  private trackEvent(eventName: string, properties: any): void {
    // In a real application, this would send to your analytics service
    console.log('Analytics Event:', {
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      }
    });
  }
}