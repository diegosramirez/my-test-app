import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  TrackByFunction,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  ImageItem,
  GalleryConfig,
  GalleryEvent,
  LoadingState,
  DEFAULT_GALLERY_CONFIG
} from './types/image-gallery.types';
import { GalleryService } from './services/gallery.service';
import { GalleryThumbnailComponent } from './gallery-thumbnail/gallery-thumbnail.component';
import { LightboxModalComponent } from './lightbox-modal/lightbox-modal.component';

interface ViewportInfo {
  width: number;
  height: number;
  columnCount: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, GalleryThumbnailComponent, LightboxModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="image-gallery"
      [class.mobile]="viewportInfo.isMobile"
      [class.tablet]="viewportInfo.isTablet"
      [class.desktop]="viewportInfo.isDesktop"
      [attr.role]="'region'"
      [attr.aria-label]="'Image gallery with ' + images.length + ' images'"
      #galleryContainer
    >
      <!-- Gallery grid -->
      <div
        class="gallery-grid"
        [style.--column-count]="viewportInfo.columnCount"
        [attr.aria-label]="'Grid of ' + images.length + ' thumbnail images'"
      >
        <app-gallery-thumbnail
          *ngFor="let image of images; trackBy: trackByImageId; let i = index"
          [image]="image"
          [index]="i"
          [lazyLoadingThreshold]="config.lazyLoadingThreshold"
          [maxRetries]="config.maxRetryCount"
          [showInfoOnHover]="!viewportInfo.isMobile"
          (thumbnailClick)="onThumbnailClick($event)"
          (loadStart)="onImageLoadStart($event)"
          (loadSuccess)="onImageLoadSuccess($event)"
          (loadError)="onImageLoadError($event)"
          (retryAttempt)="onImageRetry($event)"
          [attr.aria-setsize]="images.length"
          [attr.aria-posinset]="i + 1"
        />
      </div>

      <!-- Empty state -->
      <div
        class="empty-state"
        *ngIf="images.length === 0"
        [attr.aria-label]="'No images to display'"
      >
        <div class="empty-icon" aria-hidden="true">🖼️</div>
        <div class="empty-message">No images to display</div>
        <div class="empty-description">
          Add some images to see them in the gallery
        </div>
      </div>

      <!-- Performance info (development only) -->
      <div
        class="performance-info"
        *ngIf="showPerformanceInfo && performanceMetrics"
        [attr.aria-live]="'polite'"
      >
        <div class="perf-item">
          <strong>Load Time:</strong> {{ performanceMetrics.componentLoadTime }}ms
        </div>
        <div class="perf-item">
          <strong>Memory:</strong> {{ performanceMetrics.totalMemoryUsageMB }}MB
        </div>
        <div class="perf-item">
          <strong>Images:</strong> {{ performanceMetrics.imageCount }}
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <app-lightbox-modal
      [images]="images"
      [selectedIndex]="selectedImageIndex"
      [isVisible]="isModalOpen"
      [showNavButtons]="images.length > 1"
      [showImageInfo]="true"
      [showNavigationHints]="showNavigationHints"
      (close)="onModalClose($event)"
      (navigate)="onModalNavigate($event)"
      (imageLoad)="onModalImageLoad($event)"
      (imageError)="onModalImageError($event)"
    />

    <!-- ARIA live region for gallery announcements -->
    <div class="sr-only" [attr.aria-live]="'polite'" [attr.aria-atomic]="'true'">
      <span *ngIf="galleryAnnouncement">{{ galleryAnnouncement }}</span>
    </div>
  `,
  styles: [`
    .image-gallery {
      width: 100%;
      position: relative;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(var(--column-count, 1), 1fr);
      gap: 16px;
      padding: 16px;
      min-height: 200px;
    }

