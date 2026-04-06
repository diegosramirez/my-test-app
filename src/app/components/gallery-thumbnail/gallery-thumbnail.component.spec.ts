import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { GalleryThumbnailComponent } from './gallery-thumbnail.component';
import { ImageLoadingService } from '../../services/image-loading.service';
import { GalleryImage } from '../../types/gallery.types';

// Mock ImageLoadingService
class MockImageLoadingService {
  private loadingStates = new Map<string, BehaviorSubject<'loading' | 'loaded' | 'error'>>();

  getImageLoadingState(imageId: string) {
    if (!this.loadingStates.has(imageId)) {
      this.loadingStates.set(imageId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
    }
    return this.loadingStates.get(imageId)!.asObservable();
  }

  observeImageElement = vi.fn();
  unobserveImageElement = vi.fn();
  trackEvent = vi.fn();

  // Helper methods for testing
  setLoadingState(imageId: string, state: 'loading' | 'loaded' | 'error') {
    if (!this.loadingStates.has(imageId)) {
      this.loadingStates.set(imageId, new BehaviorSubject(state));
    } else {
      this.loadingStates.get(imageId)!.next(state);
    }
  }

  reset() {
    this.loadingStates.clear();
    vi.clearAllMocks();
  }
}

// Mock ImageUtils
vi.mock('../../utils/image.utils', () => ({
  ImageUtils: {
    isValidGalleryImage: vi.fn().mockReturnValue(true),
    isValidImageUrl: vi.fn().mockReturnValue(true),
    getOptimizedImageUrl: vi.fn((image: GalleryImage) => image.thumbnailUrl)
  }
}));

describe('GalleryThumbnailComponent', () => {
  let component: GalleryThumbnailComponent;
  let fixture: ComponentFixture<GalleryThumbnailComponent>;
  let mockImageLoadingService: MockImageLoadingService;
  let mockChangeDetectorRef: {
    detectChanges: ReturnType<typeof vi.fn>;
  };

  const mockImage: GalleryImage = {
    id: 'test-1',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    fullSizeUrl: 'https://example.com/full.jpg',
    alt: 'Test image',
    caption: 'Test caption'
  };

  beforeEach(async () => {
    mockImageLoadingService = new MockImageLoadingService();
    mockChangeDetectorRef = {
      detectChanges: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GalleryThumbnailComponent],
      providers: [
        { provide: ImageLoadingService, useValue: mockImageLoadingService },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryThumbnailComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.image = mockImage;
    component.index = 0;
    component.aspectRatio = '16:9';
  });

  afterEach(() => {
    mockImageLoadingService.reset();
  });

  describe('component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should set up image URL and ARIA label on init', () => {
      component.ngOnInit();

      expect(component.optimizedImageUrl).toBe(mockImage.thumbnailUrl);
      expect(component.imageAriaLabel).toContain('Image 1: Test image');
      expect(component.imageAriaLabel).toContain('Test caption');
      expect(component.imageAriaLabel).toContain('Click to open in lightbox');
    });

    it('should set loading state to true initially', () => {
      component.ngOnInit();
      expect(component.isLoading).toBe(true);
    });

    it('should handle image without caption in ARIA label', () => {
      const imageWithoutCaption = { ...mockImage, caption: undefined };
      component.image = imageWithoutCaption;
      component.ngOnInit();

      expect(component.imageAriaLabel).toContain('Image 1: Test image');
      expect(component.imageAriaLabel).not.toContain('undefined');
      expect(component.imageAriaLabel).toContain('Click to open in lightbox');
    });
  });

  describe('lazy loading setup', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should subscribe to loading state from service', () => {
      component.ngAfterViewInit();

      expect(mockImageLoadingService.observeImageElement).toHaveBeenCalledWith(
        component['elementRef'].nativeElement,
        mockImage.id,
        mockImage.thumbnailUrl
      );
    });

    it('should handle loading state changes', () => {
      component.ngAfterViewInit();

      // Simulate loading state change
      mockImageLoadingService.setLoadingState(mockImage.id, 'loaded');

      expect(component.isLoading).toBe(false);
      expect(component.isImageLoaded).toBe(true);
      expect(component.hasError).toBe(false);
    });

    it('should handle error state changes', () => {
      component.ngAfterViewInit();

      // Simulate error state change
      mockImageLoadingService.setLoadingState(mockImage.id, 'error');

      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(true);
      expect(component.isImageLoaded).toBe(false);
    });

