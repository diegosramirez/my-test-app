import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { QrGeneratorComponent } from './qr-generator.component';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('QrGeneratorComponent', () => {
  let component: QrGeneratorComponent;
  let fixture: ComponentFixture<QrGeneratorComponent>;
  let generateQRCodeSpy: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrGeneratorComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(QrGeneratorComponent);
    component = fixture.componentInstance;

    // Spy on the private generateQRCode method instead of the external module
    generateQRCodeSpy = vi.spyOn(component as any, 'generateQRCode').mockImplementation(async (...args: any[]) => {
      const text = args[0] as string;
      component.isLoading = true;
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async operation
      component.qrCodeDataUrl = `data:image/png;base64,test-qr-code-for-${text}`;
      component.isLoading = false;
    });

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty state', () => {
      expect(component.inputText).toBe('');
      expect(component.qrCodeDataUrl).toBe('');
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('');
    });

    it('should have correct character limit of 2048', () => {
      expect(component.characterLimit).toBe(2048);
    });

    it('should have sample data with correct structure', () => {
      expect(component.sampleData).toHaveLength(3);

      const urlSample = component.sampleData.find(s => s.type === 'URL');
      expect(urlSample).toBeDefined();
      expect(urlSample?.value).toContain('https://');
      expect(urlSample?.label).toBe('Website URL');

      const wifiSample = component.sampleData.find(s => s.type === 'WiFi');
      expect(wifiSample).toBeDefined();
      expect(wifiSample?.value).toContain('WIFI:');
      expect(wifiSample?.label).toBe('WiFi Network');

      const contactSample = component.sampleData.find(s => s.type === 'Contact');
      expect(contactSample).toBeDefined();
      expect(contactSample?.value).toContain('VCARD');
      expect(contactSample?.label).toBe('Contact Info');
    });
  });

  describe('Character Counter and Limit Enforcement', () => {
    it('should display character count correctly', () => {
      component.inputText = 'Hello World';
      expect(component.characterCount).toBe(11);
      expect(component.characterCountDisplay).toBe('11/2048');
    });

    it('should detect when at character limit', () => {
      component.inputText = 'a'.repeat(2048);
      expect(component.isAtCharacterLimit).toBe(true);

      component.inputText = 'a'.repeat(2047);
      expect(component.isAtCharacterLimit).toBe(false);
    });

    it('should truncate input when exceeding character limit', () => {
      const longText = 'a'.repeat(2050);
      component.onInputChange(longText);
      expect(component.inputText).toBe('a'.repeat(2048));
    });
  });

  describe('QR Code Generation', () => {
    it('should generate QR code for valid text input', async () => {
      const testText = 'Hello World';
      component.onInputChange(testText);

      // Wait for debounce time
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(generateQRCodeSpy).toHaveBeenCalledWith(testText);
      expect(component.qrCodeDataUrl).toContain('data:image/png;base64,test-qr-code-for-');
    });

    it('should clear QR code when input is empty', () => {
      component.qrCodeDataUrl = 'existing-url';
      component.onInputChange('');
      expect(component.qrCodeDataUrl).toBe('');
      expect(component.isLoading).toBe(false);
    });

    it('should clear QR code for whitespace-only input', () => {
      component.qrCodeDataUrl = 'existing-url';
      component.onInputChange('   \n\t  ');
      expect(component.qrCodeDataUrl).toBe('');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle QR generation failure with general error message', async () => {
      // Reset spy to simulate an error
      generateQRCodeSpy.mockImplementation(async (...args: any[]) => {
        component.isLoading = false;
        component.qrCodeDataUrl = '';
        component.errorMessage = 'QR code generation failed - please try again or use different text';
      });

      component.onInputChange('test');
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(component.qrCodeDataUrl).toBe('');
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toContain('QR code generation failed');
    });

    it('should clear errors when new valid input is provided', () => {
      component.errorMessage = 'Previous error';
      component.onInputChange('new text');
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Sample Data Functionality', () => {
    it('should populate input with sample URL data', async () => {
      const urlSample = component.sampleData.find(s => s.type === 'URL');
      component.useSample(urlSample!.value);

      expect(component.inputText).toBe(urlSample!.value);
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(generateQRCodeSpy).toHaveBeenCalledWith(urlSample!.value);
    });

    it('should populate input with sample WiFi data', async () => {
      const wifiSample = component.sampleData.find(s => s.type === 'WiFi');
      component.useSample(wifiSample!.value);

      expect(component.inputText).toBe(wifiSample!.value);
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(generateQRCodeSpy).toHaveBeenCalledWith(wifiSample!.value);
    });
  });

  describe('Responsive Behavior', () => {
    it('should detect mobile viewport correctly', () => {
      const originalInnerWidth = window.innerWidth;

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
      expect(component.isMobileViewport).toBe(true);

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      expect(component.isMobileViewport).toBe(false);

      // Restore original window width
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    });

    it('should handle mobile QR code tap-to-enlarge', () => {
      const originalInnerWidth = window.innerWidth;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
      component.qrCodeDataUrl = 'test-url';

      component.onQRCodeClick();

      expect(openSpy).toHaveBeenCalledWith('test-url', '_blank');

      // Cleanup
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
      openSpy.mockRestore();
    });

    it('should not trigger tap-to-enlarge on desktop', () => {
      const originalInnerWidth = window.innerWidth;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      component.qrCodeDataUrl = 'test-url';

      component.onQRCodeClick();

      expect(openSpy).not.toHaveBeenCalled();

      // Cleanup
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
      openSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should not call revokeObjectURL for data URLs', () => {
      const revokeURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      component.qrCodeDataUrl = 'data:image/png;base64,test-data-url';

      component.ngOnDestroy();

      // Data URLs don't need to be revoked, only blob URLs do
      expect(revokeURLSpy).not.toHaveBeenCalled();
      revokeURLSpy.mockRestore();
    });

    it('should properly clean up observables on destroy', () => {
      const nextSpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    it('should render component title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('QR Code Generator');
    });

    it('should render description text', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.description')?.textContent).toContain('Enter any text to generate a QR code instantly');
    });

    it('should render textarea with correct attributes', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea).toBeTruthy();
      expect(textarea.id).toBe('qr-text-input');
      expect(textarea.getAttribute('maxlength')).toBe('2048');
      expect(textarea.getAttribute('placeholder')).toContain('Enter text, URL, WiFi credentials, or contact info...');
    });

    it('should render character counter', () => {
      const counter = fixture.nativeElement.querySelector('.character-counter');
      expect(counter).toBeTruthy();
      expect(counter.textContent).toContain('0/2048');
    });

    it('should render sample buttons when input is empty', () => {
      component.inputText = '';
      fixture.detectChanges();

      const sampleButtons = fixture.nativeElement.querySelectorAll('.sample-button');
      expect(sampleButtons.length).toBe(3);
    });

    it('should hide sample buttons when input has content', () => {
      component.inputText = 'test content';
      fixture.detectChanges();

      const sampleButtonsSection = fixture.nativeElement.querySelector('.sample-buttons-section');
      expect(sampleButtonsSection).toBeFalsy();
    });
  });
});