    /* Responsive grid adjustments */
    @media (max-width: 767px) {
      .gallery-grid {
        grid-template-columns: repeat(1, 1fr);
        gap: 12px;
        padding: 12px;
      }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .gallery-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) and (max-width: 1439px) {
      .gallery-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 1440px) {
      .gallery-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: #666;
      min-height: 300px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-message {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 14px;
      opacity: 0.7;
      max-width: 300px;
    }

    .performance-info {
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 2px;
      pointer-events: none;
    }

    .perf-item {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Loading animation for initial render */
    .gallery-grid {
      animation: fadeInUp 0.4s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Accessibility improvements */
    .image-gallery:focus-within .gallery-grid {
      outline: 2px solid rgba(66, 153, 225, 0.5);
      outline-offset: 4px;
      border-radius: 8px;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .empty-state {
        border: 2px solid currentColor;
        border-radius: 8px;
      }

      .performance-info {
        border: 1px solid white;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .gallery-grid {
        animation: none;
      }

      * {
        transition: none !important;
        animation: none !important;
      }
    }

    /* Print styles */
    @media print {
      .performance-info {
        display: none;
      }

      .gallery-grid {
        display: block;
        columns: 2;
        column-gap: 16px;
      }

      app-gallery-thumbnail {
        break-inside: avoid;
        margin-bottom: 16px;
      }
    }
  `]
})
export class ImageGalleryComponent implements OnInit, OnDestroy {
  @Input() images: ImageItem[] = [];
  @Input() config: GalleryConfig = DEFAULT_GALLERY_CONFIG;
  @Input() showPerformanceInfo = false;
  @Input() showNavigationHints = true;
  @Input() autoCleanupMemory = true;

  @Output() galleryLoaded = new EventEmitter<GalleryEvent>();
  @Output() imageOpened = new EventEmitter<GalleryEvent>();
  @Output() modalClosed = new EventEmitter<GalleryEvent>();
  @Output() navigationUsed = new EventEmitter<GalleryEvent>();
  @Output() errorOccurred = new EventEmitter<GalleryEvent>();
  @Output() gestureUsed = new EventEmitter<GalleryEvent>();

  @ViewChild('galleryContainer', { static: true }) galleryContainer!: ElementRef<HTMLDivElement>;

  // Component state
  selectedImageIndex = -1;
  isModalOpen = false;
  galleryAnnouncement = '';
  performanceMetrics: any = null;

  // Viewport tracking
  private viewportSubject = new BehaviorSubject<ViewportInfo>({
    width: 0,
    height: 0,
    columnCount: 1,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  viewportInfo = this.viewportSubject.value;

  private destroy$ = new Subject<void>();
  private componentLoadStartTime = 0;
  private resizeObserver?: ResizeObserver;
  private performanceUpdateInterval?: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private galleryService: GalleryService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.componentLoadStartTime = performance.now();
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  private initializeComponent(): void {
    this.setupViewportTracking();
    this.initializeGalleryState();
    this.startPerformanceTracking();
    this.trackComponentLoadTime();
  }

  private setupViewportTracking(): void {
    this.updateViewportInfo();

    // Use ResizeObserver if available, fallback to window resize
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.updateViewportInfo());
      });
      this.resizeObserver.observe(this.galleryContainer.nativeElement);
    } else {
      this.ngZone.runOutsideAngular(() => {
        const handleResize = this.debounce(() => {
          this.ngZone.run(() => this.updateViewportInfo());
        }, 250);

        window.addEventListener('resize', handleResize);

        this.destroy$.subscribe(() => {
          window.removeEventListener('resize', handleResize);
        });
      });
    }

    // Watch viewport changes
    this.viewportSubject
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(viewport => {
        this.viewportInfo = viewport;
        this.cdr.markForCheck();
      });
  }

  private updateViewportInfo(): void {
    const container = this.galleryContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const isMobile = width < this.config.breakpoints.mobile;
    const isTablet = width >= this.config.breakpoints.mobile && width < this.config.breakpoints.desktop;
    const isDesktop = width >= this.config.breakpoints.desktop;

    let columnCount = 1;
    if (width >= this.config.breakpoints.large) {
      columnCount = 4;
    } else if (width >= this.config.breakpoints.desktop) {
      columnCount = 3;
    } else if (width >= this.config.breakpoints.tablet) {
      columnCount = 2;
    }

    this.viewportSubject.next({
      width,
      height,
      columnCount,
      isMobile,
      isTablet,
      isDesktop
    });
  }

  private initializeGalleryState(): void {
    this.galleryService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.selectedImageIndex = state.selectedIndex;
        this.isModalOpen = state.isModalOpen;
        this.cdr.markForCheck();
      });
  }

  private startPerformanceTracking(): void {
    if (this.showPerformanceInfo) {
      this.performanceUpdateInterval = setInterval(() => {
        this.performanceMetrics = this.galleryService.getPerformanceMetrics();
        this.cdr.markForCheck();
      }, 1000);
    }
  }

  private trackComponentLoadTime(): void {
    // Use setTimeout to ensure the component is fully rendered
    setTimeout(() => {
      const loadTime = performance.now() - this.componentLoadStartTime;
      this.galleryService.trackComponentLoadTime(loadTime);

      const galleryLoadedEvent: GalleryEvent = {
        loadTime,
        imageIndex: this.images.length
      };

      this.galleryLoaded.emit(galleryLoadedEvent);

      // Announce completion for screen readers
      this.announceGalleryLoaded(loadTime);
    }, 0);
  }

  // Event handlers
  onThumbnailClick(event: GalleryEvent): void {
    if (event.imageIndex !== undefined) {
      this.galleryService.openModal(event.imageIndex);

      const imageOpenedEvent: GalleryEvent = {
        ...event,
        imageUrl: this.images[event.imageIndex]?.thumbnailUrl
      };

      this.imageOpened.emit(imageOpenedEvent);
    }
  }

  onModalClose(event: GalleryEvent): void {
    this.modalClosed.emit(event);
  }

  onModalNavigate(event: GalleryEvent): void {
    this.navigationUsed.emit(event);
  }

  onModalImageLoad(event: GalleryEvent): void {
    // Handle modal image load events if needed
  }

  onModalImageError(event: GalleryEvent): void {
    this.errorOccurred.emit(event);
  }

  onImageLoadStart(event: GalleryEvent): void {
    // Handle thumbnail load start if needed
  }

  onImageLoadSuccess(event: GalleryEvent): void {
    // Handle thumbnail load success if needed
  }

  onImageLoadError(event: GalleryEvent): void {
    this.errorOccurred.emit(event);
  }

  onImageRetry(event: GalleryEvent): void {
    // Handle retry attempts
  }

  // TrackBy function for performance
  trackByImageId: TrackByFunction<ImageItem> = (index: number, item: ImageItem) => {
    return item.id;
  };

  // Public API methods
  openImageAt(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.galleryService.openModal(index);
    }
  }

  closeModal(): void {
    this.galleryService.closeModal();
  }

  navigateToImage(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.galleryService.navigateToImage(index);
    }
  }

  getCurrentImage(): ImageItem | null {
    if (this.selectedImageIndex >= 0 && this.selectedImageIndex < this.images.length) {
      return this.images[this.selectedImageIndex];
    }
    return null;
  }

  getPerformanceMetrics() {
    return this.galleryService.getPerformanceMetrics();
  }

  // Utility methods
  private debounce(func: Function, delay: number): () => void {
    let timeoutId: any;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  private announceGalleryLoaded(loadTime: number): void {
    this.galleryAnnouncement = `Image gallery loaded with ${this.images.length} images in ${Math.round(loadTime)} milliseconds`;

    setTimeout(() => {
      this.galleryAnnouncement = '';
      this.cdr.markForCheck();
    }, 3000);

    this.cdr.markForCheck();
  }

  private cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
    }

    // Cleanup gallery service if auto cleanup is enabled
    if (this.autoCleanupMemory) {
      this.images.forEach(image => {
        this.galleryService.untrackImageMemoryUsage(image.id);
      });
    }
  }
}