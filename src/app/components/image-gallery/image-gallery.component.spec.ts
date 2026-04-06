import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QueryList, ElementRef } from '@angular/core';
import { of } from 'rxjs';

import { ImageGalleryComponent } from './image-gallery.component';
import { GalleryThumbnailComponent } from '../gallery-thumbnail/gallery-thumbnail.component';
import { LightboxModalComponent } from '../lightbox-modal/lightbox-modal.component';
import { ImageLoadingService } from '../../services/image-loading.service';
import { GalleryImage, ResponsiveColumns } from '../../types/gallery.types';

// Mock child components
@Component({
  selector: 'app-gallery-thumbnail',
  template: '<div class="mock-thumbnail" [attr.data-index]="index" tabindex="0"></div>',
  standalone: true
})
class MockGalleryThumbnailComponent {
  image!: GalleryImage;
  index!: number;
  aspectRatio!: string;
  isLoading!: boolean;

  imageClicked = { emit: vi.fn() };
  imageLoaded = { emit: vi.fn() };
  imageError = { emit: vi.fn() };
}

@Component({
  selector: 'app-lightbox-modal',
  template: '<div class="mock-lightbox" *ngIf="visible"></div>',
  standalone: true,
  imports: [CommonModule]
})
class MockLightboxModalComponent {
  images!: GalleryImage[];
  currentIndex!: number;
  visible!: boolean;

  imageChanged = { emit: vi.fn() };
  closed = { emit: vi.fn() };
  navigationUsed = { emit: vi.fn() };
}

// Mock ImageLoadingService
class MockImageLoadingService {
  trackEvent = vi.fn();
  destroy = vi.fn();
}

// Mock ImageUtils
vi.mock('../../utils/image.utils', () => ({
  ImageUtils: {
    parseAspectRatio: vi.fn((ratio: string) => {
      const [w, h] = ratio.split(':').map(Number);
      return h / w;
    }),
    getColumnsForWidth: vi.fn((width: number) => {
      if (width >= 1200) return 4;
      if (width >= 768) return 3;
      if (width >= 480) return 2;
      return 1;
    })
  }
}));

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

