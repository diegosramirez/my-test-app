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
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ImageItem, LoadingState, ErrorState, GalleryEvent, DEFAULT_GALLERY_CONFIG } from '../types/image-gallery.types';
import { LazyImageDirective } from '../directives/lazy-image.directive';
import { GalleryService } from '../services/gallery.service';

@Component({
  selector: 'app-gallery-thumbnail',
  standalone: true,
  imports: [CommonModule, LazyImageDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="thumbnail-container"
      [attr.aria-label]="image.alt"
      [attr.role]="'button'"
      [attr.tabindex]="0"
      (click)="onThumbnailClick()"
      (keydown.enter)="onThumbnailClick()"
      (keydown.space)="onThumbnailClick()"
    >
      <!-- Loading skeleton -->
      <div
        class="loading-skeleton"
        [class.visible]="loadingState === LoadingState.PENDING || loadingState === LoadingState.LOADING"
        [attr.aria-label]="'Loading ' + image.alt"
      >
        <div class="skeleton-shimmer"></div>
      </div>

      <!-- Error state -->
      <div
        class="error-state"
        [class.visible]="loadingState === LoadingState.ERROR"
        [attr.aria-label]="'Failed to load ' + image.alt"
      >
        <div class="error-icon" aria-hidden="true">⚠</div>
        <button
          class="retry-button"
          (click)="onRetryClick($event)"
          [disabled]="isRetrying"
          [attr.aria-label]="'Retry loading ' + image.alt"
        >
          {{ isRetrying ? 'Retrying...' : 'Retry' }}
        </button>
        <div class="retry-info" *ngIf="errorState">
          Attempt {{ errorState.retryCount + 1 }} of {{ maxRetries }}
        </div>
      </div>

      <!-- Image -->
      <img
        #thumbnailImage
        class="thumbnail-image"
        [class.loaded]="loadingState === LoadingState.LOADED"
        appLazyImage
        [src]="image.thumbnailUrl"
        [threshold]="lazyLoadingThreshold"
        [alt]="image.alt"
        [title]="image.title || image.alt"
        (loadStateChange)="onLoadStateChange($event)"
        (loadStart)="onLoadStart()"
        (loadSuccess)="onLoadSuccess()"
        (loadError)="onLoadError($event)"
      />

      <!-- Loading indicator -->
      <div
        class="loading-indicator"
        [class.visible]="loadingState === LoadingState.LOADING"
        [attr.aria-label]="'Loading ' + image.alt"
      >
        <div class="loading-spinner" aria-hidden="true"></div>
      </div>

      <!-- Image info overlay -->
      <div
        class="image-info"
        [class.visible]="loadingState === LoadingState.LOADED && showInfoOnHover"
        [attr.aria-hidden]="true"
      >
        <div class="image-title" *ngIf="image.title">{{ image.title }}</div>
      </div>
    </div>
  `,
  styles: [`
    .thumbnail-container {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background-color: #f5f5f5;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }

    .thumbnail-container:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .thumbnail-container:focus {
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
    }

    .loading-skeleton {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .loading-skeleton.visible {
      opacity: 1;
    }

    .skeleton-shimmer {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .error-state {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: rgba(248, 248, 248, 0.95);
      opacity: 0;
      transition: opacity 0.3s ease;
      gap: 8px;
    }

    .error-state.visible {
      opacity: 1;
    }

    .error-icon {
      font-size: 24px;
      color: #e53e3e;
    }

    .retry-button {
      padding: 6px 12px;
      background-color: #4299e1;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s ease;
    }

    .retry-button:hover:not(:disabled) {
      background-color: #3182ce;
    }

    .retry-button:disabled {
      background-color: #a0a0a0;
      cursor: not-allowed;
    }

    .retry-info {
      font-size: 10px;
      color: #666;
      text-align: center;
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .thumbnail-image.loaded {
      opacity: 1;
    }

    .loading-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .loading-indicator.visible {
      opacity: 1;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e2e8f0;
      border-top: 2px solid #4299e1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .image-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      color: white;
      padding: 16px 8px 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .thumbnail-container:hover .image-info.visible {
      opacity: 1;
    }

    .image-title {
      font-size: 12px;
      font-weight: 500;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    /* Mobile-specific styles */
    @media (max-width: 767px) {
      .thumbnail-container {
        aspect-ratio: 1;
      }

      .image-info.visible {
        opacity: 1;
      }

      .thumbnail-container:hover {
        transform: none;
        box-shadow: none;
      }

      .thumbnail-container:active {
        transform: scale(0.98);
      }
    }
  `]
})
export class GalleryThumbnailComponent implements OnInit, OnDestroy {
  @Input() image!: ImageItem;
  @Input() index!: number;
  @Input() lazyLoadingThreshold = DEFAULT_GALLERY_CONFIG.lazyLoadingThreshold;
  @Input() showInfoOnHover = true;
  @Input() maxRetries = DEFAULT_GALLERY_CONFIG.maxRetryCount;

  @Output() thumbnailClick = new EventEmitter<GalleryEvent>();
  @Output() loadStart = new EventEmitter<GalleryEvent>();
  @Output() loadSuccess = new EventEmitter<GalleryEvent>();
  @Output() loadError = new EventEmitter<GalleryEvent>();
  @Output() retryAttempt = new EventEmitter<GalleryEvent>();

  @ViewChild('thumbnailImage', { static: false }) thumbnailImageRef?: ElementRef<HTMLImageElement>;

  loadingState = LoadingState.PENDING;
  errorState: ErrorState | null = null;
  isRetrying = false;

  private destroy$ = new Subject<void>();
  private loadStartTime = 0;

  // Expose LoadingState enum for template
  readonly LoadingState = LoadingState;

  constructor(
    private cdr: ChangeDetectorRef,
    private galleryService: GalleryService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.initializeGalleryService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.galleryService.untrackImageMemoryUsage(this.image.id);
  }

  private initializeGalleryService(): void {
    this.galleryService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        const imageLoadingState = state.loadingStates.get(this.image.id);
        if (imageLoadingState && imageLoadingState !== this.loadingState) {
          this.loadingState = imageLoadingState;
          this.cdr.markForCheck();
        }

        const imageErrorState = state.errorStates.get(this.image.id);
        if (imageErrorState !== this.errorState) {
          this.errorState = imageErrorState || null;
          this.cdr.markForCheck();
        }
      });
  }

  onThumbnailClick(event?: KeyboardEvent): void {
    if (event?.type === 'keydown' && event.key === ' ') {
      event.preventDefault();
    }

    const clickEvent: GalleryEvent = {
      imageIndex: this.index,
      imageUrl: this.image.thumbnailUrl,
      method: event?.type === 'keydown' ? 'keyboard' : 'mouse'
    };

    this.thumbnailClick.emit(clickEvent);
  }

  onLoadStateChange(state: LoadingState): void {
    this.loadingState = state;
    this.galleryService.setImageLoadingState(this.image.id, state);
    this.cdr.markForCheck();
  }

  onLoadStart(): void {
    this.loadStartTime = performance.now();

    const loadStartEvent: GalleryEvent = {
      imageIndex: this.index,
      imageUrl: this.image.thumbnailUrl
    };

    this.loadStart.emit(loadStartEvent);
  }

  onLoadSuccess(): void {
    const loadTime = performance.now() - this.loadStartTime;
    this.galleryService.trackImageLoadTime(this.image.id, loadTime);

    // Track memory usage (estimate based on image dimensions)
    if (this.thumbnailImageRef?.nativeElement) {
      const img = this.thumbnailImageRef.nativeElement;
      const estimatedSize = img.naturalWidth * img.naturalHeight * 4; // 4 bytes per pixel (RGBA)
      this.galleryService.trackImageMemoryUsage(this.image.id, estimatedSize);
    }

    const loadSuccessEvent: GalleryEvent = {
      imageIndex: this.index,
      imageUrl: this.image.thumbnailUrl,
      loadTime
    };

    this.loadSuccess.emit(loadSuccessEvent);

    // Clear any previous error state
    if (this.errorState) {
      this.errorState = null;
      // Note: Error state will be cleared from service via state synchronization
      // in the initializeGalleryService subscription
    }
  }

  onLoadError(error: Error): void {
    const currentErrorState = this.errorState || {
      retryCount: 0,
      lastRetryTime: 0,
      nextRetryDelay: DEFAULT_GALLERY_CONFIG.retryDelays[0]
    };

    this.errorState = currentErrorState;
    this.galleryService.setImageErrorState(this.image.id, currentErrorState);

    const loadErrorEvent: GalleryEvent = {
      imageIndex: this.index,
      imageUrl: this.image.thumbnailUrl,
      errorType: error.message,
      retryCount: currentErrorState.retryCount
    };

    this.loadError.emit(loadErrorEvent);
  }

  onRetryClick(event: Event): void {
    event.stopPropagation(); // Prevent thumbnail click

    if (!this.errorState || this.isRetrying) return;

    const now = Date.now();
    const timeSinceLastRetry = now - this.errorState.lastRetryTime;

    if (timeSinceLastRetry < this.errorState.nextRetryDelay) {
      return; // Too soon to retry
    }

    if (this.errorState.retryCount >= this.maxRetries) {
      return; // Max retries reached
    }

    this.isRetrying = true;
    this.errorState.retryCount++;
    this.errorState.lastRetryTime = now;
    this.errorState.nextRetryDelay = this.galleryService.calculateRetryDelay(
      this.errorState.retryCount,
      DEFAULT_GALLERY_CONFIG.retryDelays
    );

    this.galleryService.setImageErrorState(this.image.id, this.errorState);

    const retryEvent: GalleryEvent = {
      imageIndex: this.index,
      imageUrl: this.image.thumbnailUrl,
      retryCount: this.errorState.retryCount
    };

    this.retryAttempt.emit(retryEvent);

    // Reset loading state to trigger reload
    this.loadingState = LoadingState.PENDING;
    this.galleryService.setImageLoadingState(this.image.id, LoadingState.PENDING);

    // Retry after a short delay
    setTimeout(() => {
      this.isRetrying = false;
      this.cdr.markForCheck();

      // Trigger reload safely by updating the loading state
      // The lazy loading directive will handle the actual reload
      this.loadingState = LoadingState.LOADING;
      this.galleryService.setImageLoadingState(this.image.id, LoadingState.LOADING);

      // Force change detection to ensure the template updates
      this.cdr.detectChanges();
    }, 500);

    this.cdr.markForCheck();
  }
}