import { Component, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { QrCodeService, QrCodeState } from './qr-code.service';

@Component({
  selector: 'app-qr-code-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-code-generator.component.html',
  styleUrl: './qr-code-generator.component.css'
})
export class QrCodeGeneratorComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private inputSubject = new Subject<string>();

  protected state = signal<QrCodeState>({
    inputText: '',
    qrCodeDataUrl: null,
    isGenerating: false,
    error: null,
    characterCount: 0
  });

  protected characterDisplay = computed(() => {
    const count = this.state().characterCount;
    return `${count}/1000 characters`;
  });

  protected isNearLimit = computed(() => {
    return this.state().characterCount > 900;
  });

  protected hasQrCode = computed(() => {
    return !!this.state().qrCodeDataUrl;
  });

  constructor(private qrCodeService: QrCodeService) {
    this.setupInputDebounce();
  }

  private setupInputDebounce(): void {
    this.inputSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(text => {
        this.generateQrCode(text);
      });
  }

  onInputChange(text: string): void {
    // Enforce 1000 character limit
    if (text.length > 1000) {
      text = text.substring(0, 1000);
    }

    this.state.update(state => ({
      ...state,
      inputText: text,
      characterCount: text.length,
      error: null
    }));

    if (text.trim().length === 0) {
      this.clearQrCode();
    } else {
      this.inputSubject.next(text);
    }
  }

  private async generateQrCode(text: string): Promise<void> {
    if (!text || text.trim().length === 0) {
      this.clearQrCode();
      return;
    }

    this.state.update(state => ({
      ...state,
      isGenerating: true,
      error: null
    }));

    try {
      const dataUrl = await this.qrCodeService.generateQrCode(text);

      this.state.update(state => ({
        ...state,
        qrCodeDataUrl: dataUrl,
        isGenerating: false,
        error: null
      }));
    } catch (error) {
      this.state.update(state => ({
        ...state,
        qrCodeDataUrl: null,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code'
      }));
    }
  }

  private clearQrCode(): void {
    // Cleanup previous data URL to prevent memory leaks
    const currentDataUrl = this.state().qrCodeDataUrl;
    if (currentDataUrl && currentDataUrl.startsWith('data:')) {
      // For blob URLs, we would call URL.revokeObjectURL, but data URLs don't need cleanup
    }

    this.state.update(state => ({
      ...state,
      qrCodeDataUrl: null,
      isGenerating: false,
      error: null
    }));
  }

  async copyImage(): Promise<void> {
    const dataUrl = this.state().qrCodeDataUrl;
    if (!dataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Copy to clipboard if supported
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);

        // Could add a toast notification here
        console.log('QR code image copied to clipboard');
      } else {
        // Fallback for browsers without clipboard API
        throw new Error('Clipboard API not supported');
      }
    } catch (error) {
      console.error('Failed to copy image:', error);
      // Could show error message to user
    }
  }

  downloadImage(): void {
    const dataUrl = this.state().qrCodeDataUrl;
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearQrCode();
  }
}