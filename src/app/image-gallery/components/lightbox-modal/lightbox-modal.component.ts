import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  Renderer2,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../../models/gallery-image.interface';
import { ImageGalleryService } from '../../services/image-gallery.service';

@Component({
  selector: 'app-lightbox-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="lightbox-overlay"
      (click)="closeOnBackdrop($event)"
      [@fadeIn]
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="'lightbox-title-' + currentIndex"
      [attr.aria-describedby]="'lightbox-description-' + currentIndex"
    >
      <div class="lightbox-container">
        <!-- Close button -->
        <button
          class="close-button"
          (click)="close('button')"
          aria-label="Close lightbox"
          #closeButton
        >
          <span aria-hidden="true">&times;</span>
        </button>

        <!-- Image counter -->
        <div class="image-counter" role="status" aria-live="polite">
          {{ currentIndex + 1 }} of {{ images.length }}
        </div>

        <!-- Navigation buttons -->
        <button
          *ngIf="images.length > 1"
          class="nav-button nav-prev"
          (click)="navigate('previous', 'click')"
          [disabled]="currentIndex === 0"
          aria-label="Previous image"
          [attr.aria-disabled]="currentIndex === 0"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          *ngIf="images.length > 1"
          class="nav-button nav-next"
          (click)="navigate('next', 'click')"
          [disabled]="currentIndex === images.length - 1"
          aria-label="Next image"
          [attr.aria-disabled]="currentIndex === images.length - 1"
        >
          <span aria-hidden="true">›</span>
        </button>

        <!-- Main image container -->
        <div
          class="image-container"
          (touchstart)="onTouchStart($event)"
          (touchend)="onTouchEnd($event)"
          (touchmove)="onTouchMove($event)"
        >
          <div *ngIf="imageLoading" class="loading-indicator" aria-label="Loading image">
            <div class="spinner"></div>
          </div>

          <img
            #mainImage
            [src]="currentImage?.fullSizeUrl"
            [alt]="currentImage?.altText || 'Gallery image'"
            (load)="onImageLoad()"
            (error)="onImageError()"
            [class.loaded]="!imageLoading"
            [class.error]="imageError"
            [attr.id]="'lightbox-image-' + currentIndex"
          />

          <div
            *ngIf="imageError"
            class="error-overlay"
            role="alert"
          >
            <p>Failed to load image</p>
            <button
              class="retry-button"
              (click)="retryImageLoad()"
              aria-label="Retry loading image"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Image title and description -->
        <div *ngIf="currentImage?.title || currentImage?.description" class="image-info">
          <h2
            *ngIf="currentImage?.title"
            [id]="'lightbox-title-' + currentIndex"
            class="image-title"
          >
            {{ currentImage?.title }}
          </h2>
          <p
            *ngIf="currentImage?.description"
            [id]="'lightbox-description-' + currentIndex"
            class="image-description"
          >
            {{ currentImage?.description }}
          </p>
        </div>

        <!-- Keyboard shortcuts help -->
        <div class="keyboard-help" [class.visible]="showKeyboardHelp">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><kbd>←</kbd> / <kbd>→</kbd> Navigate images</li>
            <li><kbd>Esc</kbd> Close lightbox</li>
            <li><kbd>?</kbd> Toggle this help</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./lightbox-modal.component.css'],
  animations: []
})
export class LightboxModalComponent implements OnInit, OnDestroy {
  @Input() images: GalleryImage[] = [];
  @Input() initialIndex: number = 0;
  @Output() closed = new EventEmitter<string>();
  @Output() imageChanged = new EventEmitter<number>();

  @ViewChild('closeButton') closeButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('mainImage') mainImage!: ElementRef<HTMLImageElement>;

  currentIndex: number = 0;
  currentImage?: GalleryImage;
  imageLoading = true;
  imageError = false;
  showKeyboardHelp = false;

  // Touch gesture properties
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private minSwipeDistance = 50;

  // Modal lifecycle
  private modalOpenTime = 0;
  private imagesViewedSet = new Set<number>();
  private focusedElementBeforeModal?: HTMLElement;

  // Preloading
  private preloadedImages = new Map<string, HTMLImageElement>();

