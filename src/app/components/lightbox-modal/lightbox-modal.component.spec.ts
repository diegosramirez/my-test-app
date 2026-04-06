import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { LightboxModalComponent } from './lightbox-modal.component';
import { ImageLoadingService } from '../../services/image-loading.service';
import { GalleryImage } from '../../types/gallery.types';

// Mock OverlayRef
class MockOverlayRef {
  dispose = vi.fn();
}

// Mock Overlay
class MockOverlay {
  create = vi.fn().mockReturnValue(new MockOverlayRef());
}

// Mock ImageLoadingService
class MockImageLoadingService {
  preloadImage = vi.fn().mockReturnValue(of('loaded'));
  trackEvent = vi.fn();

  setPreloadResult(result: 'loaded' | 'error') {
    if (result === 'error') {
      this.preloadImage = vi.fn().mockReturnValue(throwError(() => new Error('Preload failed')));
    } else {
      this.preloadImage = vi.fn().mockReturnValue(of(result));
    }
  }
}

// Mock ImageUtils
vi.mock('../../utils/image.utils', () => ({
  ImageUtils: {
    getOptimizedImageUrl: vi.fn((image: GalleryImage) => image.fullSizeUrl)
  }
}));

// Mock focus management
const mockFocus = vi.fn();
Object.defineProperty(HTMLElement.prototype, 'focus', {
  value: mockFocus,
  writable: true
});

