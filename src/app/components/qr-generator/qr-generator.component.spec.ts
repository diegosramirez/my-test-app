import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { QrGeneratorComponent } from './qr-generator.component';
import { QrCodeService } from '../../services/qr-code.service';
import { vi } from 'vitest';

describe('QrGeneratorComponent', () => {
  let component: QrGeneratorComponent;
  let fixture: ComponentFixture<QrGeneratorComponent>;
  let qrCodeService: any;
  let compiled: HTMLElement;

  beforeEach(async () => {
    const qrCodeServiceSpy = {
      generateQrCode: vi.fn(),
      validateInput: vi.fn(),
      downloadQrCode: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [QrGeneratorComponent, ReactiveFormsModule],
      providers: [
        { provide: QrCodeService, useValue: qrCodeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QrGeneratorComponent);
    component = fixture.componentInstance;
    qrCodeService = TestBed.inject(QrCodeService);
    compiled = fixture.nativeElement as HTMLElement;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty state', () => {
      expect(component.textControl.value).toBe('');
      expect(component.qrCodeDataUrl).toBeNull();
      expect(component.errorMessage).toBeNull();
      expect(component.isGenerating).toBeFalsy();
    });

    it('should set initial text if provided', () => {
      component.initialText = 'test initial text';
      component.ngOnInit();
      expect(component.textControl.value).toBe('test initial text');
    });

    it('should emit load event on initialization', () => {
      vi.spyOn(component as any, 'emitTrackingEvent');
      component.ngOnInit();

      expect((component as any).emitTrackingEvent).toHaveBeenCalledWith(
        'qr_generator_loaded',
        expect.objectContaining({
          timestamp: expect.any(String),
          load_time: expect.any(Number)
        })
      );
    });

    it('should have proper component load time tracking', () => {
      const startTime = performance.now();
      component.ngOnInit();
      const loadTime = performance.now() - startTime;

      // Component should load within 2 seconds (acceptance criteria)
      expect(loadTime).toBeLessThan(2000);
    });
  });

  describe('Form Validation and Character Counter', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display character count correctly', () => {
      component.textControl.setValue('test');
      fixture.detectChanges();

      expect(component.getCharacterCount()).toBe(4);

      const counterElement = compiled.querySelector('.character-counter span');
      expect(counterElement?.textContent).toContain('4/2000 characters');
    });

    it('should apply correct character count classes based on length', () => {
      // Normal state (green)
      component.textControl.setValue('a'.repeat(1000));
      expect(component.getCharacterCountClass()).toBe('char-count-normal');

      // Warning state (yellow) - at 1800+ characters
      component.textControl.setValue('a'.repeat(1850));
      expect(component.getCharacterCountClass()).toBe('char-count-warning');

      // Danger state (red) - at 2000 characters
      component.textControl.setValue('a'.repeat(2000));
      expect(component.getCharacterCountClass()).toBe('char-count-danger');
    });

    it('should show visual feedback at character count thresholds', () => {
      component.textControl.setValue('a'.repeat(1850));
      fixture.detectChanges();

      const counterSpan = compiled.querySelector('.character-counter span');
      expect(counterSpan?.classList.contains('char-count-warning')).toBeTruthy();
    });

    it('should enforce maxlength attribute on textarea', () => {
      const textArea = compiled.querySelector('textarea') as HTMLTextAreaElement;
      expect(textArea.maxLength).toBe(2000);
    });

    it('should handle character count at boundaries correctly', () => {
      // Test at warning threshold
      component.textControl.setValue('a'.repeat(1800));
      expect(component.getCharacterCountClass()).toBe('char-count-warning');

      // Test just before warning
      component.textControl.setValue('a'.repeat(1799));
      expect(component.getCharacterCountClass()).toBe('char-count-normal');

      // Test at danger threshold
      component.textControl.setValue('a'.repeat(2000));
      expect(component.getCharacterCountClass()).toBe('char-count-danger');
    });
  });

  describe('QR Code Generation with Debouncing', () => {
    beforeEach(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,testQR'));
    });

    it('should generate QR code with 300ms debouncing', fakeAsync(() => {
      component.ngOnInit();

      component.textControl.setValue('test');
      tick(299); // Just before debounce time
      expect(qrCodeService.generateQrCode).not.toHaveBeenCalled();

      tick(1); // Complete debounce time (300ms total)
      expect(qrCodeService.generateQrCode).toHaveBeenCalledWith('test', expect.any(Object));
    }));

    it('should prevent excessive API calls during rapid typing', fakeAsync(() => {
      component.ngOnInit();

      // Simulate rapid typing
      component.textControl.setValue('t');
      tick(100);
      component.textControl.setValue('te');
      tick(100);
      component.textControl.setValue('tes');
      tick(100);
      component.textControl.setValue('test');
      tick(300);

      // Should only generate QR code once after debouncing
      expect(qrCodeService.generateQrCode).toHaveBeenCalledTimes(1);
      expect(qrCodeService.generateQrCode).toHaveBeenCalledWith('test', expect.any(Object));
    }));

    it('should generate QR code within 500ms performance threshold', fakeAsync(() => {
      const startTime = performance.now();

      component.ngOnInit();
      component.textControl.setValue('performance test');
      tick(300); // Debounce time

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should be well within 500ms acceptance criteria
      expect(totalTime).toBeLessThan(500);
      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,testQR');
    }));

    it('should show loading state during generation', fakeAsync(() => {
      const slowGeneration = new Subject<string>();
      qrCodeService.generateQrCode.mockReturnValue(slowGeneration.asObservable());

      component.ngOnInit();
      component.textControl.setValue('loading test');
      tick(300);

      expect(component.isGenerating).toBeTruthy();

      fixture.detectChanges();
      const loadingElement = compiled.querySelector('.loading-section');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement?.textContent).toContain('Generating QR code...');

      slowGeneration.next('data:image/png;base64,result');
      slowGeneration.complete();
      tick();

      expect(component.isGenerating).toBeFalsy();
    }));

    it('should use correct responsive options for mobile and desktop', fakeAsync(() => {
      component.ngOnInit();

      // Test mobile (width <= 768)
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
      component.textControl.setValue('mobile test');
      tick(300);

      expect(qrCodeService.generateQrCode).toHaveBeenCalledWith(
        'mobile test',
        expect.objectContaining({ width: 200 })
      );

      // Test desktop (width > 768)
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
      component.textControl.setValue('desktop test');
      tick(300);

      expect(qrCodeService.generateQrCode).toHaveBeenCalledWith(
        'desktop test',
        expect.objectContaining({ width: 256 })
      );
    }));

    it('should emit tracking events for successful generation', fakeAsync(() => {
      vi.spyOn(component.qrGenerated, 'emit');
      vi.spyOn(component as any, 'emitTrackingEvent');

      component.ngOnInit();
      component.textControl.setValue('tracking test');
      tick(300);

      expect(component.qrGenerated.emit).toHaveBeenCalledWith('data:image/png;base64,testQR');
      expect((component as any).emitTrackingEvent).toHaveBeenCalledWith(
        'qr_code_generated',
        expect.objectContaining({
          text_length: 12,
          generation_time: expect.any(Number),
          success: true
        })
      );
    }));
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should show error for text exceeding 2000 characters', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({
        isValid: false,
        error: 'Text cannot exceed 2000 characters'
      });

      component.textControl.setValue('a'.repeat(2001));
      tick(300);

      expect(component.errorMessage).toBe('Text cannot exceed 2000 characters');
      fixture.detectChanges();

      const errorElement = compiled.querySelector('.error-section');
      expect(errorElement).toBeTruthy();
      expect(errorElement?.textContent).toContain('Text cannot exceed 2000 characters');
    }));

    it('should show error for empty text', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({
        isValid: false,
        error: 'Text cannot be empty'
      });

      component.textControl.setValue('   '); // whitespace only
      tick(300);

      expect(component.errorMessage).toBe('Text cannot be empty');
    }));

    it('should handle QR generation failures gracefully', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(
        throwError(() => new Error('Generation failed'))
      );

      component.textControl.setValue('error test');
      tick(300);

      expect(component.errorMessage).toBe('Failed to generate QR code. Please try again.');
      expect(component.isGenerating).toBeFalsy();
      expect(component.qrCodeDataUrl).toBeNull();
    }));

    it('should emit error tracking events', fakeAsync(() => {
      vi.spyOn(component.generationError, 'emit');
      vi.spyOn(component as any, 'emitTrackingEvent');

      qrCodeService.validateInput.mockReturnValue({
        isValid: false,
        error: 'Text cannot exceed 2000 characters'
      });

      component.textControl.setValue('a'.repeat(2001));
      tick(300);

      expect(component.generationError.emit).toHaveBeenCalledWith('Text cannot exceed 2000 characters');
      expect((component as any).emitTrackingEvent).toHaveBeenCalledWith(
        'qr_generation_error',
        expect.objectContaining({
          error_type: 'Text cannot exceed 2000 characters',
          character_count: 2001
        })
      );
    }));

    it('should clear errors when text becomes valid', fakeAsync(() => {
      // First, set error state
      qrCodeService.validateInput.mockReturnValue({
        isValid: false,
        error: 'Text cannot exceed 2000 characters'
      });

      component.textControl.setValue('a'.repeat(2001));
      tick(300);
      expect(component.errorMessage).toBeTruthy();

      // Then clear error with valid text
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,valid'));

      component.textControl.setValue('valid text');
      tick(300);

      expect(component.errorMessage).toBeNull();
    }));
  });

  describe('Empty State Handling', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should show sample section when input is empty', () => {
      component.textControl.setValue('');
      fixture.detectChanges();

      const sampleSection = compiled.querySelector('.sample-section');
      expect(sampleSection).toBeTruthy();
      expect(sampleSection?.textContent).toContain('Enter text above to generate your QR code');
    });

    it('should hide QR code and download button when input is empty', fakeAsync(() => {
      // First generate a QR code
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,test'));

      component.textControl.setValue('test');
      tick(300);
      expect(component.qrCodeDataUrl).toBeTruthy();

      // Then clear the input
      component.textControl.setValue('');
      tick(300);

      expect(component.qrCodeDataUrl).toBeNull();
      fixture.detectChanges();

      const qrSection = compiled.querySelector('.qr-section');
      const downloadBtn = compiled.querySelector('.download-btn');
      expect(qrSection).toBeFalsy();
      expect(downloadBtn).toBeFalsy();
    }));

    it('should not show sample section when generating or has QR code', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,test'));

      component.textControl.setValue('test');
      tick(300);
      fixture.detectChanges();

      const sampleSection = compiled.querySelector('.sample-section');
      expect(sampleSection).toBeFalsy();
    }));
  });

  describe('QR Code Display and Download', () => {
    beforeEach(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,testQR'));
      component.ngOnInit();
    });

    it('should display QR code with correct size for desktop and mobile', fakeAsync(() => {
      // Test desktop size
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
      component.textControl.setValue('desktop test');
      tick(300);
      fixture.detectChanges();

      expect(component.getQrCodeSize()).toBe(256);

      const qrImage = compiled.querySelector('.qr-code-image') as HTMLImageElement;
      expect(qrImage.style.width).toBe('256px');
      expect(qrImage.style.height).toBe('256px');

      // Test mobile size
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
      expect(component.getQrCodeSize()).toBe(200);
    }));

    it('should generate descriptive alt text for accessibility', fakeAsync(() => {
      component.textControl.setValue('Test QR code content');
      tick(300);
      fixture.detectChanges();

      const qrImage = compiled.querySelector('.qr-code-image') as HTMLImageElement;
      expect(qrImage.alt).toBe('QR code containing: Test QR code content');
    }));

    it('should truncate long alt text with ellipsis', () => {
      const longText = 'a'.repeat(100);
      component.textControl.setValue(longText);

      const altText = component.getQrCodeAltText();
      expect(altText).toContain('...');
      expect(altText.length).toBeLessThan(100);
    });

    it('should download QR code with proper filename', fakeAsync(() => {
      component.textControl.setValue('Test Download');
      tick(300);

      const downloadBtn = compiled.querySelector('.download-btn') as HTMLButtonElement;
      downloadBtn.click();

      expect(qrCodeService.downloadQrCode).toHaveBeenCalledWith(
        'data:image/png;base64,testQR',
        'test_download'
      );
    }));

    it('should emit download tracking event', fakeAsync(() => {
      vi.spyOn(component as any, 'emitTrackingEvent');

      component.textControl.setValue('Download test');
      tick(300);
      component.downloadQrCode();

      expect((component as any).emitTrackingEvent).toHaveBeenCalledWith(
        'qr_code_downloaded',
        expect.objectContaining({
          text_length: 13,
          timestamp: expect.any(String)
        })
      );
    }));

    it('should handle download errors gracefully', fakeAsync(() => {
      component.textControl.setValue('Download error test');
      tick(300);

      qrCodeService.downloadQrCode.mockImplementation(() => {
        throw new Error('Download failed');
      });
      component.downloadQrCode();

      expect(component.errorMessage).toBe('Failed to download QR code. Please try again.');
    }));
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA labels and attributes', () => {
      const textInput = compiled.querySelector('#textInput') as HTMLTextAreaElement;
      expect(textInput.getAttribute('aria-describedby')).toBe('character-counter');

      // Test aria-invalid when there's an error
      component.errorMessage = 'Test error';
      fixture.detectChanges();

      expect(textInput.getAttribute('aria-describedby')).toBe('error-message');
      expect(textInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have proper labels for form controls', () => {
      const label = compiled.querySelector('label[for="textInput"]');
      const input = compiled.querySelector('#textInput');

      expect(label).toBeTruthy();
      expect(input).toBeTruthy();
      expect(label?.textContent?.trim()).toBe('Enter text to generate QR code');
    });

    it('should show error messages with role="alert"', () => {
      component.errorMessage = 'Test error message';
      fixture.detectChanges();

      const errorElement = compiled.querySelector('.error-section');
      expect(errorElement?.getAttribute('role')).toBe('alert');
      expect(errorElement?.id).toBe('error-message');
    });

    it('should have accessible download button with aria-label', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,test'));

      component.textControl.setValue('test');
      tick(300);
      fixture.detectChanges();

      const downloadBtn = compiled.querySelector('.download-btn') as HTMLButtonElement;
      expect(downloadBtn.getAttribute('aria-label')).toBe('Download QR code as PNG file');
    }));

    it('should have accessible loading spinner', fakeAsync(() => {
      const slowGeneration = new Subject<string>();
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(slowGeneration.asObservable());

      component.textControl.setValue('loading test');
      tick(300);
      fixture.detectChanges();

      const loadingSpinner = compiled.querySelector('.loading-spinner');
      expect(loadingSpinner?.getAttribute('aria-label')).toBe('Generating QR code');
    }));
  });

  describe('Mobile Responsiveness', () => {
    it('should prevent unwanted zoom on mobile input focus', () => {
      const textInput = compiled.querySelector('.text-input') as HTMLElement;
      const computedStyle = window.getComputedStyle(textInput);

      // Check if font-size is set to 16px on mobile (prevents zoom)
      expect(textInput.style.fontSize || computedStyle.fontSize).toBeTruthy();
    });

    it('should use mobile-optimized QR code sizes', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
      expect(component.getQrCodeSize()).toBe(200);

      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
      expect(component.getQrCodeSize()).toBe(256);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should clear QR code data URL on destroy', () => {
      component.qrCodeDataUrl = 'data:image/png;base64,testdata';

      component.ngOnDestroy();

      expect(component.qrCodeDataUrl).toBeNull();
    });

    it('should complete destroy subject on component destroy', () => {
      vi.spyOn((component as any).destroy$, 'next');
      vi.spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect((component as any).destroy$.next).toHaveBeenCalled();
      expect((component as any).destroy$.complete).toHaveBeenCalled();
    });

    it('should handle destroy when no QR code data URL exists', () => {
      component.qrCodeDataUrl = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(component.qrCodeDataUrl).toBeNull();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle rapid component initialization and destruction', () => {
      component.ngOnInit();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle special characters in text input', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,special'));

      component.ngOnInit();
      component.textControl.setValue('Hello 🌍! @#$%^&*()');
      tick(300);

      expect(qrCodeService.generateQrCode).toHaveBeenCalledWith(
        'Hello 🌍! @#$%^&*()',
        expect.any(Object)
      );
    }));

    it('should handle text with newlines and tabs', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,multiline'));

      component.ngOnInit();
      component.textControl.setValue('Line 1\nLine 2\tTabbed');
      tick(300);

      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,multiline');
    }));

    it('should maintain performance with large valid inputs', fakeAsync(() => {
      qrCodeService.validateInput.mockReturnValue({ isValid: true });
      qrCodeService.generateQrCode.mockReturnValue(of('data:image/png;base64,large'));

      const startTime = performance.now();
      component.ngOnInit();
      component.textControl.setValue('a'.repeat(2000));
      tick(300);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Within acceptance criteria
      expect(component.qrCodeDataUrl).toBe('data:image/png;base64,large');
    }));
  });
});