    it('should handle invalid image gracefully', () => {
      const invalidImage = { ...mockImage, thumbnailUrl: 'invalid-url' };
      component.image = invalidImage;

      const { ImageUtils } = await import('../../utils/image.utils');
      vi.mocked(ImageUtils.isValidImageUrl).mockReturnValue(false);

      component.ngOnInit();
      component.ngAfterViewInit();

      expect(component.hasError).toBe(true);
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should emit imageClicked on click', () => {
      vi.spyOn(component.imageClicked, 'emit');
      component.hasError = false;

      component.onImageClick();

      expect(component.imageClicked.emit).toHaveBeenCalled();
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'thumbnail_clicked',
        expect.objectContaining({
          image_id: mockImage.id,
          position_in_grid: 0
        })
      );
    });

    it('should not emit imageClicked when has error', () => {
      vi.spyOn(component.imageClicked, 'emit');
      component.hasError = true;

      component.onImageClick();

      expect(component.imageClicked.emit).not.toHaveBeenCalled();
    });

    it('should handle Enter key press', () => {
      vi.spyOn(component, 'onImageClick');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onImageClick).toHaveBeenCalled();
    });

    it('should handle Space key press', () => {
      vi.spyOn(component, 'onImageClick');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onImageClick).toHaveBeenCalled();
    });

    it('should ignore other key presses', () => {
      vi.spyOn(component, 'onImageClick');
      const event = new KeyboardEvent('keydown', { key: 'Tab' });

      component.onKeydown(event);

      expect(component.onImageClick).not.toHaveBeenCalled();
    });
  });

  describe('image loading events', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should handle successful image load', () => {
      vi.spyOn(component.imageLoaded, 'emit');
      component.retryCount = 1;

      component.onImageLoad();

      expect(component.isLoading).toBe(false);
      expect(component.isImageLoaded).toBe(true);
      expect(component.hasError).toBe(false);
      expect(component.retryCount).toBe(0);
      expect(component.imageLoaded.emit).toHaveBeenCalled();
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'image_loaded',
        expect.objectContaining({
          image_id: mockImage.id,
          retry_count: 0,
          position_in_grid: 0
        })
      );
    });

    it('should handle image load error', () => {
      vi.spyOn(component.imageError, 'emit');

      component.onImageError();

      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(true);
      expect(component.isImageLoaded).toBe(false);
      expect(component.imageError.emit).toHaveBeenCalled();
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'image_error',
        expect.objectContaining({
          image_id: mockImage.id,
          error_type: 'load_failure',
          retry_attempt: 0,
          position_in_grid: 0
        })
      );
    });
  });

  describe('retry functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should retry loading when within retry limit', () => {
      const event = new Event('click');
      vi.spyOn(event, 'stopPropagation');

      component.hasError = true;
      component.retryCount = 1;

      component.retryImageLoad(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.hasError).toBe(false);
      expect(component.isLoading).toBe(true);
      expect(component.isImageLoaded).toBe(false);
      expect(component.retryCount).toBe(2);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'image_retry',
        expect.objectContaining({
          image_id: mockImage.id,
          retry_attempt: 2,
          position_in_grid: 0
        })
      );
    });

    it('should not retry when max retries exceeded', () => {
      const event = new Event('click');
      component.retryCount = 3; // Already at max

      component.retryImageLoad(event);

      expect(component.hasError).toBe(false); // Still attempts reset
      expect(component.retryCount).toBe(3); // Doesn't increment
    });

    it('should reset image src when thumbnail ref exists', () => {
      const event = new Event('click');
      const mockImg = document.createElement('img');
      mockImg.src = 'old-src';

      // Mock ViewChild reference
      component.thumbnailImageRef = { nativeElement: mockImg } as any;
      component.hasError = true;

      component.retryImageLoad(event);

      expect(mockImg.src).toBe('');

      // Should set new src after timeout
      setTimeout(() => {
        expect(mockImg.src).toBe(mockImage.thumbnailUrl);
      }, 150);
    });
  });

  describe('component cleanup', () => {
    it('should unsubscribe on destroy', () => {
      component.ngOnInit();
      component.ngAfterViewInit();

      const subscriptionSpy = vi.spyOn(component['subscriptions'], 'unsubscribe');

      component.ngOnDestroy();

      expect(subscriptionSpy).toHaveBeenCalled();
      expect(mockImageLoadingService.unobserveImageElement).toHaveBeenCalledWith(
        component['elementRef'].nativeElement
      );
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should show loading placeholder when loading', () => {
      component.isLoading = true;
      component.hasError = false;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.loading-placeholder');
      const errorPlaceholder = fixture.nativeElement.querySelector('.error-placeholder');
      const image = fixture.nativeElement.querySelector('.thumbnail-image');

      expect(placeholder).toBeTruthy();
      expect(errorPlaceholder).toBeFalsy();
      expect(image).toBeFalsy();
    });

    it('should show error placeholder when has error', () => {
      component.isLoading = false;
      component.hasError = true;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.loading-placeholder');
      const errorPlaceholder = fixture.nativeElement.querySelector('.error-placeholder');
      const image = fixture.nativeElement.querySelector('.thumbnail-image');
      const retryButton = fixture.nativeElement.querySelector('.retry-button');

      expect(placeholder).toBeFalsy();
      expect(errorPlaceholder).toBeTruthy();
      expect(image).toBeFalsy();
      expect(retryButton).toBeTruthy();
    });

    it('should show image when loaded successfully', () => {
      component.isLoading = false;
      component.hasError = false;
      component.isImageLoaded = true;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.loading-placeholder');
      const errorPlaceholder = fixture.nativeElement.querySelector('.error-placeholder');
      const image = fixture.nativeElement.querySelector('.thumbnail-image');

      expect(placeholder).toBeFalsy();
      expect(errorPlaceholder).toBeFalsy();
      expect(image).toBeTruthy();
      expect(image.src).toBe(mockImage.thumbnailUrl);
      expect(image.alt).toBe(mockImage.alt);
    });

    it('should show caption when image is loaded and has caption', () => {
      component.isLoading = false;
      component.hasError = false;
      component.isImageLoaded = true;
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.thumbnail-caption');
      expect(caption).toBeTruthy();
      expect(caption.textContent.trim()).toBe(mockImage.caption);
      expect(caption.id).toBe(`caption-${mockImage.id}`);
    });

    it('should not show caption when image has no caption', () => {
      component.image = { ...mockImage, caption: undefined };
      component.isLoading = false;
      component.hasError = false;
      component.isImageLoaded = true;
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.thumbnail-caption');
      expect(caption).toBeFalsy();
    });

    it('should show loading progress indicator when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const progressIndicator = fixture.nativeElement.querySelector('.loading-progress');
      expect(progressIndicator).toBeTruthy();
      expect(progressIndicator.getAttribute('role')).toBe('progressbar');
    });

    it('should have proper accessibility attributes', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.thumbnail-container');
      expect(container.getAttribute('role')).toBe('button');
      expect(container.getAttribute('tabindex')).toBe('0');
      expect(container.getAttribute('aria-label')).toContain(mockImage.alt);
      expect(container.getAttribute('aria-describedby')).toBe(`caption-${mockImage.id}`);
    });

    it('should not set aria-describedby when no caption', () => {
      component.image = { ...mockImage, caption: undefined };
      component.ngOnInit();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.thumbnail-container');
      expect(container.getAttribute('aria-describedby')).toBe(null);
    });

    it('should apply CSS classes based on state', () => {
      const container = fixture.nativeElement.querySelector('.thumbnail-container');

      // Loading state
      component.isLoading = true;
      component.hasError = false;
      component.isImageLoaded = false;
      fixture.detectChanges();
      expect(container.classList.contains('loading')).toBe(true);
      expect(container.classList.contains('error')).toBe(false);
      expect(container.classList.contains('loaded')).toBe(false);

      // Error state
      component.isLoading = false;
      component.hasError = true;
      component.isImageLoaded = false;
      fixture.detectChanges();
      expect(container.classList.contains('loading')).toBe(false);
      expect(container.classList.contains('error')).toBe(true);
      expect(container.classList.contains('loaded')).toBe(false);

      // Loaded state
      component.isLoading = false;
      component.hasError = false;
      component.isImageLoaded = true;
      fixture.detectChanges();
      expect(container.classList.contains('loading')).toBe(false);
      expect(container.classList.contains('error')).toBe(false);
      expect(container.classList.contains('loaded')).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid gallery image', () => {
      const { ImageUtils } = await import('../../utils/image.utils');
      vi.mocked(ImageUtils.isValidGalleryImage).mockReturnValue(false);

      component.ngOnInit();

      expect(component.hasError).toBe(true);
    });

    it('should handle missing image input gracefully', () => {
      component.image = null as any;

      expect(() => component.ngOnInit()).not.toThrow();
      expect(component.hasError).toBe(true);
    });

    it('should handle retry beyond max attempts', () => {
      component.retryCount = 5; // Beyond max
      const event = new Event('click');

      expect(() => component.retryImageLoad(event)).not.toThrow();
    });

    it('should handle missing thumbnail ref during retry', () => {
      component.thumbnailImageRef = undefined;
      const event = new Event('click');

      expect(() => component.retryImageLoad(event)).not.toThrow();
    });

    it('should handle subscription errors gracefully', () => {
      // Mock error in loading state subscription
      const errorObservable = {
        subscribe: (observer: any) => {
          setTimeout(() => observer.error(new Error('Test error')), 0);
          return { unsubscribe: vi.fn() };
        }
      };

      mockImageLoadingService.getImageLoadingState = vi.fn().mockReturnValue(errorObservable);

      expect(() => {
        component.ngAfterViewInit();
      }).not.toThrow();
    });
  });
});