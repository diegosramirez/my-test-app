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
  HostListener,
  ChangeDetectorRef,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';

import { ImageLoadingService } from '../../services/image-loading.service';
import { ImageUtils } from '../../utils/image.utils';
import { GalleryImage, NavigationMethod, CloseMethod } from '../../types/gallery.types';

@Component({
  selector: 'app-lightbox-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lightbox-overlay"
         [class.visible]="visible"
         [attr.aria-hidden]="!visible"
         role="dialog"
         aria-modal="true"
         [attr.aria-label]="'Image viewer showing image ' + (currentIndex + 1) + ' of ' + images.length"
         (click)="onOverlayClick($event)"
         (keydown)="onKeydown($event)"
         tabindex="0"
         #overlayElement>

      <!-- Close Button -->
      <button type="button"
              class="lightbox-close"
              (click)="onCloseClick()"
              [attr.aria-label]="'Close image viewer'"
              tabindex="0">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
        <span class="sr-only">Close</span>
      </button>

      <!-- Navigation: Previous -->
      <button type="button"
              *ngIf="images.length > 1"
              class="lightbox-nav lightbox-nav-prev"
              (click)="navigatePrevious()"
              [disabled]="currentIndex === 0"
              [attr.aria-label]="'Previous image'"
              tabindex="0">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
        </svg>
        <span class="sr-only">Previous</span>
      </button>

      <!-- Navigation: Next -->
      <button type="button"
              *ngIf="images.length > 1"
              class="lightbox-nav lightbox-nav-next"
              (click)="navigateNext()"
              [disabled]="currentIndex === images.length - 1"
              [attr.aria-label]="'Next image'"
              tabindex="0">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
        </svg>
        <span class="sr-only">Next</span>
      </button>

      <!-- Main Image Container -->
      <div class="lightbox-content"
           [class.loading]="isImageLoading"
           [class.error]="hasImageError"
           (click)="$event.stopPropagation()">

        <!-- Loading State -->
        <div *ngIf="isImageLoading"
             class="lightbox-loading"
             role="status"
             aria-live="polite">
          <div class="loading-spinner">
            <svg class="spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <div class="loading-text">Loading image...</div>
        </div>

        <!-- Error State -->
        <div *ngIf="hasImageError && !isImageLoading"
             class="lightbox-error"
             role="alert">
          <div class="error-content">
            <svg class="error-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
            </svg>
            <div class="error-message">Failed to load image</div>
            <button type="button"
                    class="retry-button"
                    (click)="retryCurrentImage()"
                    [attr.aria-label]="'Retry loading ' + currentImage?.alt">
              Retry
            </button>
          </div>
        </div>

        <!-- Main Image -->
        <img *ngIf="!isImageLoading && !hasImageError && currentImage"
             #lightboxImage
             class="lightbox-image"
             [src]="currentImageUrl"
             [alt]="currentImage.alt"
             (load)="onImageLoad()"
             (error)="onImageError()"
             (dragstart)="$event.preventDefault()"
             draggable="false" />

        <!-- Image Info -->
        <div *ngIf="currentImage && !isImageLoading"
             class="lightbox-info">

          <!-- Image Counter -->
          <div class="image-counter"
               role="status"
               [attr.aria-label]="'Image ' + (currentIndex + 1) + ' of ' + images.length">
            {{currentIndex + 1}} / {{images.length}}
          </div>

          <!-- Image Caption -->
          <div *ngIf="currentImage.caption"
               class="image-caption"
               [attr.aria-label]="'Caption: ' + currentImage.caption">
            {{currentImage.caption}}
          </div>
        </div>
      </div>

      <!-- Keyboard Instructions (Screen Reader Only) -->
      <div class="sr-only" role="region" aria-label="Keyboard instructions">
        Use arrow keys to navigate between images. Press Escape to close the viewer.
      </div>
    </div>
  `,
  styleUrls: ['./lightbox-modal.component.scss']
})
export class LightboxModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() images: GalleryImage[] = [];
  @Input() currentIndex: number = 0;
  @Input() visible: boolean = false;

  @Output() imageChanged = new EventEmitter<number>();
  @Output() closed = new EventEmitter<{lastViewedIndex: number, closeMethod: CloseMethod}>();
  @Output() navigationUsed = new EventEmitter<NavigationMethod>();

  @ViewChild('overlayElement') overlayElementRef?: ElementRef<HTMLElement>;
  @ViewChild('lightboxImage') lightboxImageRef?: ElementRef<HTMLImageElement>;

  private overlay = inject(Overlay);
  private imageLoadingService = inject(ImageLoadingService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  currentImage?: GalleryImage;
  currentImageUrl = '';
  isImageLoading = false;
  hasImageError = false;

  private overlayRef?: OverlayRef;
  private subscriptions = new Subscription();
  private focusedElementBeforeModal?: HTMLElement;
  private touchStartX = 0;
  private touchStartY = 0;
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.visible) {
      this.updateCurrentImage();
      this.setupModal();
    }
  }

  ngAfterViewInit(): void {
    if (this.visible) {
      this.focusModal();
      this.setupTouchEvents();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroyModal();
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.visible) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeModal('escape');
        this.navigationUsed.emit('keyboard');
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.navigatePrevious();
        this.navigationUsed.emit('keyboard');
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.navigateNext();
        this.navigationUsed.emit('keyboard');
        break;

      case 'Home':
        event.preventDefault();
        this.navigateToIndex(0);
        this.navigationUsed.emit('keyboard');
        break;

      case 'End':
        event.preventDefault();
        this.navigateToIndex(this.images.length - 1);
        this.navigationUsed.emit('keyboard');
        break;
    }
  }

  /**
   * Handle overlay click (close on outside click)
   */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal('outside-click');
      this.navigationUsed.emit('mouse');
    }
  }

  /**
   * Handle close button click
   */
  onCloseClick(): void {
    this.closeModal('button');
    this.navigationUsed.emit('mouse');
  }

  /**
   * Navigate to previous image
   */
  navigatePrevious(): void {
    if (this.currentIndex > 0) {
      this.navigateToIndex(this.currentIndex - 1);
    }
  }

  /**
   * Navigate to next image
   */
  navigateNext(): void {
    if (this.currentIndex < this.images.length - 1) {
      this.navigateToIndex(this.currentIndex + 1);
    }
  }

  /**
   * Navigate to specific index
   */
  navigateToIndex(index: number): void {
    if (index >= 0 && index < this.images.length && index !== this.currentIndex) {
      this.currentIndex = index;
      this.updateCurrentImage();
      this.imageChanged.emit(this.currentIndex);

      // Track navigation
      this.imageLoadingService.trackEvent('modal_navigated', {
        to_image_id: this.currentImage?.id,
        method: 'navigation_buttons',
        new_index: index
      });
    }
  }

  /**
   * Handle successful image load
   */
  onImageLoad(): void {
    this.isImageLoading = false;
    this.hasImageError = false;
    this.cdr.detectChanges();
  }

  /**
   * Handle image load error
   */
  onImageError(): void {
    this.isImageLoading = false;
    this.hasImageError = true;
    this.cdr.detectChanges();

    // Track error
    if (this.currentImage) {
      this.imageLoadingService.trackEvent('image_error', {
        image_id: this.currentImage.id,
        error_type: 'lightbox_load_failure',
        context: 'lightbox'
      });
    }
  }

  /**
   * Retry loading current image
   */
  retryCurrentImage(): void {
    if (this.currentImage) {
      this.hasImageError = false;
      this.isImageLoading = true;
      this.loadCurrentImage();
    }
  }

  /**
   * Setup modal and focus management
   */
  private setupModal(): void {
    if (!this.isBrowser) return;

    // Store currently focused element
    this.focusedElementBeforeModal = document.activeElement as HTMLElement;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Focus modal for screen readers
   */
  private focusModal(): void {
    if (this.overlayElementRef?.nativeElement) {
      setTimeout(() => {
        this.overlayElementRef?.nativeElement.focus();
      }, 100);
    }
  }

  /**
   * Setup touch events for mobile navigation
   */
  private setupTouchEvents(): void {
    if (!this.isBrowser || !this.overlayElementRef?.nativeElement) return;

    const element = this.overlayElementRef.nativeElement;

    element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    element.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
  }

  /**
   * Handle touch start
   */
  private onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  /**
   * Handle touch end (swipe navigation)
   */
  private onTouchEnd(event: TouchEvent): void {
    if (!event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Check if it's a horizontal swipe (not vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous
        this.navigatePrevious();
      } else {
        // Swipe left - go to next
        this.navigateNext();
      }
      this.navigationUsed.emit('touch');
    }
  }

  /**
   * Update current image and load it
   */
  private updateCurrentImage(): void {
    if (this.images && this.images.length > 0 && this.currentIndex >= 0 && this.currentIndex < this.images.length) {
      this.currentImage = this.images[this.currentIndex];
      this.loadCurrentImage();
    }
  }

  /**
   * Load current image
   */
  private loadCurrentImage(): void {
    if (!this.currentImage) return;

    this.isImageLoading = true;
    this.hasImageError = false;

    // Get optimized URL for full-size image
    this.currentImageUrl = ImageUtils.getOptimizedImageUrl(this.currentImage, true);

    // Preload the image
    const preloadSubscription = this.imageLoadingService
      .preloadImage(this.currentImage)
      .subscribe({
        next: (state) => {
          if (state === 'loaded') {
            this.onImageLoad();
          } else {
            this.onImageError();
          }
        },
        error: () => {
          this.onImageError();
        }
      });

    this.subscriptions.add(preloadSubscription);
  }

  /**
   * Close modal
   */
  private closeModal(closeMethod: CloseMethod): void {
    this.closed.emit({
      lastViewedIndex: this.currentIndex,
      closeMethod
    });

    this.destroyModal();
  }

  /**
   * Destroy modal and cleanup
   */
  private destroyModal(): void {
    if (!this.isBrowser) return;

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (this.focusedElementBeforeModal) {
      this.focusedElementBeforeModal.focus();
    }

    // Clean up overlay
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = undefined;
    }
  }
}