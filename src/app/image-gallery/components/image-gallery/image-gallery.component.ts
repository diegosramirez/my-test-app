import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  QueryList,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage, GalleryConfig, DEFAULT_GALLERY_CONFIG } from '../../models/gallery-image.interface';
import { LazyImageDirective } from '../../directives/lazy-image.directive';
import { LightboxModalComponent } from '../lightbox-modal/lightbox-modal.component';
import { ImageGalleryService } from '../../services/image-gallery.service';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, LazyImageDirective, LightboxModalComponent],
  template: `
    <div class="gallery-container" [attr.data-device]="currentDevice">
      <!-- Empty state -->
      <div *ngIf="!images || images.length === 0" class="empty-state" role="status">
        <div class="empty-icon" aria-hidden="true">📸</div>
        <h3>No images available</h3>
        <p>There are currently no images to display in this gallery.</p>
      </div>

      <!-- Gallery grid -->
      <div
        *ngIf="images && images.length > 0"
        class="gallery-grid"
        [style.--mobile-columns]="config.columns.mobile"
        [style.--tablet-columns]="config.columns.tablet"
        [style.--desktop-columns]="config.columns.desktop"
        role="grid"
        [attr.aria-label]="'Image gallery with ' + images.length + ' images'"
      >
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByImageId"
          class="gallery-item"
          [class.loaded]="!image.loadError"
          [class.error]="image.loadError"
          role="gridcell"
          [attr.aria-label]="'Image ' + (i + 1) + ' of ' + images.length + ': ' + image.altText"
        >
          <button
            class="thumbnail-button"
            (click)="openLightbox(i)"
            (keydown.enter)="openLightbox(i)"
            (keydown.space)="openLightbox(i)"
            [attr.aria-label]="'Open image ' + (i + 1) + ': ' + image.altText"
            [attr.aria-describedby]="image.title ? 'title-' + i : null"
            #thumbnailButton
          >
            <div class="thumbnail-container">
              <img
                appLazyImage
                [src]="image.thumbnailUrl"
                [fallbackSrc]="'assets/images/placeholder.jpg'"
                [threshold]="config.lazyLoadThreshold"
                [alt]="image.altText"
                [class.thumbnail-image]="true"
                (imageLoaded)="onThumbnailLoaded(i, $event)"
                (imageError)="onThumbnailError(i, $event)"
                loading="lazy"
              />

              <div *ngIf="image.loadError" class="error-overlay" role="alert">
                <span class="error-icon" aria-hidden="true">⚠️</span>
                <span class="error-text">Failed to load</span>
                <button
                  class="retry-button"
                  (click)="retryImageLoad(i, $event)"
                  aria-label="Retry loading image"
                  type="button"
                >
                  Retry
                </button>
              </div>

              <div class="image-overlay">
                <span class="overlay-icon" aria-hidden="true">🔍</span>
              </div>
            </div>

            <div *ngIf="image.title" [id]="'title-' + i" class="image-title">
              {{ image.title }}
            </div>
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading" class="loading-state" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading images...</p>
      </div>

      <!-- Lightbox modal -->
      <app-lightbox-modal
        *ngIf="showLightbox"
        [images]="images"
        [initialIndex]="lightboxIndex"
        (closed)="closeLightbox($event)"
        (imageChanged)="onLightboxImageChanged($event)"
      ></app-lightbox-modal>
    </div>
  `,
  styleUrls: ['./image-gallery.component.css']
})
export class ImageGalleryComponent implements OnInit, OnDestroy {
  @Input() images: GalleryImage[] = [];
  @Input() config: GalleryConfig = DEFAULT_GALLERY_CONFIG;
  @Input() isLoading: boolean = false;
  @Input() enableAnalytics: boolean = true;

  @Output() imageClicked = new EventEmitter<{ image: GalleryImage; index: number }>();
  @Output() imageLoaded = new EventEmitter<{ image: GalleryImage; index: number; success: boolean }>();
  @Output() lightboxOpened = new EventEmitter<number>();
  @Output() lightboxClosed = new EventEmitter<string>();

  @ViewChildren('thumbnailButton') thumbnailButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  showLightbox = false;
  lightboxIndex = 0;
  currentDevice: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  galleryLoadStartTime = 0;
  private returnFocusIndex = 0;
  private resizeObserver?: ResizeObserver;
  private fallbackResizeHandler?: () => void;

