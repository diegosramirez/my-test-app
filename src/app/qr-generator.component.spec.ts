import 'zone.js/testing';
import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { QrGeneratorComponent } from './qr-generator.component';

describe('QrGeneratorComponent', () => {
  let component: QrGeneratorComponent;
  let fixture: ComponentFixture<QrGeneratorComponent>;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let mockQRCodeToDataURL: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrGeneratorComponent);
    component = fixture.componentInstance;

    // Setup console spies
    consoleLogSpy = vi.spyOn(console, 'log');
    consoleWarnSpy = vi.spyOn(console, 'warn');
    consoleErrorSpy = vi.spyOn(console, 'error');

    // Mock QRCode library
    const QRCode = await import('qrcode');
    mockQRCodeToDataURL = vi.spyOn(QRCode, 'toDataURL');

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        write: vi.fn().mockResolvedValue(undefined)
      }
    });

    // Mock ClipboardItem
    (global as any).ClipboardItem = vi.fn().mockImplementation((data: any) => ({
      ...data,
      supports: vi.fn().mockReturnValue(true)
    }));

    // Setup window resize mock
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    fixture.detectChanges();
  });

  afterEach(() => {
    // Reset spies
    consoleLogSpy.calls.reset();
    consoleWarnSpy.calls.reset();
    consoleErrorSpy.calls.reset();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should display title "QR Code Generator"', () => {
      const title = fixture.debugElement.query(By.css('h1'));
      expect(title.nativeElement.textContent).toBe('QR Code Generator');
    });

    it('should show input field with placeholder text', () => {
      const textarea = fixture.debugElement.query(By.css('.text-input'));
      expect(textarea.nativeElement.placeholder).toBe('Enter text to generate QR code');
    });

    it('should show character counter at 0/2000 characters initially', () => {
      const counter = fixture.debugElement.query(By.css('.character-counter'));
      expect(counter.nativeElement.textContent.trim()).toBe('0/2000 characters');
    });

    it('should initialize with empty form control', () => {
      expect(component.textControl.value).toBe('');
    });

    it('should not show QR code initially', () => {
      expect(component.qrCodeDataUrl).toBeNull();
      const qrDisplay = fixture.debugElement.query(By.css('.qr-display'));
      expect(qrDisplay).toBeNull();
    });
  });

  describe('Text Input and Character Counting', () => {
    it('should update character count as user types', () => {
      component.textControl.setValue('Hello World');
      fixture.detectChanges();

      const counter = fixture.debugElement.query(By.css('.character-counter'));
      expect(counter.nativeElement.textContent.trim()).toBe('11/2000 characters');
      expect(component.characterCount).toBe(11);
    });

    it('should show warning style when approaching character limit', () => {
      component.textControl.setValue('a'.repeat(1900));
      fixture.detectChanges();

      const counter = fixture.debugElement.query(By.css('.character-counter'));
      expect(counter.nativeElement.className).toContain('warning');
    });

    it('should enforce 2000 character limit in template', () => {
      const textarea = fixture.debugElement.query(By.css('.text-input'));
      expect(textarea.nativeElement.maxLength).toBe(2000);
    });

    it('should show validation error when exceeding character limit', () => {
      component.textControl.setValue('a'.repeat(2001));
      component.textControl.markAsTouched();
      fixture.detectChanges();

      expect(component.textControl.invalid).toBe(true);
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage.nativeElement.textContent.trim()).toBe('Maximum 2000 characters allowed');
    });

    it('should add error class to input when invalid', () => {
      component.textControl.setValue('a'.repeat(2001));
      component.textControl.markAsTouched();
      fixture.detectChanges();

      const textarea = fixture.debugElement.query(By.css('.text-input'));
      expect(textarea.nativeElement.className).toContain('error');
    });
  });

  describe('Debounced QR Generation', () => {
    beforeEach(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');
    });

    it('should wait 300ms after typing stops before generating QR code', fakeAsync(() => {
      component.textControl.setValue('test');
      expect(mockQRCodeToDataURL).not.toHaveBeenCalled();

      tick(299);
      expect(mockQRCodeToDataURL).not.toHaveBeenCalled();

      tick(1);
      expect(mockQRCodeToDataURL).toHaveBeenCalledWith('test', {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      flush();
    }));

    it('should cancel previous QR generation if user continues typing', fakeAsync(() => {
      component.textControl.setValue('test1');
      tick(200);

      component.textControl.setValue('test2');
      tick(300);

      expect(mockQRCodeToDataURL).toHaveBeenCalledTimes(1);
      expect(mockQRCodeToDataURL).toHaveBeenCalledWith('test2', expect.any(Object));

      flush();
    }));

    it('should show loading state during QR generation', fakeAsync(() => {
      component.textControl.setValue('test');
      tick(300);

      expect(component.isLoading).toBe(true);
      fixture.detectChanges();

      const loadingState = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingState.nativeElement.textContent.trim()).toBe('Generating QR code...');

      flush();
    }));

    it('should display QR code with fade-in animation after generation', fakeAsync(() => {
      component.textControl.setValue('test');
      tick(300);
      flush();
      fixture.detectChanges();

      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,mock-qr-data');
      expect(component.isLoading).toBe(false);

      const qrDisplay = fixture.debugElement.query(By.css('.qr-display'));
      expect(qrDisplay).not.toBeNull();

      const qrImage = fixture.debugElement.query(By.css('.qr-image'));
      expect(qrImage.nativeElement.src).toBe('data:image/png;base64,mock-qr-data');
      expect(qrImage.nativeElement.alt).toBe('Generated QR code');
    }));

    it('should track analytics event on successful QR generation', fakeAsync(() => {
      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(consoleLogSpy).toHaveBeenCalledWith('Analytics Event:', {
        event: 'qr_code_generated',
        properties: {
          character_count: 4,
          generation_time: expect.any(Number),
          timestamp: expect.any(String),
          user_agent: expect.any(String)
        }
      });
    }));

    it('should warn if generation takes longer than 500ms', fakeAsync(() => {
      mockQRCodeToDataURL.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve('data:image/png;base64,mock'), 600))
      );

      component.textControl.setValue('test');
      tick(300);
      tick(600);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/QR generation took/)
      );

      flush();
    }));
  });

  describe('Empty State Handling', () => {
    it('should clear QR code when input becomes empty', fakeAsync(() => {
      // First generate a QR code
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');
      component.textControl.setValue('test');
      tick(300);
      flush();
      fixture.detectChanges();

      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,mock-qr-data');

      // Clear input
      component.textControl.setValue('');
      tick(300);
      fixture.detectChanges();

      expect(component.qrCodeDataUrl).toBeNull();

      const qrDisplay = fixture.debugElement.query(By.css('.qr-display'));
      expect(qrDisplay).toBeNull();
    }));

    it('should clear QR code when input is only whitespace', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');
      component.textControl.setValue('test');
      tick(300);
      flush();

      component.textControl.setValue('   ');
      tick(300);
      fixture.detectChanges();

      expect(component.qrCodeDataUrl).toBeNull();
    }));
  });

  describe('Error Handling', () => {
    it('should display error message when QR generation fails', fakeAsync(() => {
      const error = new Error('QR generation failed');
      mockQRCodeToDataURL.mockRejectedValue(error);

      component.textControl.setValue('test');
      tick(300);
      flush();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Failed to generate QR code. Please try again.');
      expect(component.isLoading).toBe(false);
      expect(component.qrCodeDataUrl).toBeNull();

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState.nativeElement.textContent.trim()).toBe('Failed to generate QR code. Please try again.');
    }));

    it('should track analytics event on QR generation error', fakeAsync(() => {
      const error = new Error('Network error');
      mockQRCodeToDataURL.mockRejectedValue(error);

      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(consoleLogSpy).toHaveBeenCalledWith('Analytics Event:', {
        event: 'qr_generation_error',
        properties: {
          error_type: 'Network error',
          character_count: 4,
          timestamp: expect.any(String),
          user_agent: expect.any(String)
        }
      });
    }));

    it('should log error to console when QR generation fails', fakeAsync(() => {
      const error = new Error('QR generation failed');
      mockQRCodeToDataURL.mockRejectedValue(error);

      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith('QR Code generation failed:', error);
    }));
  });

  describe('Copy Functionality', () => {
    beforeEach(() => {
      // Mock fetch for blob conversion
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        blob: vi.fn().mockResolvedValue(new Blob(['mock-blob'], { type: 'image/png' }))
      });

      vi.mocked(navigator.clipboard.write).mockResolvedValue();
    });

    it('should copy QR code to clipboard when copy button is clicked', async () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      copyButton.nativeElement.click();

      await fixture.whenStable();

      expect(navigator.clipboard.write).toHaveBeenCalledWith([
        expect.any(Object)
      ]);
    });

    it('should show success feedback after successful copy', async () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      copyButton.nativeElement.click();

      await fixture.whenStable();
      fixture.detectChanges();

      expect(copyButton.nativeElement.textContent.trim()).toBe('Copied!');
    });

    it('should reset copy button text after 2 seconds', fakeAsync(() => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      copyButton.nativeElement.click();

      tick(2000);
      fixture.detectChanges();

      expect(copyButton.nativeElement.textContent.trim()).toBe('Copy QR Code');
    }));

    it('should track successful copy event', async () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      copyButton.nativeElement.click();

      await fixture.whenStable();

      expect(consoleLogSpy).toHaveBeenCalledWith('Analytics Event:', {
        event: 'qr_code_copied',
        properties: {
          character_count: 4,
          success: true,
          timestamp: expect.any(String),
          user_agent: expect.any(String)
        }
      });
    });

    it('should handle copy failure gracefully', async () => {
      vi.mocked(navigator.clipboard.write).mockRejectedValue(new Error('Copy failed'));

      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      copyButton.nativeElement.click();

      await fixture.whenStable();
      fixture.detectChanges();

      expect(copyButton.nativeElement.textContent.trim()).toBe('Copy Failed');
    });

    it('should not copy if no QR code is available', async () => {
      component.qrCodeDataUrl = null;

      await component.copyQRCode();

      expect(navigator.clipboard.write).not.toHaveBeenCalled();
    });

    it('should disable copy button when loading', () => {
      component.isLoading = true;
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      fixture.detectChanges();

      const copyButton = fixture.debugElement.query(By.css('.copy-btn'));
      expect(copyButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      // Mock document.createElement and DOM manipulation
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    it('should create download link with meaningful filename', () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('Hello World! @#$%');

      component.downloadQRCode();

      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should trigger download when download button is clicked', () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');
      fixture.detectChanges();

      const downloadButton = fixture.debugElement.query(By.css('.download-btn'));
      downloadButton.nativeElement.click();

      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should track download event', () => {
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');

      component.downloadQRCode();

      expect(consoleLogSpy).toHaveBeenCalledWith('Analytics Event:', {
        event: 'qr_code_downloaded',
        properties: {
          character_count: 4,
          file_format: 'png',
          timestamp: expect.any(String),
          user_agent: expect.any(String)
        }
      });
    });

    it('should not download if no QR code is available', () => {
      component.qrCodeDataUrl = null;

      component.downloadQRCode();

      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should disable download button when loading', () => {
      component.isLoading = true;
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      fixture.detectChanges();

      const downloadButton = fixture.debugElement.query(By.css('.download-btn'));
      expect(downloadButton.nativeElement.disabled).toBe(true);
    });

    it('should handle download errors gracefully', () => {
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Download failed');
      });

      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      component.textControl.setValue('test');

      expect(() => component.downloadQRCode()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to download QR code:', expect.any(Error));
    });
  });

  describe('Mobile Responsive Behavior', () => {
    it('should detect mobile device based on window width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });

      const newFixture = TestBed.createComponent(QrGeneratorComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent.isMobile).toBe(true);
    });

    it('should use smaller QR code size on mobile', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
      component.isMobile = true;

      component.textControl.setValue('test');
      tick(300);

      expect(mockQRCodeToDataURL).toHaveBeenCalledWith('test', {
        errorCorrectionLevel: 'M',
        width: 250,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      flush();
    }));

    it('should add mobile class to QR image on mobile devices', () => {
      component.isMobile = true;
      component.qrCodeDataUrl = 'data:image/png;base64,mock-qr-data';
      fixture.detectChanges();

      const qrImage = fixture.debugElement.query(By.css('.qr-image'));
      expect(qrImage.nativeElement.className).toContain('mobile');
    });

    it('should update mobile state on window resize', () => {
      // Start desktop
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      component.isMobile = false;

      // Simulate resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
      window.dispatchEvent(new Event('resize'));

      expect(component.isMobile).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should cancel ongoing QR generation on destroy', fakeAsync(() => {
      mockQRCodeToDataURL.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve('data:image/png;base64,mock'), 1000)
      ));

      component.textControl.setValue('test');
      tick(300);

      // Destroy component before QR generation completes
      component.ngOnDestroy();
      tick(1000);

      // QR code should not be set
      expect(component.qrCodeDataUrl).toBeNull();

      flush();
    }));
  });

  describe('Performance Requirements', () => {
    it('should not regenerate identical QR codes', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      // Generate QR code for 'test'
      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(mockQRCodeToDataURL).toHaveBeenCalledTimes(1);

      // Set same value again (distinctUntilChanged should prevent regeneration)
      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(mockQRCodeToDataURL).toHaveBeenCalledTimes(1);
    }));

    it('should meet 500ms generation time requirement', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      component.textControl.setValue('a'.repeat(2000));
      tick(300);
      flush();

      // Should complete without warnings for performance
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle maximum character input without errors', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      const maxText = 'a'.repeat(2000);
      component.textControl.setValue(maxText);
      tick(300);
      flush();

      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,mock-qr-data');
      expect(mockQRCodeToDataURL).toHaveBeenCalledWith(maxText, expect.any(Object));
    }));

    it('should handle special characters in input', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      const specialText = 'Hello! @#$%^&*()[]{}|;:",.<>?/~`+=_- 你好 🎉';
      component.textControl.setValue(specialText);
      tick(300);
      flush();

      expect(mockQRCodeToDataURL).toHaveBeenCalledWith(specialText, expect.any(Object));
    }));

    it('should handle rapid input changes', fakeAsync(() => {
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mock-qr-data');

      // Rapid typing simulation
      component.textControl.setValue('a');
      tick(100);
      component.textControl.setValue('ab');
      tick(100);
      component.textControl.setValue('abc');
      tick(300);

      expect(mockQRCodeToDataURL).toHaveBeenCalledTimes(1);
      expect(mockQRCodeToDataURL).toHaveBeenCalledWith('abc', expect.any(Object));

      flush();
    }));

    it('should handle QR generation with empty error message', fakeAsync(() => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      mockQRCodeToDataURL.mockRejectedValue(errorWithoutMessage);

      component.textControl.setValue('test');
      tick(300);
      flush();

      expect(consoleLogSpy).toHaveBeenCalledWith('Analytics Event:', {
        event: 'qr_generation_error',
        properties: {
          error_type: 'unknown',
          character_count: 4,
          timestamp: expect.any(String),
          user_agent: expect.any(String)
        }
      });
    }));
  });
});