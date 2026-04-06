import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { ImageGalleryComponent } from './image-gallery.component';
import { GalleryService } from './services/gallery.service';
import { GalleryThumbnailComponent } from './gallery-thumbnail/gallery-thumbnail.component';
import { LightboxModalComponent } from './lightbox-modal/lightbox-modal.component';
import {
  ImageItem,
  GalleryState,
  LoadingState,
  DEFAULT_GALLERY_CONFIG,
  GalleryEvent
} from './types/image-gallery.types';

// Mock GalleryService
class MockGalleryService {
  private stateSubject = new BehaviorSubject<GalleryState>({
    selectedIndex: -1,
    isModalOpen: false,
    loadingStates: new Map(),
    errorStates: new Map()
  });

  state$ = this.stateSubject.asObservable();

  trackComponentLoadTime = vi.fn();
  getPerformanceMetrics = vi.fn().mockReturnValue({
    componentLoadTime: 150,
    totalMemoryUsageMB: 25,
    imageCount: 20,
    imageLoadTimes: new Map(),
    navigationResponseTimes: new Map()
  });
  openModal = vi.fn((index: number) => {
    this.stateSubject.next({
      ...this.stateSubject.value,
      selectedIndex: index,
      isModalOpen: true
    });
  });
  closeModal = vi.fn(() => {
    this.stateSubject.next({
      ...this.stateSubject.value,
      isModalOpen: false
    });
  });
  navigateToImage = vi.fn();
  untrackImageMemoryUsage = vi.fn();
  setImageLoadingState = vi.fn();
  setImageErrorState = vi.fn();
}

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test wrapper component for viewport testing
@Component({
  standalone: true,
  imports: [ImageGalleryComponent],
  template: `
    <div [style.width.px]="containerWidth" [style.height.px]="containerHeight">
      <app-image-gallery
        [images]="images"
        [config]="config"
        [showPerformanceInfo]="showPerformanceInfo"
        [showNavigationHints]="showNavigationHints"
        (galleryLoaded)="onGalleryLoaded($event)"
        (imageOpened)="onImageOpened($event)"
        (modalClosed)="onModalClosed($event)"
        (navigationUsed)="onNavigationUsed($event)"
        (errorOccurred)="onErrorOccurred($event)"
      />
    </div>
  `
})
class TestWrapperComponent {
  containerWidth = 1200;
  containerHeight = 800;
  images: ImageItem[] = [];
  config = DEFAULT_GALLERY_CONFIG;
  showPerformanceInfo = false;
  showNavigationHints = true;

  galleryLoadedEvent: GalleryEvent | null = null;
  imageOpenedEvent: GalleryEvent | null = null;
  modalClosedEvent: GalleryEvent | null = null;
  navigationUsedEvent: GalleryEvent | null = null;
  errorOccurredEvent: GalleryEvent | null = null;

  onGalleryLoaded(event: GalleryEvent) { this.galleryLoadedEvent = event; }
  onImageOpened(event: GalleryEvent) { this.imageOpenedEvent = event; }
  onModalClosed(event: GalleryEvent) { this.modalClosedEvent = event; }
  onNavigationUsed(event: GalleryEvent) { this.navigationUsedEvent = event; }
  onErrorOccurred(event: GalleryEvent) { this.errorOccurredEvent = event; }
}