  constructor(
    private galleryService: ImageGalleryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.galleryLoadStartTime = performance.now();
    this.updateDeviceType();
    this.setupResizeObserver();

    // Track gallery loaded after images are set
    if (this.images && this.images.length > 0) {
      setTimeout(() => {
        const loadTime = performance.now() - this.galleryLoadStartTime;
        if (this.enableAnalytics) {
          this.galleryService.trackGalleryLoaded(this.images.length, loadTime);
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clean up fallback resize event listener
    if (this.fallbackResizeHandler) {
      (window as Window).removeEventListener('resize', this.fallbackResizeHandler);
    }
  }

  trackByImageId(index: number, image: GalleryImage): string {
    return image.id;
  }

  openLightbox(index: number, event?: KeyboardEvent): void {
    if (event) {
      event.preventDefault();
    }

    this.lightboxIndex = index;
    this.returnFocusIndex = index;
    this.showLightbox = true;

    const thumbnailLoadTime = 0; // This would be tracked from the lazy load directive

    if (this.enableAnalytics) {
      this.galleryService.trackImageOpened(
        index,
        this.images[index].thumbnailUrl,
        thumbnailLoadTime
      );
    }

    this.imageClicked.emit({ image: this.images[index], index });
    this.lightboxOpened.emit(index);

    // Preload adjacent images
    this.preloadAdjacentImages(index);
  }

  closeLightbox(method: string): void {
    this.showLightbox = false;
    this.lightboxClosed.emit(method);

    // Restore focus to the thumbnail that opened the lightbox
    setTimeout(() => {
      const thumbnailButton = this.thumbnailButtons.toArray()[this.returnFocusIndex];
      if (thumbnailButton) {
        thumbnailButton.nativeElement.focus();
        // Add subtle highlight
        thumbnailButton.nativeElement.classList.add('recently-focused');
        setTimeout(() => {
          thumbnailButton.nativeElement.classList.remove('recently-focused');
        }, 2000);
      }
    }, 100);
  }

  onLightboxImageChanged(newIndex: number): void {
    this.lightboxIndex = newIndex;
    this.returnFocusIndex = newIndex;
    this.preloadAdjacentImages(newIndex);
  }

  onThumbnailLoaded(index: number, success: boolean): void {
    const image = this.images[index];

    if (success) {
      image.loadError = false;
    } else {
      image.loadError = true;
    }

    if (this.enableAnalytics) {
      this.galleryService.trackImageLazyLoaded(
        index,
        100, // viewport distance would be calculated in the directive
        success
      );
    }

    this.imageLoaded.emit({ image, index, success });
    this.cdr.detectChanges();
  }

  onThumbnailError(index: number, imageUrl: string): void {
    const image = this.images[index];
    this.images[index] = this.galleryService.handleImageError(image, 'thumbnail_load_failed');
    this.cdr.detectChanges();
  }

  retryImageLoad(index: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const image = this.images[index];
    image.loadError = false;
    image.retryCount = (image.retryCount || 0) + 1;

    // Find the lazy image directive and retry
    const thumbnailImg = event.target as HTMLElement;
    const imgElement = thumbnailImg.closest('.gallery-item')?.querySelector('img');

    if (imgElement) {
      // This would call the retry method on the directive
      // For now, we'll force a reload by updating the src
      const originalSrc = imgElement.getAttribute('src') || '';
      imgElement.setAttribute('src', '');
      setTimeout(() => {
        try {
          const url = new URL(originalSrc, window.location.origin);
          url.searchParams.set('retry', Date.now().toString());
          imgElement.setAttribute('src', url.toString());
        } catch {
          // Fallback for relative URLs or malformed URLs
          const separator = originalSrc.includes('?') ? '&' : '?';
          imgElement.setAttribute('src', originalSrc + separator + 'retry=' + Date.now());
        }
      }, 100);
    }

    this.cdr.detectChanges();
  }

  private updateDeviceType(): void {
    const width = window.innerWidth;

    if (width >= this.config.breakpoints.desktop) {
      this.currentDevice = 'desktop';
    } else if (width >= this.config.breakpoints.tablet) {
      this.currentDevice = 'tablet';
    } else {
      this.currentDevice = 'mobile';
    }
  }

  private setupResizeObserver(): void {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateDeviceType();
        this.cdr.detectChanges();
      });

      this.resizeObserver.observe(document.body);
    } else {
      // Fallback for browsers without ResizeObserver
      this.fallbackResizeHandler = () => {
        this.updateDeviceType();
        this.cdr.detectChanges();
      };
      (window as Window).addEventListener('resize', this.fallbackResizeHandler);
    }
  }

  private preloadAdjacentImages(currentIndex: number): void {
    const adjacentUrls = this.galleryService.getAdjacentImages(
      this.images,
      currentIndex,
      2
    );

    if (adjacentUrls.length > 0) {
      this.galleryService.preloadImages(adjacentUrls);
    }
  }
}