  constructor(
    private galleryService: ImageGalleryService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.modalOpenTime = Date.now();
    this.currentIndex = Math.max(0, Math.min(this.initialIndex, this.images.length - 1));
    this.currentImage = this.images[this.currentIndex];
    this.imagesViewedSet.add(this.currentIndex);

    // Store the currently focused element
    this.focusedElementBeforeModal = document.activeElement as HTMLElement;

    // Disable body scroll
    this.renderer.addClass(document.body, 'modal-open');

    // Set initial focus after view init
    setTimeout(() => {
      this.closeButton?.nativeElement?.focus();
    }, 100);

    // Preload adjacent images
    this.preloadAdjacentImages();
  }

  ngOnDestroy(): void {
    // Re-enable body scroll
    this.renderer.removeClass(document.body, 'modal-open');

    // Restore focus
    if (this.focusedElementBeforeModal) {
      this.focusedElementBeforeModal.focus();
    }

    // Track modal close
    const viewDuration = Date.now() - this.modalOpenTime;
    this.galleryService.trackGalleryClosed(
      viewDuration,
      this.imagesViewedSet.size,
      'outside'
    );
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close('escape');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (this.currentIndex > 0) {
          this.navigate('previous', 'keyboard');
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (this.currentIndex < this.images.length - 1) {
          this.navigate('next', 'keyboard');
        }
        break;
      case '?':
        event.preventDefault();
        this.toggleKeyboardHelp();
        break;
    }
  }

  navigate(direction: 'next' | 'previous', method: 'click' | 'keyboard' | 'touch'): void {
    const newIndex = direction === 'next' ? this.currentIndex + 1 : this.currentIndex - 1;

    if (newIndex >= 0 && newIndex < this.images.length) {
      this.currentIndex = newIndex;
      this.currentImage = this.images[this.currentIndex];
      this.imageLoading = true;
      this.imageError = false;
      this.imagesViewedSet.add(this.currentIndex);

      // Track navigation
      this.galleryService.trackGalleryNavigated(
        direction,
        method,
        this.currentIndex,
        this.images.length
      );

      // Emit change event
      this.imageChanged.emit(this.currentIndex);

      // Preload adjacent images
      this.preloadAdjacentImages();

      this.cdr.detectChanges();
    }
  }

  close(method: 'button' | 'escape' | 'outside' | 'swipe'): void {
    const viewDuration = Date.now() - this.modalOpenTime;
    this.galleryService.trackGalleryClosed(
      viewDuration,
      this.imagesViewedSet.size,
      method
    );

    this.closed.emit(method);
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close('outside');
    }
  }

  onImageLoad(): void {
    this.imageLoading = false;
    this.imageError = false;
  }

  onImageError(): void {
    this.imageLoading = false;
    this.imageError = true;

    if (this.currentImage) {
      this.galleryService.handleImageError(this.currentImage, 'load_failed');
    }
  }

  retryImageLoad(): void {
    if (this.currentImage) {
      this.imageLoading = true;
      this.imageError = false;

      // Force reload by updating src
      const img = this.mainImage.nativeElement;
      const originalSrc = img.src;
      img.src = '';
      setTimeout(() => {
        img.src = originalSrc + '?retry=' + Date.now();
      }, 100);
    }
  }

  // Touch gesture handlers
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchMove(event: TouchEvent): void {
    // Prevent default scroll behavior during swipe
    if (Math.abs(event.changedTouches[0].screenX - this.touchStartX) > 10) {
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleGesture();
  }

  private handleGesture(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;

    // Check if horizontal swipe is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > this.minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right - previous image
          if (this.currentIndex > 0) {
            this.navigate('previous', 'touch');
          }
        } else {
          // Swipe left - next image
          if (this.currentIndex < this.images.length - 1) {
            this.navigate('next', 'touch');
          }
        }
      }
    } else if (Math.abs(deltaY) > this.minSwipeDistance && deltaY > 0) {
      // Swipe down - close modal
      this.close('swipe');
    }
  }

  private preloadAdjacentImages(): void {
    const adjacentUrls = this.galleryService.getAdjacentImages(
      this.images,
      this.currentIndex,
      2
    );

    adjacentUrls.forEach(url => {
      if (!this.preloadedImages.has(url)) {
        const img = new Image();
        img.onload = () => {
          this.preloadedImages.set(url, img);
        };
        img.src = url;
      }
    });
  }

  private toggleKeyboardHelp(): void {
    this.showKeyboardHelp = !this.showKeyboardHelp;
  }
}