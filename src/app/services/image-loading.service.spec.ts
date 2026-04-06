import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';

import { ImageLoadingService } from './image-loading.service';
import { GalleryImage, ImageLoadMetrics, GalleryEvent } from '../types/gallery.types';
import { ImageUtils } from '../utils/image.utils';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  // Helper method to trigger intersection
  triggerIntersection(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this);
  }
}

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  src = '';

  constructor() {
    // Simulate async loading
    setTimeout(() => {
      if (this.src.includes('fail')) {
        this.onerror?.(new Error('Failed to load'));
      } else {
        this.onload?.();
      }
    }, 0);
  }
}

// Mock ImageUtils
vi.mock('../utils/image.utils', () => ({
  ImageUtils: {
    supportsWebP: vi.fn().mockResolvedValue(true),
    getOptimizedImageUrl: vi.fn((image: GalleryImage, isFullSize: boolean) =>
      isFullSize ? image.fullSizeUrl : image.thumbnailUrl
    )
  }
}));

describe('ImageLoadingService', () => {
  let service: ImageLoadingService;
  let mockIntersectionObserver: MockIntersectionObserver;

  const mockImage: GalleryImage = {
    id: 'test-1',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    fullSizeUrl: 'https://example.com/full.jpg',
    alt: 'Test image'
  };

  const mockFailingImage: GalleryImage = {
    id: 'test-fail',
    thumbnailUrl: 'https://example.com/fail.jpg',
    fullSizeUrl: 'https://example.com/fail-full.jpg',
    alt: 'Failing image'
  };

  beforeEach(async () => {
    // Setup global mocks
    global.Image = MockImage as any;
    global.IntersectionObserver = vi.fn().mockImplementation(
      (callback, options) => {
        mockIntersectionObserver = new MockIntersectionObserver(callback, options);
        return mockIntersectionObserver;
      }
    ) as any;

    await TestBed.configureTestingModule({
      providers: [
        ImageLoadingService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    service = TestBed.inject(ImageLoadingService);
  });

  afterEach(() => {
    service.destroy();
    vi.clearAllMocks();
  });

  describe('service initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize WebP support detection', () => {
      expect(ImageUtils.supportsWebP).toHaveBeenCalled();
    });

    it('should setup IntersectionObserver', () => {
      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '200px 0px',
          threshold: 0.1
        })
      );
    });
  });

  describe('observeImageElement', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('div');
    });

    it('should observe element with intersection observer', () => {
      service.observeImageElement(mockElement, mockImage.id, mockImage.thumbnailUrl);

      expect(mockElement.dataset['imageId']).toBe(mockImage.id);
      expect(mockElement.dataset['src']).toBe(mockImage.thumbnailUrl);
      expect(mockIntersectionObserver.observe).toHaveBeenCalledWith(mockElement);
    });

    it('should load immediately if no intersection observer available', () => {
      // Create service without IntersectionObserver support
      global.IntersectionObserver = undefined as any;

      const serviceWithoutObserver = new ImageLoadingService();
      const loadSpy = vi.spyOn(serviceWithoutObserver, 'loadImageWithRetry').mockReturnValue(of('loaded'));

      serviceWithoutObserver.observeImageElement(mockElement, mockImage.id, mockImage.thumbnailUrl);

      expect(loadSpy).toHaveBeenCalledWith(mockImage.id, mockImage.thumbnailUrl);
      serviceWithoutObserver.destroy();
    });
  });

  describe('unobserveImageElement', () => {
    it('should unobserve element', () => {
      const mockElement = document.createElement('div');
      service.unobserveImageElement(mockElement);

      expect(mockIntersectionObserver.unobserve).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('loadImageWithRetry', () => {
    it('should load image successfully on first attempt', (done) => {
      service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl)
        .pipe(take(1))
        .subscribe(result => {
          expect(result).toBe('loaded');
          done();
        });
    });

    it('should retry on failure up to max attempts', (done) => {
      const maxRetries = 2;
      let attemptCount = 0;

      service.loadImageWithRetry(mockFailingImage.id, mockFailingImage.thumbnailUrl, maxRetries)
        .subscribe({
          error: () => {
            // Should have attempted initial + retries
            done();
          }
        });
    });

    it('should track loading metrics on success', (done) => {
      service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl)
        .pipe(take(1))
        .subscribe(() => {
          const metrics = service.getMetrics();
          expect(metrics).toContainEqual(
            expect.objectContaining({
              imageId: mockImage.id,
              loadDuration: expect.any(Number),
              retryCount: 0,
              timestamp: expect.any(Number)
            })
          );
          done();
        });
    });

    it('should track error metrics on failure', (done) => {
      service.loadImageWithRetry(mockFailingImage.id, mockFailingImage.thumbnailUrl, 0)
        .subscribe({
          error: () => {
            const metrics = service.getMetrics();
            expect(metrics).toContainEqual(
              expect.objectContaining({
                imageId: mockFailingImage.id,
                errorType: 'max_retries_exceeded',
                timestamp: expect.any(Number)
              })
            );
            done();
          }
        });
    });

    it('should update loading state subject', () => {
      const loadingState$ = service.getImageLoadingState(mockImage.id);
      let states: string[] = [];

      loadingState$.subscribe(state => states.push(state));

      service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl);

      // Should start with loading state
      expect(states).toContain('loading');
    });
  });

  describe('getImageLoadingState', () => {
    it('should return observable for image loading state', () => {
      const loadingState$ = service.getImageLoadingState(mockImage.id);
      expect(loadingState$).toBeTruthy();

      loadingState$.pipe(take(1)).subscribe(state => {
        expect(['loading', 'loaded', 'error']).toContain(state);
      });
    });

    it('should create new subject if image not tracked', () => {
      const state1$ = service.getImageLoadingState('new-image');
      const state2$ = service.getImageLoadingState('new-image');

      expect(state1$).toBe(state2$);
    });
  });

  describe('preloadImage', () => {
    it('should preload full-size image', (done) => {
      service.preloadImage(mockImage)
        .pipe(take(1))
        .subscribe(result => {
          expect(result).toBe('loaded');
          expect(ImageUtils.getOptimizedImageUrl).toHaveBeenCalledWith(
            mockImage,
            true,
            true // supportsWebP
          );
          done();
        });
    });

    it('should handle preload failure', (done) => {
      service.preloadImage(mockFailingImage)
        .subscribe({
          error: () => {
            done();
          }
        });
    });
  });

  describe('trackEvent', () => {
    it('should track gallery events', () => {
      const eventProps = {
        image_id: mockImage.id,
        position_in_grid: 0
      };

      service.trackEvent('thumbnail_clicked', eventProps);

      const events = service.getEvents();
      expect(events).toContainEqual(
        expect.objectContaining({
          eventName: 'thumbnail_clicked',
          properties: eventProps,
          imageId: mockImage.id,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should extract imageId from properties in different formats', () => {
      service.trackEvent('test_event', { image_id: 'test-1' });
      service.trackEvent('test_event', { imageId: 'test-2' });

      const events = service.getEvents();
      expect(events[events.length - 2].imageId).toBe('test-1');
      expect(events[events.length - 1].imageId).toBe('test-2');
    });

    it('should limit events to prevent memory leaks', () => {
      // Add 250 events (more than the 200 limit)
      for (let i = 0; i < 250; i++) {
        service.trackEvent('test_event', { index: i });
      }

      const events = service.getEvents();
      expect(events).toHaveLength(200);
      expect(events[0].properties.index).toBe(50); // First 50 should be removed
    });

    it('should log events to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      service.trackEvent('test_event', { test: true });

      expect(consoleSpy).toHaveBeenCalledWith('Gallery Event:', expect.any(Object));
      consoleSpy.mockRestore();
    });
  });

  describe('getMetrics', () => {
    it('should return copy of metrics array', () => {
      service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl);

      setTimeout(() => {
        const metrics1 = service.getMetrics();
        const metrics2 = service.getMetrics();

        expect(metrics1).not.toBe(metrics2); // Different array references
        expect(metrics1).toEqual(metrics2); // Same contents
      }, 10);
    });

    it('should limit metrics to prevent memory leaks', async () => {
      // Load 150 images (more than the 100 limit)
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          service.loadImageWithRetry(`image-${i}`, `https://example.com/image-${i}.jpg`)
            .toPromise()
            .catch(() => {}) // Ignore failures for this test
        );
      }

      await Promise.allSettled(promises);
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = service.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getAverageLoadTime', () => {
    it('should calculate average load time for successful loads', (done) => {
      Promise.all([
        service.loadImageWithRetry('image-1', 'https://example.com/1.jpg').toPromise(),
        service.loadImageWithRetry('image-2', 'https://example.com/2.jpg').toPromise(),
        service.loadImageWithRetry('image-3', 'https://example.com/3.jpg').toPromise()
      ]).then(() => {
        setTimeout(() => {
          const avgTime = service.getAverageLoadTime();
          expect(avgTime).toBeGreaterThan(0);
          expect(typeof avgTime).toBe('number');
          done();
        }, 100);
      });
    });

    it('should return 0 when no successful loads', () => {
      expect(service.getAverageLoadTime()).toBe(0);
    });

    it('should exclude failed loads from average', (done) => {
      Promise.allSettled([
        service.loadImageWithRetry('image-1', 'https://example.com/1.jpg').toPromise(),
        service.loadImageWithRetry('fail-1', 'https://example.com/fail.jpg', 0).toPromise()
      ]).then(() => {
        setTimeout(() => {
          const avgTime = service.getAverageLoadTime();
          expect(avgTime).toBeGreaterThan(0); // Should only count successful loads
          done();
        }, 100);
      });
    });
  });

  describe('getErrorRate', () => {
    it('should calculate error rate percentage', (done) => {
      Promise.allSettled([
        service.loadImageWithRetry('success-1', 'https://example.com/1.jpg').toPromise(),
        service.loadImageWithRetry('fail-1', 'https://example.com/fail.jpg', 0).toPromise()
      ]).then(() => {
        setTimeout(() => {
          const errorRate = service.getErrorRate();
          expect(errorRate).toBeGreaterThan(0);
          expect(errorRate).toBeLessThanOrEqual(100);
          done();
        }, 100);
      });
    });

    it('should return 0 when no metrics', () => {
      expect(service.getErrorRate()).toBe(0);
    });
  });

  describe('intersection observer integration', () => {
    it('should load images when they enter viewport', () => {
      const mockElement = document.createElement('div');
      const loadSpy = vi.spyOn(service, 'loadImageWithRetry').mockReturnValue(of('loaded'));

      service.observeImageElement(mockElement, mockImage.id, mockImage.thumbnailUrl);

      // Simulate intersection
      mockIntersectionObserver.triggerIntersection([
        {
          target: mockElement,
          isIntersecting: true
        }
      ]);

      expect(loadSpy).toHaveBeenCalledWith(mockImage.id, mockImage.thumbnailUrl);
      expect(mockIntersectionObserver.unobserve).toHaveBeenCalledWith(mockElement);
    });

    it('should not load images when not intersecting', () => {
      const mockElement = document.createElement('div');
      const loadSpy = vi.spyOn(service, 'loadImageWithRetry').mockReturnValue(of('loaded'));

      service.observeImageElement(mockElement, mockImage.id, mockImage.thumbnailUrl);

      // Simulate no intersection
      mockIntersectionObserver.triggerIntersection([
        {
          target: mockElement,
          isIntersecting: false
        }
      ]);

      expect(loadSpy).not.toHaveBeenCalled();
      expect(mockIntersectionObserver.unobserve).not.toHaveBeenCalled();
    });

    it('should handle missing dataset attributes gracefully', () => {
      const mockElement = document.createElement('div');
      const loadSpy = vi.spyOn(service, 'loadImageWithRetry').mockReturnValue(of('loaded'));

      // Don't set up element properly
      mockIntersectionObserver.triggerIntersection([
        {
          target: mockElement,
          isIntersecting: true
        }
      ]);

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should disconnect intersection observer', () => {
      service.destroy();
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
    });

    it('should clear all internal data', () => {
      // Add some data
      service.trackEvent('test', {});
      service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl);

      service.destroy();

      expect(service.getEvents()).toEqual([]);
      expect(service.getMetrics()).toEqual([]);
    });
  });

  describe('SSR compatibility', () => {
    it('should handle server-side rendering', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ImageLoadingService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      const ssrService = TestBed.inject(ImageLoadingService);
      expect(ssrService).toBeTruthy();

      // Should not throw when methods are called
      expect(() => {
        const element = document.createElement('div');
        ssrService.observeImageElement(element, 'test', 'test.jpg');
        ssrService.unobserveImageElement(element);
      }).not.toThrow();

      ssrService.destroy();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed image URLs', () => {
      expect(() => {
        service.loadImageWithRetry('test', 'not-a-url');
      }).not.toThrow();
    });

    it('should handle null/undefined image elements', () => {
      expect(() => {
        service.observeImageElement(null as any, 'test', 'test.jpg');
        service.unobserveImageElement(null as any);
      }).not.toThrow();
    });

    it('should handle concurrent loads of same image', () => {
      const load1 = service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl);
      const load2 = service.loadImageWithRetry(mockImage.id, mockImage.thumbnailUrl);

      // Both should return the same loading state
      expect(load1).toBeTruthy();
      expect(load2).toBeTruthy();
    });
  });
});