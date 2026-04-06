import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { GalleryImage, GalleryAnalyticsEvent } from '../models/gallery-image.interface';

@Injectable({
  providedIn: 'root'
})
export class ImageGalleryService {
  private analyticsEvents$ = new Subject<GalleryAnalyticsEvent>();
  private preloadedImages = new Map<string, HTMLImageElement>();
  private readonly cacheLimit = 50;

  constructor() {}

  /**
   * Emit analytics events
   */
  emitAnalyticsEvent(eventName: string, properties: Record<string, any>): void {
    const event: GalleryAnalyticsEvent = {
      eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };

    this.analyticsEvents$.next(event);

    // Also log to console in development
    if (!this.isProduction()) {
      console.log('Gallery Analytics Event:', event);
    }
  }

  /**
   * Get analytics events observable
   */
  getAnalyticsEvents(): Observable<GalleryAnalyticsEvent> {
    return this.analyticsEvents$.asObservable();
  }

  /**
   * Preload images for better performance
   */
  preloadImages(images: string[]): void {
    images.forEach(src => {
      if (!this.preloadedImages.has(src) && this.preloadedImages.size < this.cacheLimit) {
        const img = new Image();
        img.onload = () => {
          this.preloadedImages.set(src, img);
        };
        img.onerror = () => {
          // Remove failed preload attempt
          this.preloadedImages.delete(src);
        };
        img.src = src;
      }
    });
  }

  /**
   * Get adjacent image URLs for preloading
   */
  getAdjacentImages(images: GalleryImage[], currentIndex: number, range: number = 2): string[] {
    const adjacentUrls: string[] = [];

    for (let i = Math.max(0, currentIndex - range); i <= Math.min(images.length - 1, currentIndex + range); i++) {
      if (i !== currentIndex && images[i]) {
        adjacentUrls.push(images[i].fullSizeUrl);
      }
    }

    return adjacentUrls;
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.preloadedImages.clear();
  }

  /**
   * Get viewport dimensions
   */
  getViewportDimensions(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /**
   * Detect device type based on viewport
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;

    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Check if image is in cache
   */
  isImageCached(src: string): boolean {
    return this.preloadedImages.has(src);
  }

  /**
   * Handle image load errors with retry logic
   */
  handleImageError(image: GalleryImage, errorType: string): GalleryImage {
    const updatedImage = { ...image };
    updatedImage.loadError = true;
    updatedImage.retryCount = (updatedImage.retryCount || 0) + 1;

    this.emitAnalyticsEvent('image_load_failed', {
      image_url: image.fullSizeUrl,
      error_type: errorType,
      retry_count: updatedImage.retryCount
    });

    return updatedImage;
  }

  /**
   * Track gallery load performance
   */
  trackGalleryLoaded(imageCount: number, loadTimeMs: number): void {
    const viewport = this.getViewportDimensions();

    this.emitAnalyticsEvent('gallery_loaded', {
      image_count: imageCount,
      load_time_ms: loadTimeMs,
      viewport_size: `${viewport.width}x${viewport.height}`
    });
  }

  /**
   * Track image opening
   */
  trackImageOpened(imageIndex: number, imageUrl: string, thumbnailLoadTime: number): void {
    this.emitAnalyticsEvent('image_opened', {
      image_index: imageIndex,
      image_url: imageUrl,
      thumbnail_load_time: thumbnailLoadTime
    });
  }

  /**
   * Track gallery navigation
   */
  trackGalleryNavigated(direction: 'next' | 'previous', method: 'click' | 'keyboard' | 'touch', currentIndex: number, totalImages: number): void {
    this.emitAnalyticsEvent('gallery_navigated', {
      direction,
      method,
      current_index: currentIndex,
      total_images: totalImages
    });
  }

  /**
   * Track gallery closed
   */
  trackGalleryClosed(viewDurationMs: number, imagesViewedCount: number, exitMethod: 'button' | 'escape' | 'outside' | 'swipe'): void {
    this.emitAnalyticsEvent('gallery_closed', {
      view_duration_ms: viewDurationMs,
      images_viewed_count: imagesViewedCount,
      exit_method: exitMethod
    });
  }

  /**
   * Track lazy load triggered
   */
  trackImageLazyLoaded(imageIndex: number, viewportDistance: number, loadSuccess: boolean): void {
    this.emitAnalyticsEvent('image_lazy_loaded', {
      image_index: imageIndex,
      viewport_distance: viewportDistance,
      load_success: loadSuccess
    });
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('gallery-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('gallery-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    // This would typically come from your auth service
    return localStorage.getItem('user-id') || undefined;
  }

  private isProduction(): boolean {
    return false; // You can set this based on your environment configuration
  }
}