import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, fromEvent, timer, of } from 'rxjs';
import { map, switchMap, retryWhen, take, delay, tap } from 'rxjs/operators';
import { GalleryImage, ImageLoadMetrics, GalleryEvent } from '../types/gallery.types';
import { ImageUtils } from '../utils/image.utils';

@Injectable({
  providedIn: 'root'
})
export class ImageLoadingService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private loadingImages = new Map<string, BehaviorSubject<'loading' | 'loaded' | 'error'>>();
  private intersectionObserver: IntersectionObserver | null = null;
  private supportsWebP = false;
  private metrics: ImageLoadMetrics[] = [];
  private events: GalleryEvent[] = [];

  constructor() {
    if (this.isBrowser) {
      this.initializeWebPSupport();
      this.setupIntersectionObserver();
    }
  }

  /**
   * Initialize WebP support detection
   */
  private async initializeWebPSupport(): Promise<void> {
    this.supportsWebP = await ImageUtils.supportsWebP();
  }

  /**
   * Setup Intersection Observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (!this.isBrowser || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const imageElement = entry.target as HTMLImageElement;
            const imageId = imageElement.dataset['imageId'];
            const imageUrl = imageElement.dataset['src'];

            if (imageId && imageUrl) {
              this.loadImageWithRetry(imageId, imageUrl).subscribe();
              this.intersectionObserver?.unobserve(imageElement);
            }
          }
        });
      },
      {
        rootMargin: '200px 0px', // Load images 200px before they enter viewport
        threshold: 0.1
      }
    );
  }

  /**
   * Observe element for lazy loading
   */
  observeImageElement(element: HTMLElement, imageId: string, imageUrl: string): void {
    if (!this.intersectionObserver || !this.isBrowser) {
      // Fallback: load immediately if no intersection observer
      this.loadImageWithRetry(imageId, imageUrl).subscribe();
      return;
    }

    element.dataset['imageId'] = imageId;
    element.dataset['src'] = imageUrl;
    this.intersectionObserver.observe(element);
  }

  /**
   * Unobserve element
   */
  unobserveImageElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Load image with retry logic and exponential backoff
   */
  loadImageWithRetry(imageId: string, imageUrl: string, maxRetries: number = 3): Observable<'loaded' | 'error'> {
    const startTime = Date.now();
    let retryCount = 0;

    // Get or create loading subject for this image
    if (!this.loadingImages.has(imageId)) {
      this.loadingImages.set(imageId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
    }

    const loadingSubject = this.loadingImages.get(imageId)!;
    loadingSubject.next('loading');

    return this.loadImage(imageUrl).pipe(
      retryWhen(errors =>
        errors.pipe(
          tap(() => {
            retryCount++;
            this.trackEvent('image_error', {
              image_id: imageId,
              error_type: 'load_failure',
              retry_attempt: retryCount
            });
          }),
          switchMap((error, index) => {
            if (index >= maxRetries) {
              loadingSubject.next('error');
              return of(error).pipe(
                switchMap(() => {
                  throw error;
                })
              );
            }
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, index) * 1000;
            return timer(delayMs);
          })
        )
      ),
      map(() => {
        const loadDuration = Date.now() - startTime;

        // Track successful load metrics
        this.trackImageLoad({
          imageId,
          loadDuration,
          retryCount,
          timestamp: Date.now()
        });

        this.trackEvent('image_loaded', {
          image_id: imageId,
          load_duration: loadDuration,
          retry_count: retryCount
        });

        loadingSubject.next('loaded');
        return 'loaded' as const;
      }),
      tap({
        error: () => {
          loadingSubject.next('error');
          this.trackImageLoad({
            imageId,
            loadDuration: Date.now() - startTime,
            retryCount,
            errorType: 'max_retries_exceeded',
            timestamp: Date.now()
          });
        }
      })
    );
  }

  /**
   * Load single image as Promise
   */
  private loadImage(imageUrl: string): Observable<Event> {
    return new Observable(observer => {
      const img = new Image();

      img.onload = (event) => {
        observer.next(event);
        observer.complete();
      };

      img.onerror = (error) => {
        observer.error(error);
      };

      // Use optimized URL if WebP is supported
      img.src = ImageUtils.getOptimizedImageUrl(
        { fullSizeUrl: imageUrl } as GalleryImage,
        true,
        this.supportsWebP
      );
    });
  }

  /**
   * Get loading state for an image
   */
  getImageLoadingState(imageId: string): Observable<'loading' | 'loaded' | 'error'> {
    if (!this.loadingImages.has(imageId)) {
      this.loadingImages.set(imageId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
    }
    return this.loadingImages.get(imageId)!.asObservable();
  }

  /**
   * Preload full-size image
   */
  preloadImage(image: GalleryImage): Observable<'loaded' | 'error'> {
    const optimizedUrl = ImageUtils.getOptimizedImageUrl(image, true, this.supportsWebP);
    return this.loadImageWithRetry(image.id, optimizedUrl);
  }

  /**
   * Track image loading metrics
   */
  private trackImageLoad(metrics: ImageLoadMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics.splice(0, this.metrics.length - 100);
    }
  }

  /**
   * Track gallery events for analytics
   */
  trackEvent(eventName: string, properties: Record<string, any>): void {
    const event: GalleryEvent = {
      eventName,
      properties,
      timestamp: Date.now(),
      imageId: properties['image_id'] || properties['imageId']
    };

    this.events.push(event);

    // Keep only last 200 events to prevent memory leaks
    if (this.events.length > 200) {
      this.events.splice(0, this.events.length - 200);
    }

    // In a real app, send to analytics service
    console.log('Gallery Event:', event);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): ImageLoadMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get tracked events
   */
  getEvents(): GalleryEvent[] {
    return [...this.events];
  }

  /**
   * Calculate average load time
   */
  getAverageLoadTime(): number {
    const successfulLoads = this.metrics.filter(m => !m.errorType);
    if (successfulLoads.length === 0) return 0;

    const totalTime = successfulLoads.reduce((sum, metric) => sum + metric.loadDuration, 0);
    return totalTime / successfulLoads.length;
  }

  /**
   * Get error rate percentage
   */
  getErrorRate(): number {
    if (this.metrics.length === 0) return 0;

    const errorCount = this.metrics.filter(m => m.errorType).length;
    return (errorCount / this.metrics.length) * 100;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.loadingImages.clear();
    this.metrics.length = 0;
    this.events.length = 0;
  }
}