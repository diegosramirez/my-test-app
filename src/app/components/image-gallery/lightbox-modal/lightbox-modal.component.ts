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
  NgZone,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ImageItem, GalleryEvent, LoadingState } from '../types/image-gallery.types';
import { GalleryService } from '../services/gallery.service';

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  swipeThreshold: number;
}

@Component({
  selector: 'app-lightbox-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="lightbox-overlay"
      [class.visible]="isVisible"
      [attr.aria-hidden]="!isVisible"
      [attr.role]="'dialog'"
      [attr.aria-modal]="true"
      [attr.aria-label]="'Image gallery lightbox'"
      (click)="onOverlayClick($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      #lightboxContainer
    >
      <!-- Close button -->
      <button
        class="close-button"
        [attr.aria-label]="'Close lightbox'"
        (click)="onCloseClick()"
      >
        <span aria-hidden="true">×</span>
      </button>

      <!-- Navigation buttons -->
      <button
        class="nav-button nav-button-prev"
        [class.visible]="showNavButtons && canNavigatePrev()"
        [attr.aria-label]="'Previous image'"
        [attr.disabled]="!canNavigatePrev()"
        (click)="navigatePrev()"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <button
        class="nav-button nav-button-next"
        [class.visible]="showNavButtons && canNavigateNext()"
        [attr.aria-label]="'Next image'"
        [attr.disabled]="!canNavigateNext()"
        (click)="navigateNext()"
      >
        <span aria-hidden="true">›</span>
      </button>

      <!-- Main image container -->
      <div class="image-container" (click)="onImageClick($event)">
        <!-- Loading state -->
        <div
          class="loading-state"
          [class.visible]="imageLoadingState === LoadingState.LOADING"
          [attr.aria-label]="'Loading full-size image'"
        >
          <div class="loading-spinner" aria-hidden="true"></div>
          <div class="loading-text">Loading...</div>
        </div>

        <!-- Error state -->
        <div
          class="error-state"
          [class.visible]="imageLoadingState === LoadingState.ERROR"
          [attr.aria-label]="'Failed to load full-size image'"
        >
          <div class="error-icon" aria-hidden="true">⚠</div>
          <div class="error-message">Failed to load image</div>
          <button
            class="retry-button"
            (click)="retryImageLoad()"
            [attr.aria-label]="'Retry loading full-size image'"
          >
            Retry
          </button>
        </div>

        <!-- Main image -->
        <img
          #lightboxImage
          class="lightbox-image"
          [class.visible]="imageLoadingState === LoadingState.LOADED"
          [class.dragging]="touchState.isDragging"
          [src]="currentImage?.fullSizeUrl"
          [alt]="currentImage?.alt"
          [title]="currentImage?.title"
          (load)="onImageLoad()"
          (error)="onImageError()"
          (dragstart)="$event.preventDefault()"
        />

        <!-- Image info -->
        <div
          class="image-info"
          [class.visible]="showImageInfo && currentImage?.title"
          [attr.aria-live]="'polite'"
        >
          <div class="image-title">{{ currentImage?.title }}</div>
          <div class="image-counter" *ngIf="images.length > 1">
            {{ selectedIndex + 1 }} of {{ images.length }}
          </div>
        </div>

        <!-- Navigation hints -->
        <div
          class="navigation-hints"
          [class.visible]="showNavigationHints"
          [attr.aria-hidden]="true"
        >
          <div class="hint-item">
            <span class="hint-key">←→</span>
            <span class="hint-text">Navigate</span>
          </div>
          <div class="hint-item">
            <span class="hint-key">Esc</span>
            <span class="hint-text">Close</span>
          </div>
          <div class="hint-item" *ngIf="isTouchDevice">
            <span class="hint-key">Swipe</span>
            <span class="hint-text">Navigate</span>
          </div>
        </div>
      </div>

      <!-- ARIA live region for announcements -->
      <div class="sr-only" [attr.aria-live]="'polite'" [attr.aria-atomic]="'true'">
        <span *ngIf="ariaAnnouncement">{{ ariaAnnouncement }}</span>
      </div>
    </div>
  `,
  styles: [`
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      z-index: 1000;
      overflow: hidden;
    }

    .lightbox-overlay.visible {
      opacity: 1;
      visibility: visible;
    }

    .close-button {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: white;
      font-size: 24px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 1001;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.1);
    }

    .close-button:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(66, 153, 225, 0.8);
    }

    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 60px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-size: 32px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      opacity: 0;
      visibility: hidden;
      z-index: 1001;
    }

    .nav-button.visible {
      opacity: 1;
      visibility: visible;
    }

    .nav-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-button:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(66, 153, 225, 0.8);
    }

    .nav-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-button-prev {
      left: 20px;
    }

    .nav-button-next {
      right: 20px;
    }

    .image-container {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .loading-state.visible {
      opacity: 1;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 16px;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      gap: 16px;
    }

    .error-state.visible {
      opacity: 1;
    }

    .error-icon {
      font-size: 48px;
      color: #feb2b2;
    }

    .error-message {
      font-size: 16px;
      margin-bottom: 8px;
    }

    .retry-button {
      padding: 8px 16px;
      background-color: #4299e1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }

    .retry-button:hover {
      background-color: #3182ce;
    }

    .lightbox-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      opacity: 0;
      transition: opacity 0.4s ease, transform 0.2s ease;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    .lightbox-image.visible {
      opacity: 1;
    }

    .lightbox-image.dragging {
      transition: none;
    }

    .image-info {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      min-width: 200px;
    }

    .image-info.visible {
      opacity: 1;
    }

    .image-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .image-counter {
      font-size: 12px;
      opacity: 0.8;
    }

    .navigation-hints {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px 16px;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .navigation-hints.visible {
      opacity: 1;
    }

    .hint-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .hint-key {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
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

    /* Mobile optimizations */
    @media (max-width: 767px) {
      .close-button {
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .nav-button {
        width: 40px;
        height: 50px;
        font-size: 24px;
      }

      .nav-button-prev {
        left: 10px;
      }

      .nav-button-next {
        right: 10px;
      }

      .image-container {
        max-width: 95%;
        max-height: 85%;
      }

      .image-info {
        bottom: 10px;
        padding: 8px 12px;
        font-size: 14px;
        min-width: auto;
        max-width: 90%;
      }

      .navigation-hints {
        top: 10px;
        font-size: 11px;
        padding: 6px 12px;
      }
    }

    /* Touch interaction improvements */
    @media (hover: none) and (pointer: coarse) {
      .nav-button.visible {
        opacity: 0.7;
      }

      .nav-button:hover {
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.2);
      }

      .lightbox-image {
        touch-action: pan-x;
      }
    }
  `]
})
export class LightboxModalComponent implements OnInit, OnDestroy {
  @Input() images: ImageItem[] = [];
  @Input() selectedIndex = -1;
  @Input() isVisible = false;
  @Input() showNavButtons = true;
  @Input() showImageInfo = true;
  @Input() showNavigationHints = false;

  @Output() close = new EventEmitter<GalleryEvent>();
  @Output() navigate = new EventEmitter<GalleryEvent>();
  @Output() imageLoad = new EventEmitter<GalleryEvent>();
  @Output() imageError = new EventEmitter<GalleryEvent>();

  @ViewChild('lightboxContainer', { static: true }) lightboxContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('lightboxImage', { static: false }) lightboxImageRef?: ElementRef<HTMLImageElement>;

  currentImage: ImageItem | null = null;
  imageLoadingState = LoadingState.PENDING;
  ariaAnnouncement = '';
  isTouchDevice = false;

  touchState: TouchState = {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    swipeThreshold: 50
  };

  private destroy$ = new Subject<void>();
  private keyboardUnsubscribe?: () => void;
  private focusTrapUnsubscribe?: () => void;
  private navigationHintTimeout?: any;
  private imageLoadStartTime = 0;

  // Expose LoadingState enum for template
  readonly LoadingState = LoadingState;

  constructor(
    private cdr: ChangeDetectorRef,
    private galleryService: GalleryService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.isTouchDevice = this.detectTouchDevice();
    this.initializeKeyboardNavigation();
    this.watchStateChanges();
    this.scheduleNavigationHints();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  private detectTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private watchStateChanges(): void {
    this.galleryService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state.selectedIndex !== this.selectedIndex) {
          this.selectedIndex = state.selectedIndex;
          this.updateCurrentImage();
        }

        if (state.isModalOpen !== this.isVisible) {
          this.isVisible = state.isModalOpen;
          this.handleVisibilityChange();
        }

        this.cdr.markForCheck();
      });
  }

  private updateCurrentImage(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.images.length) {
      this.currentImage = this.images[this.selectedIndex];
      this.imageLoadingState = LoadingState.LOADING;
      this.imageLoadStartTime = performance.now();
      this.announceImageChange();
    } else {
      this.currentImage = null;
      this.imageLoadingState = LoadingState.PENDING;
    }
    this.cdr.markForCheck();
  }

  private handleVisibilityChange(): void {
    if (this.isVisible) {
      this.setupFocusTrap();
      this.updateCurrentImage();
      document.body.style.overflow = 'hidden';
    } else {
      this.teardownFocusTrap();
      document.body.style.overflow = '';
      this.clearNavigationHints();
    }
  }

  private initializeKeyboardNavigation(): void {
    this.keyboardUnsubscribe = this.galleryService.addKeyboardListener((event: KeyboardEvent) => {
      if (!this.isVisible) return;

      const startTime = performance.now();

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          this.closeModal('keyboard');
          break;

        case 'ArrowLeft':
          event.preventDefault();
          this.navigatePrev();
          break;

        case 'ArrowRight':
          event.preventDefault();
          this.navigateNext();
          break;

        case ' ':
          if (event.target === document.body) {
            event.preventDefault();
            this.navigateNext();
          }
          break;
      }

      const responseTime = performance.now() - startTime;
      this.galleryService.trackNavigationResponseTime(event.key, responseTime);
    });
  }

  private setupFocusTrap(): void {
    this.focusTrapUnsubscribe = this.galleryService.trapFocus(
      this.lightboxContainer.nativeElement
    );
  }

  private teardownFocusTrap(): void {
    if (this.focusTrapUnsubscribe) {
      this.focusTrapUnsubscribe();
      this.focusTrapUnsubscribe = undefined;
    }
    this.galleryService.popFocus();
  }

  private scheduleNavigationHints(): void {
    if (this.navigationHintTimeout) {
      clearTimeout(this.navigationHintTimeout);
    }

    this.navigationHintTimeout = setTimeout(() => {
      this.showNavigationHints = true;
      this.cdr.markForCheck();

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.clearNavigationHints();
      }, 5000);
    }, 2000);
  }

  private clearNavigationHints(): void {
    this.showNavigationHints = false;
    if (this.navigationHintTimeout) {
      clearTimeout(this.navigationHintTimeout);
      this.navigationHintTimeout = undefined;
    }
    this.cdr.markForCheck();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // Trigger change detection on resize to update layout
    this.cdr.markForCheck();
  }

  // Event handlers
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal('overlay');
    }
  }

  onCloseClick(): void {
    this.closeModal('button');
  }

  onImageClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onImageLoad(): void {
    this.imageLoadingState = LoadingState.LOADED;

    const loadTime = performance.now() - this.imageLoadStartTime;

    if (this.currentImage) {
      this.galleryService.trackImageLoadTime(this.currentImage.id, loadTime);

      const loadEvent: GalleryEvent = {
        imageIndex: this.selectedIndex,
        imageUrl: this.currentImage.fullSizeUrl,
        loadTime
      };

      this.imageLoad.emit(loadEvent);
    }

    this.cdr.markForCheck();
  }

  onImageError(): void {
    this.imageLoadingState = LoadingState.ERROR;

    if (this.currentImage) {
      const errorEvent: GalleryEvent = {
        imageIndex: this.selectedIndex,
        imageUrl: this.currentImage.fullSizeUrl,
        errorType: 'load_failure'
      };

      this.imageError.emit(errorEvent);
    }

    this.announceError();
    this.cdr.markForCheck();
  }

  retryImageLoad(): void {
    if (this.currentImage && this.lightboxImageRef) {
      this.imageLoadingState = LoadingState.LOADING;
      this.imageLoadStartTime = performance.now();

      const img = this.lightboxImageRef.nativeElement;
      const currentSrc = img.src;
      img.src = '';

      setTimeout(() => {
        img.src = currentSrc;
      }, 100);

      this.cdr.markForCheck();
    }
  }

  // Navigation methods
  canNavigatePrev(): boolean {
    return this.selectedIndex > 0;
  }

  canNavigateNext(): boolean {
    return this.selectedIndex < this.images.length - 1;
  }

  navigatePrev(): void {
    if (this.canNavigatePrev()) {
      this.navigateToIndex(this.selectedIndex - 1, 'prev');
    }
  }

  navigateNext(): void {
    if (this.canNavigateNext()) {
      this.navigateToIndex(this.selectedIndex + 1, 'next');
    }
  }

  private navigateToIndex(index: number, direction: 'prev' | 'next'): void {
    const navigationEvent: GalleryEvent = {
      imageIndex: index,
      direction,
      method: 'navigation'
    };

    this.navigate.emit(navigationEvent);
    this.galleryService.navigateToImage(index);
  }

  private closeModal(method: string): void {
    const closeEvent: GalleryEvent = {
      method,
      imageIndex: this.selectedIndex
    };

    this.close.emit(closeEvent);
    this.galleryService.closeModal();
  }

  // Touch gesture handling
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.touchState.startX = touch.clientX;
      this.touchState.startY = touch.clientY;
      this.touchState.currentX = touch.clientX;
      this.touchState.currentY = touch.clientY;
      this.touchState.isDragging = false;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.touchState.currentX = touch.clientX;
      this.touchState.currentY = touch.clientY;

      const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
      const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);

      if (deltaX > 10 || deltaY > 10) {
        this.touchState.isDragging = true;
        this.cdr.markForCheck();
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchState.isDragging) {
      const deltaX = this.touchState.currentX - this.touchState.startX;
      const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);

      // Only process horizontal swipes
      if (Math.abs(deltaX) > this.touchState.swipeThreshold && deltaY < 100) {
        event.preventDefault();

        if (deltaX > 0) {
          // Swipe right - go to previous image
          this.navigatePrev();
        } else {
          // Swipe left - go to next image
          this.navigateNext();
        }
      }
    }

    this.touchState.isDragging = false;
    this.cdr.markForCheck();
  }

  // Accessibility announcements
  private announceImageChange(): void {
    if (this.currentImage) {
      this.ariaAnnouncement = `Viewing ${this.currentImage.alt || 'image'} ${this.selectedIndex + 1} of ${this.images.length}`;

      setTimeout(() => {
        this.ariaAnnouncement = '';
        this.cdr.markForCheck();
      }, 1000);

      this.cdr.markForCheck();
    }
  }

  private announceError(): void {
    this.ariaAnnouncement = 'Failed to load image. Use retry button to try again.';

    setTimeout(() => {
      this.ariaAnnouncement = '';
      this.cdr.markForCheck();
    }, 3000);

    this.cdr.markForCheck();
  }

  private cleanup(): void {
    if (this.keyboardUnsubscribe) {
      this.keyboardUnsubscribe();
    }

    if (this.focusTrapUnsubscribe) {
      this.focusTrapUnsubscribe();
    }

    this.clearNavigationHints();
    document.body.style.overflow = '';
  }
}