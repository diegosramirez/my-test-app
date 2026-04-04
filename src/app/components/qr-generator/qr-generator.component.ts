import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { QrCodeService } from '../../services/qr-code.service';

export interface QrGeneratorState {
  inputText: string;
  qrCodeDataUrl: string | null;
  errorMessage: string | null;
  isGenerating: boolean;
}

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="qr-generator-container">
      <h1>QR Code Generator</h1>

      <div class="input-section">
        <label for="textInput" class="input-label">
          Enter text to generate QR code
        </label>
        <textarea
          id="textInput"
          [formControl]="textControl"
          class="text-input"
          placeholder="Enter text to generate QR code"
          rows="4"
          maxlength="2000"
          [attr.aria-describedby]="errorMessage ? 'error-message' : 'character-counter'"
          [attr.aria-invalid]="!!errorMessage"
        ></textarea>

        <div class="character-counter" id="character-counter">
          <span [ngClass]="getCharacterCountClass()">
            {{ getCharacterCount() }}/2000 characters
          </span>
        </div>
      </div>

      <div class="error-section" *ngIf="errorMessage" id="error-message" role="alert">
        {{ errorMessage }}
      </div>

      <div class="loading-section" *ngIf="isGenerating">
        <div class="loading-spinner" aria-label="Generating QR code"></div>
        <p>Generating QR code...</p>
      </div>

      <div class="qr-section" *ngIf="qrCodeDataUrl && !isGenerating">
        <img
          [src]="qrCodeDataUrl"
          [alt]="getQrCodeAltText()"
          class="qr-code-image"
          [style.width.px]="getQrCodeSize()"
          [style.height.px]="getQrCodeSize()"
        />

        <button
          type="button"
          class="download-btn"
          (click)="downloadQrCode()"
          aria-label="Download QR code as PNG file"
        >
          Download QR Code
        </button>
      </div>

      <div class="sample-section" *ngIf="!textControl.value && !isGenerating && !qrCodeDataUrl">
        <p class="sample-text">Enter text above to generate your QR code</p>
      </div>
    </div>
  `,
  styles: [`
    .qr-generator-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 2rem;
    }

    .input-section {
      margin-bottom: 1.5rem;
    }

    .input-label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #555;
    }

    .text-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .text-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .text-input[aria-invalid="true"] {
      border-color: #dc3545;
    }

    .character-counter {
      text-align: right;
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }

    .char-count-normal {
      color: #28a745;
    }

    .char-count-warning {
      color: #ffc107;
      font-weight: 600;
    }

    .char-count-danger {
      color: #dc3545;
      font-weight: 600;
    }

    .error-section {
      background-color: #f8d7da;
      color: #721c24;
      padding: 0.75rem 1rem;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }

    .loading-section {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .qr-section {
      text-align: center;
      padding: 2rem 0;
    }

    .qr-code-image {
      display: block;
      margin: 0 auto 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .download-btn {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .download-btn:hover {
      background-color: #0056b3;
    }

    .download-btn:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5);
    }

    .sample-section {
      text-align: center;
      padding: 2rem 0;
      color: #666;
    }

    .sample-text {
      font-style: italic;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .qr-generator-container {
        padding: 1rem;
      }

      .qr-code-image {
        max-width: 200px;
        max-height: 200px;
      }

      .text-input {
        font-size: 16px; /* Prevent zoom on iOS */
      }
    }
  `]
})
export class QrGeneratorComponent implements OnInit, OnDestroy {
  @Input() initialText?: string;
  @Output() qrGenerated = new EventEmitter<string>();
  @Output() generationError = new EventEmitter<string>();

  textControl = new FormControl('', [Validators.maxLength(2000)]);

  qrCodeDataUrl: string | null = null;
  errorMessage: string | null = null;
  isGenerating = false;

  private destroy$ = new Subject<void>();
  private startTime = 0;

  constructor(private qrCodeService: QrCodeService) {}

  ngOnInit(): void {
    this.emitLoadEvent();

    if (this.initialText) {
      this.textControl.setValue(this.initialText);
    }

    this.setupTextInputSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Data URLs from QRCode.toDataURL() are automatically garbage collected
    this.qrCodeDataUrl = null;
  }

  private setupTextInputSubscription(): void {
    this.textControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((text: string | null) => {
          this.clearError();

          if (!text || text.trim().length === 0) {
            this.clearQrCode();
            return of(null);
          }

          const validation = this.qrCodeService.validateInput(text);
          if (!validation.isValid) {
            this.setError(validation.error!);
            this.emitGenerationError(validation.error!, text.length);
            return of(null);
          }

          this.isGenerating = true;
          this.startTime = performance.now();

          const options = this.getQrGenerationOptions();

          return this.qrCodeService.generateQrCode(text, options).pipe(
            catchError((error) => {
              this.setError('Failed to generate QR code. Please try again.');
              this.emitGenerationError('generation_failed', text.length);
              return of(null);
            })
          );
        })
      )
      .subscribe((dataUrl: string | null) => {
        this.isGenerating = false;

        if (dataUrl) {
          this.qrCodeDataUrl = dataUrl;
          this.emitQrGenerated(dataUrl);
        }
      });
  }

  private getQrGenerationOptions() {
    const isMobile = window.innerWidth <= 768;
    return {
      width: isMobile ? 200 : 256,
      margin: 2
    };
  }

  getCharacterCount(): number {
    return this.textControl.value?.length || 0;
  }

  getCharacterCountClass(): string {
    const count = this.getCharacterCount();

    if (count >= 2000) {
      return 'char-count-danger';
    } else if (count >= 1800) {
      return 'char-count-warning';
    }
    return 'char-count-normal';
  }

  getQrCodeSize(): number {
    return window.innerWidth <= 768 ? 200 : 256;
  }

  getQrCodeAltText(): string {
    const text = this.textControl.value || '';
    return `QR code containing: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
  }

  downloadQrCode(): void {
    if (!this.qrCodeDataUrl) return;

    try {
      const text = this.textControl.value || 'qrcode';
      const filename = text.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();

      this.qrCodeService.downloadQrCode(this.qrCodeDataUrl, filename);
      this.emitDownloadEvent();
    } catch (error) {
      this.setError('Failed to download QR code. Please try again.');
    }
  }

  private clearQrCode(): void {
    // Data URLs from QRCode.toDataURL() are automatically garbage collected
    this.qrCodeDataUrl = null;
  }

  private clearError(): void {
    this.errorMessage = null;
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.clearQrCode();
  }

  // Event emission methods for tracking
  private emitLoadEvent(): void {
    this.emitTrackingEvent('qr_generator_loaded', {
      timestamp: new Date().toISOString(),
      load_time: performance.now()
    });
  }

  private emitQrGenerated(dataUrl: string): void {
    const generationTime = performance.now() - this.startTime;
    const textLength = this.textControl.value?.length || 0;

    this.qrGenerated.emit(dataUrl);
    this.emitTrackingEvent('qr_code_generated', {
      text_length: textLength,
      generation_time: generationTime,
      success: true
    });
  }

  private emitGenerationError(errorType: string, characterCount: number): void {
    this.generationError.emit(errorType);
    this.emitTrackingEvent('qr_generation_error', {
      error_type: errorType,
      input_text: this.textControl.value?.substring(0, 100),
      character_count: characterCount
    });
  }

  private emitDownloadEvent(): void {
    const textLength = this.textControl.value?.length || 0;
    this.emitTrackingEvent('qr_code_downloaded', {
      text_length: textLength,
      timestamp: new Date().toISOString()
    });
  }

  private emitTrackingEvent(eventName: string, properties: any): void {
    // In a real app, this would integrate with your analytics service
    console.log(`[Analytics] ${eventName}:`, properties);
  }
}