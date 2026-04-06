import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { GalleryThumbnailComponent } from '../gallery-thumbnail/gallery-thumbnail.component';
import { LightboxModalComponent } from '../lightbox-modal/lightbox-modal.component';
import { ImageLoadingService } from '../../services/image-loading.service';
import { ImageUtils } from '../../utils/image.utils';
import {
  GalleryImage,
  GalleryConfig,
  ResponsiveColumns,
  ResponsiveBreakpoints
} from '../../types/gallery.types';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, GalleryThumbnailComponent, LightboxModalComponent],
  template: `
    <div class="image-gallery"
         [class.loading]="isLoading"
         [style.--columns-mobile]="responsiveColumns.mobile"
         [style.--columns-tablet]="responsiveColumns.tablet"
         [style.--columns-desktop]="responsiveColumns.desktop"
         [style.--columns-large]="responsiveColumns.large"
         [style.--aspect-ratio]="aspectRatioPadding">

      <!-- Loading State -->
      <div *ngIf="isLoading" class="gallery-loading" aria-live="polite">
        <div class="loading-message">Loading gallery...</div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && (!images || images.length === 0)"
           class="gallery-empty"
           role="status"
           aria-live="polite">
        <div class="empty-message">
          <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M21,17H7V3H21M21,1H7C5.89,1 5,1.89 5,3V17A2,2 0 0,0 7,19H21A2,2 0 0,0 23,17V3C23,1.89 22.1,1 21,1M3,5H1V21A2,2 0 0,0 3,23H19V21H3M15.96,10.29L13.21,13.83L11.25,11.47L8.5,15H19.5L15.96,10.29Z" />
          </svg>
          <h3>No images to display</h3>
          <p>There are currently no images in this gallery.</p>
        </div>
      </div>

      <!-- Gallery Grid -->
      <div *ngIf="!isLoading && images && images.length > 0"
           class="gallery-grid"
           role="region"
           [attr.aria-label]="'Image gallery with ' + images.length + ' images'"
           tabindex="0"
           (keydown)="onGridKeydown($event)">

        <app-gallery-thumbnail
          *ngFor="let image of images; let i = index; trackBy: trackByImageId"
          #thumbnailComponents
          [image]="image"
          [index]="i"
          [aspectRatio]="aspectRatio"
          [isLoading]="isImageLoading(image.id)"
          (imageClicked)="onThumbnailClick(image, i)"
          (imageLoaded)="onImageLoaded(image, i)"
          (imageError)="onImageError(image, i)"
          class="gallery-item"
          [attr.data-index]="i">
        </app-gallery-thumbnail>
      </div>

      <!-- Lightbox Modal -->
      <app-lightbox-modal
        *ngIf="lightboxVisible"
        [images]="images || []"
        [currentIndex]="currentLightboxIndex"
        [visible]="lightboxVisible"
        (imageChanged)="onLightboxImageChanged($event)"
        (closed)="onLightboxClosed($event)"
        (navigationUsed)="onNavigationUsed($event)">
      </app-lightbox-modal>
    </div>
  `,
  styleUrls: ['./image-gallery.component.scss']
})
export class ImageGalleryComponent implements OnInit, OnDestroy {
  @Input() images: GalleryImage[] = [];
  @Input() aspectRatio: string = '16:9';
  @Input() columns: ResponsiveColumns = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 4
  };
  @Input() config: Partial<GalleryConfig> = {};

  @Output() imageClicked = new EventEmitter<{image: GalleryImage, index: number}>();
  @Output() modalOpened = new EventEmitter<{image: GalleryImage, index: number}>();
  @Output() modalClosed = new EventEmitter<{lastViewedIndex: number}>();
  @Output() galleryLoaded = new EventEmitter<{imageCount: number, loadTime: number}>();

  @ViewChildren('thumbnailComponents') thumbnailComponents!: QueryList<GalleryThumbnailComponent>;

  private imageLoadingService = inject(ImageLoadingService);

  isLoading = false;
  lightboxVisible = false;
  currentLightboxIndex = 0;
  responsiveColumns: ResponsiveColumns;
  aspectRatioPadding: string;

  private subscriptions = new Subscription();
  private loadStartTime = 0;
  private lastFocusedThumbnail?: HTMLElement;
  private defaultConfig: GalleryConfig = {
    aspectRatio: '16:9',
    lazyLoadThreshold: 200,
    transitionDuration: 300,
    retryAttempts: 3,
    retryDelay: 1000,
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1200,
      large: 1200
    }
  };

  constructor() {
    this.responsiveColumns = this.columns;
    this.aspectRatioPadding = this.calculateAspectRatioPadding();
  }

  ngOnInit(): void {
    this.loadStartTime = Date.now();
    this.isLoading = true;

    // Track gallery load event
    this.imageLoadingService.trackEvent('gallery_loaded', {
      image_count: this.images?.length || 0,
      load_time: Date.now() - this.loadStartTime
    });

    // Simulate loading for demonstration
    setTimeout(() => {
      this.isLoading = false;
      this.emitGalleryLoaded();
    }, 100);

    this.setupResponsiveColumns();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.imageLoadingService.destroy();
  }

  /**
   * Track by function for ngFor
   */
  trackByImageId(index: number, image: GalleryImage): string {
    return image.id;
  }

  /**
   * Handle thumbnail click
   */
  onThumbnailClick(image: GalleryImage, index: number): void {
    this.imageClicked.emit({ image, index });
    this.openLightbox(index);

    // Track click event
    this.imageLoadingService.trackEvent('thumbnail_clicked', {
      image_id: image.id,
      position_in_grid: index
    });
  }

  /**
   * Handle image loaded event
   */
  onImageLoaded(image: GalleryImage, index: number): void {
    // Image load is handled by the service
  }

  /**
   * Handle image error event
   */
  onImageError(image: GalleryImage, index: number): void {
    console.warn(`Failed to load image: ${image.id}`);
  }

  /**
   * Open lightbox modal
   */
  openLightbox(index: number): void {
    this.currentLightboxIndex = index;
    this.lightboxVisible = true;
    this.lastFocusedThumbnail = document.activeElement as HTMLElement;

    const image = this.images[index];
    this.modalOpened.emit({ image, index });

    // Track modal open event
    this.imageLoadingService.trackEvent('modal_opened', {
      image_id: image.id,
      navigation_method: 'mouse'
    });
  }

  /**
   * Handle lightbox image change
   */
  onLightboxImageChanged(newIndex: number): void {
    const fromImage = this.images[this.currentLightboxIndex];
    const toImage = this.images[newIndex];

    this.currentLightboxIndex = newIndex;

    // Track navigation event
    this.imageLoadingService.trackEvent('modal_navigated', {
      from_image_id: fromImage.id,
      to_image_id: toImage.id,
      method: 'arrow_keys'
    });
  }

  /**
   * Handle lightbox closed
   */
  onLightboxClosed(event: {lastViewedIndex: number, closeMethod: string}): void {
    this.lightboxVisible = false;
    this.modalClosed.emit({ lastViewedIndex: event.lastViewedIndex });

    // Return focus to the last focused thumbnail
    if (this.lastFocusedThumbnail) {
      this.lastFocusedThumbnail.focus();
    }

    // Track modal close event
    const image = this.images[event.lastViewedIndex];
    this.imageLoadingService.trackEvent('modal_closed', {
      image_id: image.id,
      time_spent: Date.now(), // In real app, track actual time
      close_method: event.closeMethod
    });
  }

  /**
   * Handle navigation method used
   */
  onNavigationUsed(method: string): void {
    // Track navigation usage for analytics
    this.imageLoadingService.trackEvent('navigation_method_used', {
      method: method,
      current_image_id: this.images[this.currentLightboxIndex]?.id
    });
  }

  /**
   * Handle keyboard navigation on grid
   */
  onGridKeydown(event: KeyboardEvent): void {
    const currentIndex = this.getCurrentFocusedIndex();
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, this.images.length - 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        event.preventDefault();
        const currentColumns = this.getCurrentColumns();
        newIndex = Math.min(currentIndex + currentColumns, this.images.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const columns = this.getCurrentColumns();
        newIndex = Math.max(currentIndex - columns, 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onThumbnailClick(this.images[currentIndex], currentIndex);
        return;
    }

    if (newIndex !== currentIndex) {
      this.focusThumbnail(newIndex);
    }
  }

  /**
   * Get current number of columns based on viewport
   */
  private getCurrentColumns(): number {
    const width = window.innerWidth;
    const breakpoints = { ...this.defaultConfig.breakpoints, ...this.config.breakpoints };
    return ImageUtils.getColumnsForWidth(width, breakpoints);
  }

  /**
   * Get currently focused thumbnail index
   */
  private getCurrentFocusedIndex(): number {
    const activeElement = document.activeElement as HTMLElement;
    const dataIndex = activeElement?.getAttribute('data-index');
    return dataIndex ? parseInt(dataIndex, 10) : 0;
  }

  /**
   * Focus specific thumbnail
   */
  private focusThumbnail(index: number): void {
    const thumbnailElement = document.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (thumbnailElement) {
      thumbnailElement.focus();
    }
  }

  /**
   * Check if image is currently loading
   */
  isImageLoading(imageId: string): boolean {
    // This would be connected to the loading service
    return false;
  }

  /**
   * Setup responsive columns based on window size
   */
  @HostListener('window:resize')
  setupResponsiveColumns(): void {
    // Update responsive columns based on current viewport
    this.responsiveColumns = this.columns;
  }

  /**
   * Calculate aspect ratio padding for CSS
   */
  private calculateAspectRatioPadding(): string {
    return `${ImageUtils.parseAspectRatio(this.aspectRatio) * 100}%`;
  }

  /**
   * Emit gallery loaded event
   */
  private emitGalleryLoaded(): void {
    const loadTime = Date.now() - this.loadStartTime;
    this.galleryLoaded.emit({
      imageCount: this.images?.length || 0,
      loadTime
    });
  }
}