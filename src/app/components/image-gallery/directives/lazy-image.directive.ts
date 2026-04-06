import {
  Directive,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Renderer2,
  NgZone
} from '@angular/core';
import { LoadingState } from '../types/image-gallery.types';

@Directive({
  selector: '[appLazyImage]',
  standalone: true
})
export class LazyImageDirective implements OnInit, OnDestroy {
  @Input() src: string = '';
  @Input() threshold: number = 100;
  @Input() fallbackEnabled: boolean = true;

  @Output() loadStateChange = new EventEmitter<LoadingState>();
  @Output() loadStart = new EventEmitter<void>();
  @Output() loadSuccess = new EventEmitter<void>();
  @Output() loadError = new EventEmitter<Error>();

  private observer: IntersectionObserver | null = null;
  private scrollListener: (() => void) | null = null;
  private isIntersecting = false;
  private loadStartTime: number = 0;

  constructor(
    private elementRef: ElementRef<HTMLImageElement>,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeLazyLoading();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeLazyLoading(): void {
    this.loadStateChange.emit(LoadingState.PENDING);

    if (this.supportsIntersectionObserver()) {
      this.setupIntersectionObserver();
    } else if (this.fallbackEnabled) {
      this.setupScrollFallback();
    } else {
      // Load immediately if no lazy loading support
      this.loadImage();
    }
  }

  private supportsIntersectionObserver(): boolean {
    return 'IntersectionObserver' in window;
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isIntersecting) {
            this.isIntersecting = true;
            this.loadImage();
            this.observer?.unobserve(this.elementRef.nativeElement);
          }
        });
      },
      {
        rootMargin: `${this.threshold}px`
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  private setupScrollFallback(): void {
    this.ngZone.runOutsideAngular(() => {
      this.scrollListener = this.throttle(() => {
        if (this.isElementInViewport() && !this.isIntersecting) {
          this.ngZone.run(() => {
            this.isIntersecting = true;
            this.loadImage();
          });
          window.removeEventListener('scroll', this.scrollListener!);
          this.scrollListener = null;
        }
      }, 100);

      window.addEventListener('scroll', this.scrollListener);
      window.addEventListener('resize', this.scrollListener);

      // Check immediately in case element is already in view
      if (this.isElementInViewport()) {
        this.ngZone.run(() => {
          this.isIntersecting = true;
          this.loadImage();
        });
      }
    });
  }

  private isElementInViewport(): boolean {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= -this.threshold &&
      rect.left >= -this.threshold &&
      rect.bottom <= windowHeight + this.threshold &&
      rect.right <= windowWidth + this.threshold
    );
  }

  private loadImage(): void {
    if (!this.src) {
      this.loadStateChange.emit(LoadingState.ERROR);
      this.loadError.emit(new Error('No source provided'));
      return;
    }

    this.loadStartTime = performance.now();
    this.loadStateChange.emit(LoadingState.LOADING);
    this.loadStart.emit();

    const img = this.elementRef.nativeElement;

    const onLoad = () => {
      this.loadStateChange.emit(LoadingState.LOADED);
      this.loadSuccess.emit();
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };

    const onError = (event: Event) => {
      this.loadStateChange.emit(LoadingState.ERROR);
      this.loadError.emit(new Error(`Failed to load image: ${this.src}`));
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);

    // Set the source to trigger loading
    this.renderer.setAttribute(img, 'src', this.src);
  }

  private throttle(func: Function, limit: number): () => void {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      window.removeEventListener('resize', this.scrollListener);
      this.scrollListener = null;
    }
  }
}