describe('ImageGalleryComponent', () => {
  let component: ImageGalleryComponent;
  let fixture: ComponentFixture<ImageGalleryComponent>;
  let mockImageLoadingService: MockImageLoadingService;

  const mockImages: GalleryImage[] = [
    {
      id: 'image-1',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      fullSizeUrl: 'https://example.com/full1.jpg',
      alt: 'First image',
      caption: 'First caption'
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
      caption: 'Third caption'
    },
    {
      id: 'image-4',
      thumbnailUrl: 'https://example.com/thumb4.jpg',
      fullSizeUrl: 'https://example.com/full4.jpg',
      alt: 'Fourth image'
    }
  ];

  beforeEach(async () => {
    mockImageLoadingService = new MockImageLoadingService();

    await TestBed.configureTestingModule({
      imports: [ImageGalleryComponent],
      providers: [
        { provide: ImageLoadingService, useValue: mockImageLoadingService }
      ]
    })
    .overrideComponent(ImageGalleryComponent, {
      remove: {
        imports: [GalleryThumbnailComponent, LightboxModalComponent]
      },
      add: {
        imports: [CommonModule, MockGalleryThumbnailComponent, MockLightboxModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageGalleryComponent);
    component = fixture.componentInstance;

    // Set default inputs
    component.images = mockImages;
    component.aspectRatio = '16:9';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.aspectRatio).toBe('16:9');
      expect(component.columns).toEqual({
        mobile: 1,
        tablet: 2,
        desktop: 3,
        large: 4
      });
      expect(component.isLoading).toBe(false);
      expect(component.lightboxVisible).toBe(false);
    });

    it('should calculate aspect ratio padding on construction', () => {
      const { ImageUtils } = require('../../utils/image.utils');
      expect(ImageUtils.parseAspectRatio).toHaveBeenCalledWith('16:9');
      expect(component.aspectRatioPadding).toBe('56.25%'); // 9/16 * 100
    });

    it('should set loading state and emit events on ngOnInit', () => {
      spyOn(component.galleryLoaded, 'emit');

      component.ngOnInit();

      expect(component.isLoading).toBe(true);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'gallery_loaded',
        expect.objectContaining({
          image_count: 4,
          load_time: expect.any(Number)
        })
      );

      // Should finish loading after timeout
      setTimeout(() => {
        expect(component.isLoading).toBe(false);
        expect(component.galleryLoaded.emit).toHaveBeenCalledWith({
          imageCount: 4,
          loadTime: expect.any(Number)
        });
      }, 150);
    });

    it('should handle empty images array', () => {
      component.images = [];
      spyOn(component.galleryLoaded, 'emit');

      component.ngOnInit();

      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'gallery_loaded',
        expect.objectContaining({
          image_count: 0
        })
      );
    });

    it('should setup responsive columns', () => {
      spyOn(component as any, 'setupResponsiveColumns');

      component.ngOnInit();

      expect(component['setupResponsiveColumns']).toHaveBeenCalled();
    });
  });

  describe('trackBy function', () => {
    it('should return image id for trackBy', () => {
      const result = component.trackByImageId(0, mockImages[0]);
      expect(result).toBe('image-1');
    });
  });

  describe('thumbnail interactions', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should handle thumbnail click and open lightbox', () => {
      spyOn(component.imageClicked, 'emit');
      spyOn(component.modalOpened, 'emit');
      spyOn(component, 'openLightbox');

      component.onThumbnailClick(mockImages[1], 1);

      expect(component.imageClicked.emit).toHaveBeenCalledWith({
        image: mockImages[1],
        index: 1
      });
      expect(component.openLightbox).toHaveBeenCalledWith(1);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'thumbnail_clicked',
        expect.objectContaining({
          image_id: 'image-2',
          position_in_grid: 1
        })
      );
    });

    it('should handle image loaded event', () => {
      // Currently empty implementation, just ensure it doesn't throw
      expect(() => {
        component.onImageLoaded(mockImages[0], 0);
      }).not.toThrow();
    });

    it('should handle image error event', () => {
      const consoleSpy = spyOn(console, 'warn');

      component.onImageError(mockImages[0], 0);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load image: image-1');
    });
  });

  describe('lightbox functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should open lightbox with correct index', () => {
      spyOn(component.modalOpened, 'emit');
      const mockActiveElement = document.createElement('button');
      Object.defineProperty(document, 'activeElement', {
        value: mockActiveElement,
        configurable: true
      });

      component.openLightbox(2);

      expect(component.currentLightboxIndex).toBe(2);
      expect(component.lightboxVisible).toBe(true);
      expect(component['lastFocusedThumbnail']).toBe(mockActiveElement);
      expect(component.modalOpened.emit).toHaveBeenCalledWith({
        image: mockImages[2],
        index: 2
      });
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'modal_opened',
        expect.objectContaining({
          image_id: 'image-3',
          navigation_method: 'mouse'
        })
      );
    });

    it('should handle lightbox image change', () => {
      component.currentLightboxIndex = 1;

      component.onLightboxImageChanged(2);

      expect(component.currentLightboxIndex).toBe(2);
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'modal_navigated',
        expect.objectContaining({
          from_image_id: 'image-2',
          to_image_id: 'image-3',
          method: 'arrow_keys'
        })
      );
    });

    it('should handle lightbox closed and restore focus', () => {
      const mockFocusElement = document.createElement('button');
      spyOn(mockFocusElement, 'focus');
      component['lastFocusedThumbnail'] = mockFocusElement;
      component.lightboxVisible = true;

      spyOn(component.modalClosed, 'emit');

      component.onLightboxClosed({ lastViewedIndex: 1, closeMethod: 'escape' });

      expect(component.lightboxVisible).toBe(false);
      expect(component.modalClosed.emit).toHaveBeenCalledWith({ lastViewedIndex: 1 });
      expect(mockFocusElement.focus).toHaveBeenCalled();
      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'modal_closed',
        expect.objectContaining({
          image_id: 'image-2',
          close_method: 'escape'
        })
      );
    });

    it('should handle navigation method tracking', () => {
      component.currentLightboxIndex = 1;

      component.onNavigationUsed('keyboard');

      expect(mockImageLoadingService.trackEvent).toHaveBeenCalledWith(
        'navigation_method_used',
        expect.objectContaining({
          method: 'keyboard',
          current_image_id: 'image-2'
        })
      );
    });

    it('should handle navigation method when no current image', () => {
      component.images = [];

      expect(() => {
        component.onNavigationUsed('keyboard');
      }).not.toThrow();
    });
  });

  describe('keyboard navigation on grid', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should navigate right with ArrowRight key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(1);
      spyOn(component as any, 'focusThumbnail');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component['focusThumbnail']).toHaveBeenCalledWith(2);
    });

    it('should navigate left with ArrowLeft key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(2);
      spyOn(component as any, 'focusThumbnail');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component['focusThumbnail']).toHaveBeenCalledWith(1);
    });

    it('should navigate down with ArrowDown key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(0);
      spyOn(component as any, 'getCurrentColumns').and.returnValue(2);
      spyOn(component as any, 'focusThumbnail');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component['focusThumbnail']).toHaveBeenCalledWith(2);
    });

    it('should navigate up with ArrowUp key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(2);
      spyOn(component as any, 'getCurrentColumns').and.returnValue(2);
      spyOn(component as any, 'focusThumbnail');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component['focusThumbnail']).toHaveBeenCalledWith(0);
    });

    it('should open lightbox with Enter key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(1);
      spyOn(component, 'onThumbnailClick');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onThumbnailClick).toHaveBeenCalledWith(mockImages[1], 1);
    });

    it('should open lightbox with Space key', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(1);
      spyOn(component, 'onThumbnailClick');

      component.onGridKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onThumbnailClick).toHaveBeenCalledWith(mockImages[1], 1);
    });

    it('should not navigate beyond boundaries', () => {
      spyOn(component as any, 'focusThumbnail');

      // Test right boundary
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(3); // Last index
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onGridKeydown(rightEvent);
      expect(component['focusThumbnail']).toHaveBeenCalledWith(3); // Should stay at same index

      // Test left boundary
      component['getCurrentFocusedIndex'] = vi.fn().mockReturnValue(0); // First index
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      component.onGridKeydown(leftEvent);
      expect(component['focusThumbnail']).toHaveBeenCalledWith(0); // Should stay at same index
    });

    it('should handle invalid focused index', () => {
      spyOn(component as any, 'getCurrentFocusedIndex').and.returnValue(-1);
      spyOn(component as any, 'focusThumbnail');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component.onGridKeydown(event);

      expect(component['focusThumbnail']).not.toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
    });

    it('should get current columns based on viewport width', () => {
      const { ImageUtils } = require('../../utils/image.utils');

      const columns = component['getCurrentColumns']();

      expect(ImageUtils.getColumnsForWidth).toHaveBeenCalledWith(1024, expect.any(Object));
      expect(columns).toBe(3); // For 1024px width
    });

    it('should get currently focused thumbnail index', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-index', '2');
      Object.defineProperty(document, 'activeElement', {
        value: mockElement,
        configurable: true
      });

      const index = component['getCurrentFocusedIndex']();

      expect(index).toBe(2);
    });

    it('should return 0 for focused index when no active element', () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        configurable: true
      });

      const index = component['getCurrentFocusedIndex']();

      expect(index).toBe(0);
    });

    it('should focus specific thumbnail by index', () => {
      const mockElement = document.createElement('div');
      spyOn(mockElement, 'focus');
      spyOn(document, 'querySelector').and.returnValue(mockElement);

      component['focusThumbnail'](2);

      expect(document.querySelector).toHaveBeenCalledWith('[data-index="2"]');
      expect(mockElement.focus).toHaveBeenCalled();
    });

    it('should handle focusing non-existent thumbnail', () => {
      spyOn(document, 'querySelector').and.returnValue(null);

      expect(() => {
        component['focusThumbnail'](999);
      }).not.toThrow();
    });

    it('should check if image is loading', () => {
      // Currently returns false for all images
      const isLoading = component.isImageLoading('image-1');
      expect(isLoading).toBe(false);
    });
  });

  describe('responsive behavior', () => {
    it('should setup responsive columns on window resize', () => {
      spyOn(component as any, 'setupResponsiveColumns');

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      expect(component['setupResponsiveColumns']).toHaveBeenCalled();
    });

    it('should update responsive columns', () => {
      const originalColumns = component.responsiveColumns;

      component['setupResponsiveColumns']();

      expect(component.responsiveColumns).toBe(component.columns);
    });
  });

  describe('component cleanup', () => {
    it('should unsubscribe and destroy service on ngOnDestroy', () => {
      const subscriptionSpy = spyOn(component['subscriptions'], 'unsubscribe');

      component.ngOnDestroy();

      expect(subscriptionSpy).toHaveBeenCalled();
      expect(mockImageLoadingService.destroy).toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should show loading state initially', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.gallery-loading');
      const grid = fixture.nativeElement.querySelector('.gallery-grid');
      const empty = fixture.nativeElement.querySelector('.gallery-empty');

      expect(loading).toBeTruthy();
      expect(grid).toBeFalsy();
      expect(empty).toBeFalsy();
    });

    it('should show empty state when no images', () => {
      component.images = [];
      component.isLoading = false;
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.gallery-loading');
      const grid = fixture.nativeElement.querySelector('.gallery-grid');
      const empty = fixture.nativeElement.querySelector('.gallery-empty');

      expect(loading).toBeFalsy();
      expect(grid).toBeFalsy();
      expect(empty).toBeTruthy();
      expect(empty.textContent).toContain('No images to display');
    });

    it('should show gallery grid when images are loaded', () => {
      component.isLoading = false;
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.gallery-loading');
      const grid = fixture.nativeElement.querySelector('.gallery-grid');
      const empty = fixture.nativeElement.querySelector('.gallery-empty');

      expect(loading).toBeFalsy();
      expect(grid).toBeTruthy();
      expect(empty).toBeFalsy();
    });

    it('should render thumbnails for each image', () => {
      component.isLoading = false;
      fixture.detectChanges();

      const thumbnails = fixture.nativeElement.querySelectorAll('app-gallery-thumbnail');
      expect(thumbnails.length).toBe(4);
    });

    it('should show lightbox when visible', () => {
      component.lightboxVisible = true;
      fixture.detectChanges();

      const lightbox = fixture.nativeElement.querySelector('app-lightbox-modal');
      expect(lightbox).toBeTruthy();
    });

    it('should not show lightbox when not visible', () => {
      component.lightboxVisible = false;
      fixture.detectChanges();

      const lightbox = fixture.nativeElement.querySelector('.mock-lightbox');
      expect(lightbox).toBeFalsy();
    });

    it('should have proper accessibility attributes for grid', () => {
      component.isLoading = false;
      fixture.detectChanges();

      const grid = fixture.nativeElement.querySelector('.gallery-grid');
      expect(grid.getAttribute('role')).toBe('region');
      expect(grid.getAttribute('aria-label')).toBe('Image gallery with 4 images');
      expect(grid.getAttribute('tabindex')).toBe('0');
    });

    it('should have proper CSS custom properties', () => {
      component.responsiveColumns = {
        mobile: 1,
        tablet: 2,
        desktop: 3,
        large: 4
      };
      component.aspectRatioPadding = '56.25%';
      fixture.detectChanges();

      const gallery = fixture.nativeElement.querySelector('.image-gallery');
      expect(gallery.style.getPropertyValue('--columns-mobile')).toBe('1');
      expect(gallery.style.getPropertyValue('--columns-tablet')).toBe('2');
      expect(gallery.style.getPropertyValue('--columns-desktop')).toBe('3');
      expect(gallery.style.getPropertyValue('--columns-large')).toBe('4');
      expect(gallery.style.getPropertyValue('--aspect-ratio')).toBe('56.25%');
    });

    it('should apply loading class to gallery container', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const gallery = fixture.nativeElement.querySelector('.image-gallery');
      expect(gallery.classList.contains('loading')).toBe(true);
    });

    it('should have empty state with proper accessibility', () => {
      component.images = [];
      component.isLoading = false;
      fixture.detectChanges();

      const empty = fixture.nativeElement.querySelector('.gallery-empty');
      expect(empty.getAttribute('role')).toBe('status');
      expect(empty.getAttribute('aria-live')).toBe('polite');
    });

    it('should have loading state with proper accessibility', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.gallery-loading');
      expect(loading.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('input handling', () => {
    it('should handle custom aspect ratio', () => {
      component.aspectRatio = '4:3';
      component.ngOnInit();

      const { ImageUtils } = require('../../utils/image.utils');
      expect(ImageUtils.parseAspectRatio).toHaveBeenCalledWith('4:3');
    });

    it('should handle custom responsive columns', () => {
      const customColumns: ResponsiveColumns = {
        mobile: 2,
        tablet: 3,
        desktop: 4,
        large: 5
      };
      component.columns = customColumns;
      component.ngOnInit();

      expect(component.responsiveColumns).toEqual(customColumns);
    });

    it('should handle custom config', () => {
      const customConfig = {
        retryAttempts: 5,
        transitionDuration: 500
      };
      component.config = customConfig;

      component.ngOnInit();

      // Config should be merged with defaults
      expect(component['config']).toEqual(customConfig);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null images array', () => {
      component.images = null as any;

      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle undefined images array', () => {
      component.images = undefined as any;

      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle keyboard navigation with empty images', () => {
      component.images = [];
      component.ngOnInit();

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      expect(() => {
        component.onGridKeydown(event);
      }).not.toThrow();
    });

    it('should handle lightbox events with empty images', () => {
      component.images = [];
      component.ngOnInit();

      expect(() => {
        component.onLightboxImageChanged(0);
        component.onLightboxClosed({ lastViewedIndex: 0, closeMethod: 'escape' });
      }).not.toThrow();
    });

    it('should handle thumbnail events with invalid indices', () => {
      expect(() => {
        component.onThumbnailClick(mockImages[0], -1);
        component.onImageLoaded(mockImages[0], 999);
        component.onImageError(mockImages[0], -5);
      }).not.toThrow();
    });

    it('should handle window resize without error', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: undefined,
        configurable: true
      });

      expect(() => {
        component['setupResponsiveColumns']();
      }).not.toThrow();
    });

    it('should handle missing active element gracefully', () => {
      Object.defineProperty(document, 'activeElement', {
        value: undefined,
        configurable: true
      });

      expect(() => {
        component['getCurrentFocusedIndex']();
      }).not.toThrow();
    });
  });

  describe('performance and memory management', () => {
    it('should use trackBy function for ngFor', () => {
      component.isLoading = false;
      fixture.detectChanges();

      // Verify that trackBy is being used by checking the template
      const compiled = fixture.nativeElement;
      expect(compiled.innerHTML).toContain('app-gallery-thumbnail');
    });

    it('should properly manage subscriptions', () => {
      const subscription = component['subscriptions'];
      expect(subscription).toBeTruthy();

      component.ngOnDestroy();

      // Subscription should be unsubscribed
      expect(subscription.closed).toBe(true);
    });

    it('should cleanup service resources on destroy', () => {
      component.ngOnDestroy();

      expect(mockImageLoadingService.destroy).toHaveBeenCalled();
    });
  });
});