import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { ImageLoadingService } from '../../services/image-loading.service';
import { ImageUtils } from '../../utils/image.utils';
import { GalleryImage } from '../../types/gallery.types';

@Component({
  selector: 'app-gallery-thumbnail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="thumbnail-container"
         [class.loading]="isLoading"
         [class.error]="hasError"
         [class.loaded]="isImageLoaded"
         [attr.aria-label]="imageAriaLabel"
         [attr.aria-describedby]="image.caption ? 'caption-' + image.id : null"
         role="button"
         tabindex="0"
         (click)="onImageClick()"
         (keydown)="onKeydown($event)">

      <!-- Loading Placeholder -->
      <div *ngIf="isLoading && !hasError"
           class="thumbnail-placeholder loading-placeholder"
           [style.aspect-ratio]="aspectRatio"
           aria-hidden="true">
        <div class="loading-spinner">
          <svg class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <span class="sr-only">Loading image</span>
      </div>

      <!-- Error Placeholder -->
      <div *ngIf="hasError"
           class="thumbnail-placeholder error-placeholder"
           [style.aspect-ratio]="aspectRatio"
           aria-hidden="true">
        <div class="error-content">
          <svg class="error-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
          </svg>
          <div class="error-text">Failed to load</div>
          <button type="button"
                  class="retry-button"
                  (click)="retryImageLoad($event)"
                  [attr.aria-label]="'Retry loading ' + image.alt">
            Retry
          </button>
        </div>
        <span class="sr-only">Image failed to load. {{image.alt}}</span>
      </div>

      <!-- Actual Image -->
      <img #thumbnailImage
           *ngIf="!isLoading && !hasError"
           class="thumbnail-image"
           [src]="optimizedImageUrl"
           [alt]="image.alt"
           [style.aspect-ratio]="aspectRatio"
           [attr.aria-describedby]="image.caption ? 'caption-' + image.id : null"
           (load)="onImageLoad()"
           (error)="onImageError()"
           loading="lazy"
           decoding="async" />

      <!-- Image Caption -->
      <div *ngIf="image.caption && isImageLoaded"
           class="thumbnail-caption"
           [id]="'caption-' + image.id"
           [attr.aria-label]="'Image caption: ' + image.caption">
        {{ image.caption }}
      </div>

      <!-- Loading Progress Indicator -->
      <div *ngIf="isLoading"
           class="loading-progress"
           role="progressbar"
           aria-valuenow="50"
           aria-valuemin="0"
           aria-valuemax="100"
           [attr.aria-label]="'Loading ' + image.alt">
        <div class="progress-bar"></div>
      </div>
    </div>
  `,
  styleUrls: ['./gallery-thumbnail.component.scss']
})
export class GalleryThumbnailComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() image!: GalleryImage;
  @Input() index!: number;
  @Input() aspectRatio: string = '16:9';
  @Input() isLoading: boolean = false;

  @Output() imageClicked = new EventEmitter<void>();
  @Output() imageLoaded = new EventEmitter<void>();
  @Output() imageError = new EventEmitter<void>();

  @ViewChild('thumbnailImage') thumbnailImageRef?: ElementRef<HTMLImageElement>;

  private imageLoadingService = inject(ImageLoadingService);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  isImageLoaded = false;
  hasError = false;
  optimizedImageUrl = '';
  imageAriaLabel = '';

  private subscriptions = new Subscription();
  private retryCount = 0;
  private maxRetries = 3;

  ngOnInit(): void {
    this.setupImageUrl();
    this.setupAriaLabel();
    this.isLoading = true;
  }

  ngAfterViewInit(): void {
    // Setup lazy loading when component is in view
    this.setupLazyLoading();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.imageLoadingService.unobserveImageElement(this.elementRef.nativeElement);
  }

  /**
   * Handle image click
   */
  onImageClick(): void {
    if (!this.hasError) {
      this.imageClicked.emit();

      // Track click for analytics
      this.imageLoadingService.trackEvent('thumbnail_clicked', {
        image_id: this.image.id,
        position_in_grid: this.index,
        loading_state: this.isImageLoaded ? 'loaded' : 'loading'
      });
    }
  }

  /**
   * Handle keyboard navigation
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onImageClick();
    }
  }

  /**
   * Handle successful image load
   */
  onImageLoad(): void {
    this.isLoading = false;
    this.isImageLoaded = true;
    this.hasError = false;
    this.retryCount = 0;

    this.imageLoaded.emit();
    this.cdr.detectChanges();

    // Track successful load
    this.imageLoadingService.trackEvent('image_loaded', {
      image_id: this.image.id,
      retry_count: this.retryCount,
      position_in_grid: this.index
    });
  }

  /**
   * Handle image load error
   */
  onImageError(): void {
    this.isLoading = false;
    this.hasError = true;
    this.isImageLoaded = false;

    this.imageError.emit();
    this.cdr.detectChanges();

    // Track error
    this.imageLoadingService.trackEvent('image_error', {
      image_id: this.image.id,
      error_type: 'load_failure',
      retry_attempt: this.retryCount,
      position_in_grid: this.index
    });
  }

  /**
   * Retry image load
   */
  retryImageLoad(event: Event): void {
    event.stopPropagation(); // Prevent triggering image click

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.hasError = false;
      this.isLoading = true;
      this.isImageLoaded = false;

      // Reset image src to force reload
      if (this.thumbnailImageRef?.nativeElement) {
        this.thumbnailImageRef.nativeElement.src = '';
        setTimeout(() => {
          this.setupImageUrl();
          if (this.thumbnailImageRef?.nativeElement) {
            this.thumbnailImageRef.nativeElement.src = this.optimizedImageUrl;
          }
        }, 100);
      } else {
        this.setupImageUrl();
      }

      this.cdr.detectChanges();

      // Track retry attempt
      this.imageLoadingService.trackEvent('image_retry', {
        image_id: this.image.id,
        retry_attempt: this.retryCount,
        position_in_grid: this.index
      });
    }
  }

  /**
   * Setup optimized image URL
   */
  private setupImageUrl(): void {
    if (!ImageUtils.isValidGalleryImage(this.image)) {
      this.hasError = true;
      return;
    }

    // Use utility to get optimized URL (WebP if supported, etc.)
    this.optimizedImageUrl = ImageUtils.getOptimizedImageUrl(this.image, false);
  }

  /**
   * Setup ARIA label for accessibility
   */
  private setupAriaLabel(): void {
    let label = `Image ${this.index + 1}: ${this.image.alt}`;

    if (this.image.caption) {
      label += `. ${this.image.caption}`;
    }

    label += '. Click to open in lightbox.';
    this.imageAriaLabel = label;
  }

  /**
   * Setup lazy loading using Intersection Observer
   */
  private setupLazyLoading(): void {
    if (!this.image || !ImageUtils.isValidImageUrl(this.image.thumbnailUrl)) {
      this.hasError = true;
      return;
    }

    // Subscribe to loading state from service
    const loadingSubscription = this.imageLoadingService
      .getImageLoadingState(this.image.id)
      .subscribe(state => {
        switch (state) {
          case 'loading':
            this.isLoading = true;
            this.hasError = false;
            break;
          case 'loaded':
            this.isLoading = false;
            this.isImageLoaded = true;
            this.hasError = false;
            break;
          case 'error':
            this.isLoading = false;
            this.hasError = true;
            this.isImageLoaded = false;
            break;
        }
        this.cdr.detectChanges();
      });

    this.subscriptions.add(loadingSubscription);

    // Start observing for lazy loading
    this.imageLoadingService.observeImageElement(
      this.elementRef.nativeElement,
      this.image.id,
      this.optimizedImageUrl
    );
  }
}