describe('LightboxModalComponent', () => {
  let component: LightboxModalComponent;
  let fixture: ComponentFixture<LightboxModalComponent>;
  let mockOverlay: MockOverlay;
  let mockImageLoadingService: MockImageLoadingService;
  let originalBodyStyle: string;

  const mockImages: GalleryImage[] = [
    {
      id: 'image-1',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      fullSizeUrl: 'https://example.com/full1.jpg',
      alt: 'First image',
      caption: 'First image caption'
    },
    {
      id: 'image-2',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      fullSizeUrl: 'https://example.com/full2.jpg',
      alt: 'Second image'
    },
    {
      id: 'image-3',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      fullSizeUrl: 'https://example.com/full3.jpg',
      alt: 'Third image',
      caption: 'Third image caption'
    }
  ];

  beforeEach(async () => {
    mockOverlay = new MockOverlay();
    mockImageLoadingService = new MockImageLoadingService();

    // Store original body style
    originalBodyStyle = document.body.style.overflow;

    await TestBed.configureTestingModule({
      imports: [LightboxModalComponent],
      providers: [
        { provide: Overlay, useValue: mockOverlay },
        { provide: ImageLoadingService, useValue: mockImageLoadingService },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LightboxModalComponent);
    component = fixture.componentInstance;

    // Set default inputs
    component.images = mockImages;
    component.currentIndex = 0;
    component.visible = true;
  });

  afterEach(() => {
    // Restore body style
    document.body.style.overflow = originalBodyStyle;
    vi.clearAllMocks();
    mockFocus.mockClear();
  });

  describe('component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize correctly when visible', () => {
      component.ngOnInit();

      expect(component.currentImage).toBe(mockImages[0]);
      expect(component.currentImageUrl).toBe(mockImages[0].fullSizeUrl);
      expect(component.isImageLoading).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should not setup modal when not visible', () => {
      component.visible = false;
      component.ngOnInit();

      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('should focus modal after view init when visible', () => {
      component.ngOnInit();
      fixture.detectChanges();

      component.ngAfterViewInit();

      setTimeout(() => {
        expect(mockFocus).toHaveBeenCalled();
      }, 150);
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should close modal on Escape key', () => {
      spyOn(component.closed, 'emit');
      spyOn(component.navigationUsed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('keyboard');
      expect(component.closed.emit).toHaveBeenCalledWith({
        lastViewedIndex: 0,
        closeMethod: 'escape'
      });
    });

    it('should navigate to previous image on ArrowLeft', () => {
      component.currentIndex = 1;
      spyOn(component, 'navigatePrevious');
      spyOn(component.navigationUsed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      component.onKeydown(event);

      expect(component.navigatePrevious).toHaveBeenCalled();
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('keyboard');
    });

    it('should navigate to next image on ArrowRight', () => {
      spyOn(component, 'navigateNext');
      spyOn(component.navigationUsed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onKeydown(event);

      expect(component.navigateNext).toHaveBeenCalled();
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('keyboard');
    });

    it('should navigate to first image on Home key', () => {
      component.currentIndex = 2;
      spyOn(component, 'navigateToIndex');
      spyOn(component.navigationUsed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Home' });
      component.onKeydown(event);

      expect(component.navigateToIndex).toHaveBeenCalledWith(0);
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('keyboard');
    });

    it('should navigate to last image on End key', () => {
      spyOn(component, 'navigateToIndex');
      spyOn(component.navigationUsed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'End' });
      component.onKeydown(event);

      expect(component.navigateToIndex).toHaveBeenCalledWith(2);
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('keyboard');
    });

    it('should ignore keyboard events when not visible', () => {
      component.visible = false;
      spyOn(component, 'navigateNext');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onKeydown(event);

      expect(component.navigateNext).not.toHaveBeenCalled();
    });
  });

  describe('mouse interactions', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should close modal on overlay click', () => {
      spyOn(component.closed, 'emit');
      spyOn(component.navigationUsed, 'emit');

      const mockTarget = document.createElement('div');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: mockTarget, enumerable: true });
      Object.defineProperty(event, 'currentTarget', { value: mockTarget, enumerable: true });

      component.onOverlayClick(event);

      expect(component.closed.emit).toHaveBeenCalledWith({
        lastViewedIndex: 0,
        closeMethod: 'outside-click'
      });
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('mouse');
    });

    it('should not close modal when clicking on content', () => {
      spyOn(component.closed, 'emit');

      const overlay = document.createElement('div');
      const content = document.createElement('div');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: content, enumerable: true });
      Object.defineProperty(event, 'currentTarget', { value: overlay, enumerable: true });

      component.onOverlayClick(event);

      expect(component.closed.emit).not.toHaveBeenCalled();
    });

    it('should close modal on close button click', () => {
      spyOn(component.closed, 'emit');
      spyOn(component.navigationUsed, 'emit');

      component.onCloseClick();

      expect(component.closed.emit).toHaveBeenCalledWith({
        lastViewedIndex: 0,
        closeMethod: 'button'
      });
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('mouse');
    });
  });

  describe('navigation methods', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should navigate to previous image when not at beginning', () => {
      component.currentIndex = 1;
      spyOn(component, 'navigateToIndex');

      component.navigatePrevious();

      expect(component.navigateToIndex).toHaveBeenCalledWith(0);
    });

    it('should not navigate previous when at first image', () => {
      component.currentIndex = 0;
      spyOn(component, 'navigateToIndex');

      component.navigatePrevious();

      expect(component.navigateToIndex).not.toHaveBeenCalled();
    });

    it('should navigate to next image when not at end', () => {
      component.currentIndex = 1;
      spyOn(component, 'navigateToIndex');

      component.navigateNext();

      expect(component.navigateToIndex).toHaveBeenCalledWith(2);
    });

    it('should not navigate next when at last image', () => {
      component.currentIndex = 2;
      spyOn(component, 'navigateToIndex');

      component.navigateNext();

      expect(component.navigateToIndex).not.toHaveBeenCalled();
    });

    it('should navigate to specific valid index', () => {
      spyOn(component.imageChanged, 'emit');
      const initialIndex = component.currentIndex;

      component.navigateToIndex(1);

      expect(component.currentIndex).toBe(1);
      expect(component.currentImage).toBe(mockImages[1]);
      expect(component.imageChanged.emit).toHaveBeenCalledWith(1);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'modal_navigated',
        expect.objectContaining({
          to_image_id: mockImages[1].id,
          method: 'navigation_buttons',
          new_index: 1
        })
      );
    });

    it('should not navigate to invalid index', () => {
      const initialIndex = component.currentIndex;
      spyOn(component.imageChanged, 'emit');

      component.navigateToIndex(-1);
      expect(component.currentIndex).toBe(initialIndex);
      expect(component.imageChanged.emit).not.toHaveBeenCalled();

      component.navigateToIndex(5);
      expect(component.currentIndex).toBe(initialIndex);
      expect(component.imageChanged.emit).not.toHaveBeenCalled();
    });

    it('should not navigate to same index', () => {
      spyOn(component.imageChanged, 'emit');

      component.navigateToIndex(component.currentIndex);

      expect(component.imageChanged.emit).not.toHaveBeenCalled();
    });
  });

  describe('image loading', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should load current image on initialization', () => {
      expect(mockImageLoadingService.preloadImage).toHaveBeenCalledWith(mockImages[0]);
    });

    it('should handle successful image load', () => {
      mockImageLoadingService.setPreloadResult('loaded');

      component.onImageLoad();

      expect(component.isImageLoading).toBe(false);
      expect(component.hasImageError).toBe(false);
    });

    it('should handle image load error', () => {
      component.onImageError();

      expect(component.isImageLoading).toBe(false);
      expect(component.hasImageError).toBe(true);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'image_error',
        expect.objectContaining({
          image_id: mockImages[0].id,
          error_type: 'lightbox_load_failure',
          context: 'lightbox'
        })
      );
    });

    it('should retry current image loading', () => {
      component.hasImageError = true;

      component.retryCurrentImage();

      expect(component.hasImageError).toBe(false);
      expect(component.isImageLoading).toBe(true);
      expect(mockImageLoadingService.preloadImage).toHaveBeenCalledWith(mockImages[0]);
    });

    it('should handle navigation and load new image', () => {
      component.navigateToIndex(1);

      expect(component.currentImage).toBe(mockImages[1]);
      expect(component.isImageLoading).toBe(true);
      expect(mockImageLoadingService.preloadImage).toHaveBeenCalledWith(mockImages[1]);
    });

    it('should handle preload errors gracefully', () => {
      mockImageLoadingService.setPreloadResult('error');
      spyOn(component, 'onImageError');

      // Trigger image loading through navigation
      component.navigateToIndex(1);

      // Error should be handled
      setTimeout(() => {
        expect(component.onImageError).toHaveBeenCalled();
      }, 0);
    });
  });

  describe('touch events', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
      mockElement = document.createElement('div');
      component.overlayElementRef = { nativeElement: mockElement } as any;

      // Set up component to handle touch events
      component.ngAfterViewInit();
    });

    it('should handle swipe right (previous image)', () => {
      component.currentIndex = 1;
      spyOn(component, 'navigatePrevious');
      spyOn(component.navigationUsed, 'emit');

      // Simulate touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component['onTouchStart'](touchStartEvent);

      // Simulate touch end (swipe right)
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch]
      });
      component['onTouchEnd'](touchEndEvent);

      expect(component.navigatePrevious).toHaveBeenCalled();
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('touch');
    });

    it('should handle swipe left (next image)', () => {
      spyOn(component, 'navigateNext');
      spyOn(component.navigationUsed, 'emit');

      // Simulate touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch]
      });
      component['onTouchStart'](touchStartEvent);

      // Simulate touch end (swipe left)
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component['onTouchEnd'](touchEndEvent);

      expect(component.navigateNext).toHaveBeenCalled();
      expect(component.navigationUsed.emit).toHaveBeenCalledWith('touch');
    });

    it('should ignore vertical swipes', () => {
      spyOn(component, 'navigateNext');
      spyOn(component, 'navigatePrevious');

      // Simulate touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component['onTouchStart'](touchStartEvent);

      // Simulate vertical swipe
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 105, clientY: 200 } as Touch]
      });
      component['onTouchEnd'](touchEndEvent);

      expect(component.navigateNext).not.toHaveBeenCalled();
      expect(component.navigatePrevious).not.toHaveBeenCalled();
    });

    it('should ignore small movements', () => {
      spyOn(component, 'navigateNext');
      spyOn(component, 'navigatePrevious');

      // Simulate touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component['onTouchStart'](touchStartEvent);

      // Simulate small movement
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 130, clientY: 100 } as Touch]
      });
      component['onTouchEnd'](touchEndEvent);

      expect(component.navigateNext).not.toHaveBeenCalled();
      expect(component.navigatePrevious).not.toHaveBeenCalled();
    });

    it('should handle touch events without touches gracefully', () => {
      expect(() => {
        const touchEndEvent = new TouchEvent('touchend', { changedTouches: [] });
        component['onTouchEnd'](touchEndEvent);
      }).not.toThrow();
    });
  });

  describe('focus management', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should store focused element before modal opens', () => {
      const mockActiveElement = document.createElement('button');
      Object.defineProperty(document, 'activeElement', {
        value: mockActiveElement,
        configurable: true
      });

      component['setupModal']();

      expect(component['focusedElementBeforeModal']).toBe(mockActiveElement);
    });

    it('should restore focus when modal is destroyed', () => {
      const mockActiveElement = document.createElement('button');
      component['focusedElementBeforeModal'] = mockActiveElement;

      component['destroyModal']();

      expect(mockFocus).toHaveBeenCalledWith();
    });

    it('should prevent body scroll when modal is open', () => {
      component['setupModal']();

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      document.body.style.overflow = 'hidden';

      component['destroyModal']();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('component lifecycle', () => {
    it('should cleanup on destroy', () => {
      component.ngOnInit();
      component.ngAfterViewInit();

      const destroySpy = spyOn(component as any, 'destroyModal');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should handle SSR (server-side rendering)', () => {
      // Create component with server platform
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [LightboxModalComponent],
        providers: [
          { provide: Overlay, useValue: mockOverlay },
          { provide: ImageLoadingService, useValue: mockImageLoadingService },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      fixture = TestBed.createComponent(LightboxModalComponent);
      component = fixture.componentInstance;
      component.images = mockImages;
      component.visible = true;

      expect(() => {
        component.ngOnInit();
        component.ngAfterViewInit();
        component.ngOnDestroy();
      }).not.toThrow();
    });

    it('should handle initialization without overlay element ref', () => {
      component.overlayElementRef = undefined;

      expect(() => {
        component.ngAfterViewInit();
      }).not.toThrow();
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should render modal with correct accessibility attributes', () => {
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.lightbox-overlay');
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-label')).toContain('Image viewer showing image 1 of 3');
    });

    it('should show close button with proper accessibility', () => {
      fixture.detectChanges();

      const closeButton = fixture.nativeElement.querySelector('.lightbox-close');
      expect(closeButton).toBeTruthy();
      expect(closeButton.getAttribute('aria-label')).toBe('Close image viewer');
    });

    it('should show navigation buttons when multiple images', () => {
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('.lightbox-nav-prev');
      const nextButton = fixture.nativeElement.querySelector('.lightbox-nav-next');

      expect(prevButton).toBeTruthy();
      expect(nextButton).toBeTruthy();
      expect(prevButton.getAttribute('aria-label')).toBe('Previous image');
      expect(nextButton.getAttribute('aria-label')).toBe('Next image');
    });

    it('should not show navigation buttons for single image', () => {
      component.images = [mockImages[0]];
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('.lightbox-nav-prev');
      const nextButton = fixture.nativeElement.querySelector('.lightbox-nav-next');

      expect(prevButton).toBeFalsy();
      expect(nextButton).toBeFalsy();
    });

    it('should disable previous button when at first image', () => {
      component.currentIndex = 0;
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('.lightbox-nav-prev');
      expect(prevButton.disabled).toBe(true);
    });

    it('should disable next button when at last image', () => {
      component.currentIndex = 2;
      fixture.detectChanges();

      const nextButton = fixture.nativeElement.querySelector('.lightbox-nav-next');
      expect(nextButton.disabled).toBe(true);
    });

    it('should show loading state when image is loading', () => {
      component.isImageLoading = true;
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.lightbox-loading');
      const image = fixture.nativeElement.querySelector('.lightbox-image');

      expect(loading).toBeTruthy();
      expect(image).toBeFalsy();
    });

    it('should show error state when image failed to load', () => {
      component.isImageLoading = false;
      component.hasImageError = true;
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.lightbox-error');
      const retryButton = fixture.nativeElement.querySelector('.retry-button');

      expect(error).toBeTruthy();
      expect(retryButton).toBeTruthy();
    });

    it('should show image when loaded successfully', () => {
      component.isImageLoading = false;
      component.hasImageError = false;
      fixture.detectChanges();

      const image = fixture.nativeElement.querySelector('.lightbox-image');
      expect(image).toBeTruthy();
      expect(image.src).toBe(mockImages[0].fullSizeUrl);
      expect(image.alt).toBe(mockImages[0].alt);
    });

    it('should show image counter', () => {
      component.isImageLoading = false;
      fixture.detectChanges();

      const counter = fixture.nativeElement.querySelector('.image-counter');
      expect(counter).toBeTruthy();
      expect(counter.textContent.trim()).toBe('1 / 3');
      expect(counter.getAttribute('aria-label')).toBe('Image 1 of 3');
    });

    it('should show caption when available', () => {
      component.isImageLoading = false;
      component.currentImage = mockImages[0]; // Has caption
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.image-caption');
      expect(caption).toBeTruthy();
      expect(caption.textContent.trim()).toBe(mockImages[0].caption);
      expect(caption.getAttribute('aria-label')).toBe(`Caption: ${mockImages[0].caption}`);
    });

    it('should not show caption when not available', () => {
      component.isImageLoading = false;
      component.currentImage = mockImages[1]; // No caption
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.image-caption');
      expect(caption).toBeFalsy();
    });

    it('should have keyboard instructions for screen readers', () => {
      fixture.detectChanges();

      const instructions = fixture.nativeElement.querySelector('[aria-label="Keyboard instructions"]');
      expect(instructions).toBeTruthy();
      expect(instructions.textContent).toContain('Use arrow keys to navigate');
      expect(instructions.textContent).toContain('Press Escape to close');
    });

    it('should prevent image dragging', () => {
      component.isImageLoading = false;
      fixture.detectChanges();

      const image = fixture.nativeElement.querySelector('.lightbox-image');
      expect(image.draggable).toBe(false);

      // Test drag event prevention
      const dragEvent = new DragEvent('dragstart');
      spyOn(dragEvent, 'preventDefault');

      image.dispatchEvent(dragEvent);
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty images array', () => {
      component.images = [];
      component.currentIndex = 0;

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();

      expect(component.currentImage).toBeUndefined();
    });

    it('should handle invalid current index', () => {
      component.currentIndex = 10; // Beyond array length

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle navigation without current image', () => {
      component.currentImage = undefined;

      expect(() => {
        component.retryCurrentImage();
      }).not.toThrow();
    });

    it('should handle keyboard events when images array is empty', () => {
      component.images = [];

      expect(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        component.onKeydown(event);
      }).not.toThrow();
    });

    it('should handle touch events without overlay element', () => {
      component.overlayElementRef = undefined;

      expect(() => {
        component.ngAfterViewInit();
      }).not.toThrow();
    });

    it('should handle missing document or body in SSR', () => {
      const originalDocument = global.document;
      global.document = undefined as any;

      expect(() => {
        component['setupModal']();
        component['destroyModal']();
      }).not.toThrow();

      global.document = originalDocument;
    });
  });
});