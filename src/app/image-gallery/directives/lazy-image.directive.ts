import {
  Directive,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appLazyImage]',
  standalone: true
})
export class LazyImageDirective implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() fallbackSrc: string = 'assets/images/placeholder.jpg';
  @Input() threshold: number = 100;
  @Output() imageLoaded = new EventEmitter<boolean>();
  @Output() imageError = new EventEmitter<string>();

  private observer?: IntersectionObserver;
  private hasLoaded = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.initializeObserver();
    this.setupSkeletonState();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initializeObserver(): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without Intersection Observer
      this.loadImage();
      return;
    }

    const options = {
      root: null,
      rootMargin: `${this.threshold}px`,
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasLoaded) {
          this.loadImage();
          this.observer?.unobserve(this.el.nativeElement);
        }
      });
    }, options);

    this.observer.observe(this.el.nativeElement);
  }

  private setupSkeletonState(): void {
    const img = this.el.nativeElement;
    this.renderer.addClass(img, 'loading-skeleton');
    this.renderer.setStyle(img, 'background-color', '#e2e8f0');
    this.renderer.setStyle(img, 'background-image', 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)');
    this.renderer.setStyle(img, 'background-size', '200% 100%');
    this.renderer.setStyle(img, 'animation', 'shimmer 1.5s infinite');
    this.renderer.setAttribute(img, 'alt', 'Loading...');
  }

  private loadImage(): void {
    if (this.hasLoaded) return;

    const img = new Image();

    img.onload = () => {
      this.hasLoaded = true;
      this.applyLoadedImage(img.src);
      this.imageLoaded.emit(true);
    };

    img.onerror = () => {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        // Retry after delay
        setTimeout(() => {
          this.loadImage();
        }, Math.pow(2, this.retryCount) * 1000);
      } else {
        // Load fallback image
        this.applyLoadedImage(this.fallbackSrc);
        this.imageError.emit(this.src);
        this.imageLoaded.emit(false);
      }
    };

    img.src = this.src;
  }

  private applyLoadedImage(src: string): void {
    const img = this.el.nativeElement;

    // Remove skeleton styles
    this.renderer.removeClass(img, 'loading-skeleton');
    this.renderer.removeStyle(img, 'background-color');
    this.renderer.removeStyle(img, 'background-image');
    this.renderer.removeStyle(img, 'background-size');
    this.renderer.removeStyle(img, 'animation');

    // Apply fade-in animation
    this.renderer.setStyle(img, 'opacity', '0');
    this.renderer.setAttribute(img, 'src', src);

    // Trigger fade-in
    setTimeout(() => {
      this.renderer.setStyle(img, 'transition', 'opacity 0.3s ease-in-out');
      this.renderer.setStyle(img, 'opacity', '1');
    }, 50);
  }

  public retry(): void {
    this.retryCount = 0;
    this.hasLoaded = false;
    this.setupSkeletonState();
    this.loadImage();
  }
}