describe('ImageGalleryComponent', () => {
  let component: ImageGalleryComponent;
  let fixture: ComponentFixture<ImageGalleryComponent>;
  let mockGalleryService: MockGalleryService;
  let wrapperComponent: TestWrapperComponent;
  let wrapperFixture: ComponentFixture<TestWrapperComponent>;

  const mockImages: ImageItem[] = [
    {
      id: 'img-1',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      fullSizeUrl: 'https://example.com/full1.jpg',
      alt: 'Test image 1',
      title: 'Test Image 1'
    },
    {
      id: 'img-2',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      fullSizeUrl: 'https://example.com/full2.jpg',
      alt: 'Test image 2',
      title: 'Test Image 2'
    },
    {
      id: 'img-3',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
      fullSizeUrl: 'https://example.com/full3.jpg',
      alt: 'Test image 3',
      title: 'Test Image 3'
    }
  ];

  beforeEach(async () => {
    mockGalleryService = new MockGalleryService();

    await TestBed.configureTestingModule({
      imports: [
        ImageGalleryComponent,
        GalleryThumbnailComponent,
        LightboxModalComponent,
        TestWrapperComponent
      ],
      providers: [
        { provide: GalleryService, useValue: mockGalleryService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGalleryComponent);
    component = fixture.componentInstance;
    component.images = mockImages;

    wrapperFixture = TestBed.createComponent(TestWrapperComponent);
    wrapperComponent = wrapperFixture.componentInstance;
    wrapperComponent.images = mockImages;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should render within 200ms and emit galleryLoaded event', fakeAsync(() => {
      const startTime = performance.now();

      fixture.detectChanges();
      tick(0); // Allow setTimeout to execute

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200);
      expect(mockGalleryService.trackComponentLoadTime).toHaveBeenCalled();

      flush();
    }));

    it('should initialize with correct default values', () => {
      expect(component.images).toEqual(mockImages);
      expect(component.config).toEqual(DEFAULT_GALLERY_CONFIG);
      expect(component.showPerformanceInfo).toBe(false);
      expect(component.showNavigationHints).toBe(true);
      expect(component.selectedImageIndex).toBe(-1);
      expect(component.isModalOpen).toBe(false);
    });

    it('should track component load time and emit galleryLoaded event', fakeAsync(() => {
      wrapperFixture.detectChanges();
      tick(0);

      expect(mockGalleryService.trackComponentLoadTime).toHaveBeenCalled();
      expect(wrapperComponent.galleryLoadedEvent).toBeTruthy();
      expect(wrapperComponent.galleryLoadedEvent?.imageIndex).toBe(mockImages.length);
      expect(wrapperComponent.galleryLoadedEvent?.loadTime).toBeGreaterThan(0);

      flush();
    }));
  });

  describe('Responsive Grid Layout', () => {
    it('should display 1 column on mobile viewport (< 768px)', fakeAsync(() => {
      wrapperComponent.containerWidth = 500;
      wrapperFixture.detectChanges();
      tick(100);

      const galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );

      expect(galleryElement).toBeTruthy();
      // Check CSS grid columns via computed style or data attribute
      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('1');

      flush();
    }));

    it('should display 2 columns on tablet viewport (768px - 1023px)', fakeAsync(() => {
      wrapperComponent.containerWidth = 800;
      wrapperFixture.detectChanges();
      tick(100);

      const galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );

      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('2');

      flush();
    }));

    it('should display 3 columns on desktop viewport (1024px - 1439px)', fakeAsync(() => {
      wrapperComponent.containerWidth = 1200;
      wrapperFixture.detectChanges();
      tick(100);

      const galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );

      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('3');

      flush();
    }));

    it('should display 4 columns on large desktop viewport (>= 1440px)', fakeAsync(() => {
      wrapperComponent.containerWidth = 1600;
      wrapperFixture.detectChanges();
      tick(100);

      const galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );

      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('4');

      flush();
    }));

    it('should update column count when viewport size changes', fakeAsync(() => {
      // Start with desktop
      wrapperComponent.containerWidth = 1200;
      wrapperFixture.detectChanges();
      tick(100);

      let galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );
      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('3');

      // Change to mobile
      wrapperComponent.containerWidth = 500;
      wrapperFixture.detectChanges();
      tick(250); // debounce delay

      galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );
      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('1');

      flush();
    }));
  });

  describe('Accessibility Compliance', () => {
    it('should have proper ARIA labels on gallery container', () => {
      fixture.detectChanges();

      const galleryContainer = fixture.debugElement.query(
        By.css('.image-gallery')
      );

      expect(galleryContainer.attributes['role']).toBe('region');
      expect(galleryContainer.attributes['aria-label'])
        .toBe(`Image gallery with ${mockImages.length} images`);
    });

    it('should have proper ARIA labels on gallery grid', () => {
      fixture.detectChanges();

      const galleryGrid = fixture.debugElement.query(
        By.css('.gallery-grid')
      );

      expect(galleryGrid.attributes['aria-label'])
        .toBe(`Grid of ${mockImages.length} thumbnail images`);
    });

    it('should include ARIA setsize and posinset for thumbnails', () => {
      fixture.detectChanges();

      const thumbnails = fixture.debugElement.queryAll(
        By.directive(GalleryThumbnailComponent)
      );

      thumbnails.forEach((thumbnail, index) => {
        expect(thumbnail.attributes['aria-setsize']).toBe(mockImages.length.toString());
        expect(thumbnail.attributes['aria-posinset']).toBe((index + 1).toString());
      });
    });

    it('should have ARIA live region for announcements', () => {
      fixture.detectChanges();

      const liveRegion = fixture.debugElement.query(
        By.css('[aria-live="polite"]')
      );

      expect(liveRegion).toBeTruthy();
      expect(liveRegion.attributes['aria-atomic']).toBe('true');
    });

    it('should announce gallery loaded for screen readers', fakeAsync(() => {
      fixture.detectChanges();
      tick(0);

      expect(component.galleryAnnouncement).toContain('Image gallery loaded');
      expect(component.galleryAnnouncement).toContain(`${mockImages.length} images`);
      expect(component.galleryAnnouncement).toContain('milliseconds');

      // Should clear announcement after 3 seconds
      tick(3000);
      expect(component.galleryAnnouncement).toBe('');

      flush();
    }));
  });

  describe('Image Gallery Interactions', () => {
    it('should open modal when thumbnail is clicked', () => {
      fixture.detectChanges();

      const thumbnailComponent = fixture.debugElement.query(
        By.directive(GalleryThumbnailComponent)
      );

      const clickEvent: GalleryEvent = {
        imageIndex: 0,
        imageUrl: mockImages[0].thumbnailUrl,
        method: 'mouse'
      };

      thumbnailComponent.componentInstance.thumbnailClick.emit(clickEvent);

      expect(mockGalleryService.openModal).toHaveBeenCalledWith(0);
    });

    it('should emit imageOpened event when thumbnail is clicked', () => {
      wrapperFixture.detectChanges();

      const galleryComponent = wrapperFixture.debugElement.query(
        By.directive(ImageGalleryComponent)
      );

      const clickEvent: GalleryEvent = {
        imageIndex: 1,
        imageUrl: mockImages[1].thumbnailUrl,
        method: 'keyboard'
      };

      galleryComponent.componentInstance.onThumbnailClick(clickEvent);

      expect(wrapperComponent.imageOpenedEvent).toEqual({
        ...clickEvent,
        imageUrl: mockImages[1].thumbnailUrl
      });
    });

    it('should handle modal close events', () => {
      wrapperFixture.detectChanges();

      const lightboxComponent = wrapperFixture.debugElement.query(
        By.directive(LightboxModalComponent)
      );

      const closeEvent: GalleryEvent = {
        method: 'escape',
        imageIndex: 0
      };

      lightboxComponent.componentInstance.close.emit(closeEvent);

      expect(wrapperComponent.modalClosedEvent).toEqual(closeEvent);
    });

    it('should handle navigation events', () => {
      wrapperFixture.detectChanges();

      const lightboxComponent = wrapperFixture.debugElement.query(
        By.directive(LightboxModalComponent)
      );

      const navEvent: GalleryEvent = {
        imageIndex: 1,
        direction: 'next',
        method: 'keyboard'
      };

      lightboxComponent.componentInstance.navigate.emit(navEvent);

      expect(wrapperComponent.navigationUsedEvent).toEqual(navEvent);
    });

    it('should handle error events', () => {
      wrapperFixture.detectChanges();

      const thumbnailComponent = wrapperFixture.debugElement.query(
        By.directive(GalleryThumbnailComponent)
      );

      const errorEvent: GalleryEvent = {
        imageIndex: 0,
        errorType: 'network_error',
        retryCount: 1
      };

      thumbnailComponent.componentInstance.loadError.emit(errorEvent);

      expect(wrapperComponent.errorOccurredEvent).toEqual(errorEvent);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should display performance metrics when enabled', () => {
      component.showPerformanceInfo = true;
      fixture.detectChanges();

      const perfInfo = fixture.debugElement.query(
        By.css('.performance-info')
      );

      expect(perfInfo).toBeTruthy();
      expect(perfInfo.nativeElement.textContent).toContain('Load Time: 150ms');
      expect(perfInfo.nativeElement.textContent).toContain('Memory: 25MB');
      expect(perfInfo.nativeElement.textContent).toContain('Images: 20');
    });

    it('should track performance metrics with interval updates', fakeAsync(() => {
      component.showPerformanceInfo = true;
      fixture.detectChanges();

      expect(mockGalleryService.getPerformanceMetrics).toHaveBeenCalled();

      // Advance time by 1 second to trigger interval update
      tick(1000);

      expect(mockGalleryService.getPerformanceMetrics).toHaveBeenCalledTimes(2);

      flush();
    }));

    it('should cleanup memory tracking on destroy when auto cleanup enabled', () => {
      component.autoCleanupMemory = true;
      fixture.detectChanges();

      component.ngOnDestroy();

      mockImages.forEach(image => {
        expect(mockGalleryService.untrackImageMemoryUsage)
          .toHaveBeenCalledWith(image.id);
      });
    });

    it('should handle large image sets (100+ images) efficiently', fakeAsync(() => {
      // Create 150 test images
      const largeImageSet: ImageItem[] = Array.from({ length: 150 }, (_, i) => ({
        id: `img-${i}`,
        thumbnailUrl: `https://example.com/thumb${i}.jpg`,
        fullSizeUrl: `https://example.com/full${i}.jpg`,
        alt: `Test image ${i}`,
        title: `Test Image ${i}`
      }));

      component.images = largeImageSet;
      const startTime = performance.now();

      fixture.detectChanges();
      tick(0);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render within performance threshold
      expect(renderTime).toBeLessThan(500); // Allow more time for large sets
      expect(component.images.length).toBe(150);

      flush();
    }));
  });

  describe('Public API Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open image at specific index', () => {
      component.openImageAt(1);
      expect(mockGalleryService.openModal).toHaveBeenCalledWith(1);
    });

    it('should not open image with invalid index', () => {
      component.openImageAt(-1);
      component.openImageAt(99);

      expect(mockGalleryService.openModal).not.toHaveBeenCalled();
    });

    it('should close modal', () => {
      component.closeModal();
      expect(mockGalleryService.closeModal).toHaveBeenCalled();
    });

    it('should navigate to specific image', () => {
      component.navigateToImage(2);
      expect(mockGalleryService.navigateToImage).toHaveBeenCalledWith(2);
    });

    it('should return current image when valid index selected', () => {
      component.selectedImageIndex = 1;
      const currentImage = component.getCurrentImage();
      expect(currentImage).toEqual(mockImages[1]);
    });

    it('should return null when no image selected', () => {
      component.selectedImageIndex = -1;
      const currentImage = component.getCurrentImage();
      expect(currentImage).toBeNull();
    });

    it('should return performance metrics', () => {
      const metrics = component.getPerformanceMetrics();
      expect(metrics).toEqual({
        componentLoadTime: 150,
        totalMemoryUsageMB: 25,
        imageCount: 20,
        imageLoadTimes: expect.any(Map),
        navigationResponseTimes: expect.any(Map)
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no images provided', () => {
      component.images = [];
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(
        By.css('.empty-state')
      );

      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('No images to display');
      expect(emptyState.attributes['aria-label']).toBe('No images to display');
    });

    it('should not display thumbnails when images array is empty', () => {
      component.images = [];
      fixture.detectChanges();

      const thumbnails = fixture.debugElement.queryAll(
        By.directive(GalleryThumbnailComponent)
      );

      expect(thumbnails.length).toBe(0);
    });

    it('should hide empty state when images are provided', () => {
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(
        By.css('.empty-state')
      );

      expect(emptyState).toBeNull();
    });
  });

  describe('TrackBy Function', () => {
    it('should track images by ID for performance', () => {
      const trackByResult1 = component.trackByImageId(0, mockImages[0]);
      const trackByResult2 = component.trackByImageId(1, mockImages[1]);

      expect(trackByResult1).toBe('img-1');
      expect(trackByResult2).toBe('img-2');
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const resizeObserverSpy = vi.spyOn(component['resizeObserver']!, 'disconnect');
      const intervalSpy = vi.spyOn(globalThis, 'clearInterval');

      component.showPerformanceInfo = true;
      fixture.detectChanges();

      component.ngOnDestroy();

      expect(resizeObserverSpy).toHaveBeenCalled();
      expect(intervalSpy).toHaveBeenCalled();
    });

    it('should complete destroy subject on component destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Viewport Responsiveness', () => {
    it('should apply correct CSS classes based on viewport', fakeAsync(() => {
      wrapperComponent.containerWidth = 500; // mobile
      wrapperFixture.detectChanges();
      tick(250);

      let galleryElement = wrapperFixture.debugElement.query(
        By.css('.image-gallery')
      );
      expect(galleryElement.classes['mobile']).toBe(true);

      wrapperComponent.containerWidth = 800; // tablet
      wrapperFixture.detectChanges();
      tick(250);

      galleryElement = wrapperFixture.debugElement.query(
        By.css('.image-gallery')
      );
      expect(galleryElement.classes['tablet']).toBe(true);

      wrapperComponent.containerWidth = 1200; // desktop
      wrapperFixture.detectChanges();
      tick(250);

      galleryElement = wrapperFixture.debugElement.query(
        By.css('.image-gallery')
      );
      expect(galleryElement.classes['desktop']).toBe(true);

      flush();
    }));

    it('should disable info on hover for mobile viewports', fakeAsync(() => {
      wrapperComponent.containerWidth = 500; // mobile
      wrapperFixture.detectChanges();
      tick(250);

      const thumbnails = wrapperFixture.debugElement.queryAll(
        By.directive(GalleryThumbnailComponent)
      );

      thumbnails.forEach(thumbnail => {
        expect(thumbnail.componentInstance.showInfoOnHover).toBe(false);
      });

      flush();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle component with no ResizeObserver support', fakeAsync(() => {
      // Mock older browser without ResizeObserver
      const originalResizeObserver = globalThis.ResizeObserver;
      delete (globalThis as any).ResizeObserver;

      const resizeListenerSpy = vi.spyOn(window, 'addEventListener');

      fixture.detectChanges();
      tick(0);

      expect(resizeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // Restore ResizeObserver
      globalThis.ResizeObserver = originalResizeObserver;
      flush();
    }));

    it('should handle rapid viewport size changes without errors', fakeAsync(() => {
      wrapperComponent.containerWidth = 500;
      wrapperFixture.detectChanges();
      tick(100);

      wrapperComponent.containerWidth = 800;
      wrapperFixture.detectChanges();
      tick(100);

      wrapperComponent.containerWidth = 1200;
      wrapperFixture.detectChanges();
      tick(100);

      wrapperComponent.containerWidth = 1600;
      wrapperFixture.detectChanges();
      tick(250);

      // Should handle all changes gracefully
      const galleryElement = wrapperFixture.debugElement.query(
        By.css('.gallery-grid')
      );
      expect(galleryElement.nativeElement.style.getPropertyValue('--column-count')).toBe('4');

      flush();
    }));

    it('should handle gallery state updates correctly', fakeAsync(() => {
      fixture.detectChanges();

      // Simulate gallery service state change
      mockGalleryService.openModal(1);
      tick(0);

      expect(component.selectedImageIndex).toBe(1);
      expect(component.isModalOpen).toBe(true);

      mockGalleryService.closeModal();
      tick(0);

      expect(component.isModalOpen).toBe(false);

      flush();
    }));
  });
});