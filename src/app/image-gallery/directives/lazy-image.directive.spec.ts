import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement, ElementRef, Renderer2 } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, Mock } from 'vitest';
import { LazyImageDirective } from './lazy-image.directive';

@Component({
  template: `
    <img
      appLazyImage
      [src]="imageSrc"
      [fallbackSrc]="fallbackSrc"
      [threshold]="threshold"
      (imageLoaded)="onImageLoaded($event)"
      (imageError)="onImageError($event)"
      alt="Test image"
    />
  `,
  standalone: true,
  imports: [LazyImageDirective]
})
class TestHostComponent {
  imageSrc = 'https://example.com/test.jpg';
  fallbackSrc = 'assets/images/placeholder.jpg';
  threshold = 100;
  imageLoadedCalled = false;
  imageErrorCalled = false;
  loadedSuccessfully = false;
  errorUrl = '';

  onImageLoaded(success: boolean): void {
    this.imageLoadedCalled = true;
    this.loadedSuccessfully = success;
  }

  onImageError(url: string): void {
    this.imageErrorCalled = true;
    this.errorUrl = url;
  }
}

describe('LazyImageDirective', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let directive: LazyImageDirective;
  let imgElement: HTMLImageElement;

  // Mock IntersectionObserver
  let mockObserver: {
    observe: Mock;
    unobserve: Mock;
    disconnect: Mock;
  };
  let observerCallback: IntersectionObserverCallback;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(async () => {
    // Store original IntersectionObserver
    originalIntersectionObserver = globalThis.IntersectionObserver;

    // Mock IntersectionObserver
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    };

    const mockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
      observerCallback = callback;
      return mockObserver;
    });

    globalThis.IntersectionObserver = mockIntersectionObserver as any;

    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;

    const debugElement = fixture.debugElement.query(By.directive(LazyImageDirective));
    directive = debugElement.injector.get(LazyImageDirective);
    imgElement = debugElement.nativeElement;

    fixture.detectChanges();
  });

  afterEach(() => {
    // Restore original IntersectionObserver
    globalThis.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  it('should set up skeleton loading state on init', () => {
    expect(imgElement.classList.contains('loading-skeleton')).toBe(true);
    expect(imgElement.style.backgroundColor).toBe('rgb(226, 232, 240)');
    expect(imgElement.getAttribute('alt')).toBe('Loading...');
  });

  it('should create IntersectionObserver on init', () => {
    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );
    expect(mockObserver.observe).toHaveBeenCalledWith(imgElement);
  });

  it('should load image when element intersects viewport', () => {
    // Mock successful image load
    const mockImage = {
      onload: null,
      onerror: null,
      src: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Verify unobserve is called
    expect(mockObserver.unobserve).toHaveBeenCalledWith(imgElement);
  });

  it('should emit imageLoaded event on successful load', async () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);

    // Simulate intersection to trigger image load
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Simulate successful image load
    if (mockImage.onload) {
      (mockImage.onload as any)();
    }

    fixture.detectChanges();

    expect(component.imageLoadedCalled).toBe(true);
    expect(component.loadedSuccessfully).toBe(true);
    expect(imgElement.classList.contains('loading-skeleton')).toBe(false);
  });

  it('should retry image load on error up to maxRetries', () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    const imageSpy = vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: Function, delay: number) => {
      callback();
      return 0 as any;
    });

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Simulate image error - should retry 3 times
    for (let i = 0; i < 3; i++) {
      if (mockImage.onerror) {
        (mockImage.onerror as any)();
      }
    }

    // Verify Image constructor was called multiple times (retries)
    expect(imageSpy).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it('should emit imageError after max retries exceeded', async () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: Function) => {
      callback();
      return 0 as any;
    });

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Simulate image errors exceeding max retries
    for (let i = 0; i <= 3; i++) {
      if (mockImage.onerror) {
        (mockImage.onerror as any)();
      }
    }

    fixture.detectChanges();

    expect(component.imageErrorCalled).toBe(true);
    expect(component.errorUrl).toBe('https://example.com/test.jpg');
    expect(component.imageLoadedCalled).toBe(true);
    expect(component.loadedSuccessfully).toBe(false);
  });

  it('should use fallback image when max retries exceeded', async () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: Function) => {
      callback();
      return 0 as any;
    });

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Exceed max retries
    for (let i = 0; i <= 3; i++) {
      if (mockImage.onerror) {
        (mockImage.onerror as any)();
      }
    }

    await new Promise(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();

    expect(imgElement.src).toContain('placeholder.jpg');
  });

  it('should fallback to immediate loading when IntersectionObserver not supported', () => {
    // Mock browser without IntersectionObserver
    delete (globalThis as any).IntersectionObserver;

    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    const imageSpy = vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);

    // Create new directive instance
    const newFixture = TestBed.createComponent(TestHostComponent);
    newFixture.detectChanges();

    // Should load immediately without observer
    expect(imageSpy).toHaveBeenCalled();

    // Restore for cleanup
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('should disconnect observer on destroy', () => {
    directive.ngOnDestroy();
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it('should allow manual retry', () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    const imageSpy = vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);

    directive.retry();

    expect(imageSpy).toHaveBeenCalled();
    expect(imgElement.classList.contains('loading-skeleton')).toBe(true);
  });

  it('should not load image twice if already loaded', () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    const imageSpy = vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);

    // Simulate intersection twice
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);
    observerCallback([mockEntry], mockObserver as any);

    // Should only create one Image instance
    expect(imageSpy).toHaveBeenCalledTimes(1);
  });

  it('should apply fade-in animation on successful load', async () => {
    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: Function, delay: number) => {
      if (delay === 50) {
        setTimeout(callback, 0); // Execute after current cycle
      }
      return 0 as any;
    });

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Simulate successful load
    if (mockImage.onload) {
      (mockImage.onload as any)();
    }

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(imgElement.style.transition).toContain('opacity');
    expect(imgElement.style.opacity).toBe('1');
  });

  it('should handle custom threshold value', async () => {
    component.threshold = 200;
    fixture.detectChanges();

    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    );
  });

  it('should handle custom fallback source', async () => {
    component.fallbackSrc = 'assets/images/custom-placeholder.jpg';
    fixture.detectChanges();

    const mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(() => mockImage as any);
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: Function) => {
      callback();
      return 0 as any;
    });

    // Simulate intersection
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: imgElement,
      intersectionRatio: 0.5,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    };

    observerCallback([mockEntry], mockObserver as any);

    // Exceed max retries
    for (let i = 0; i <= 3; i++) {
      if (mockImage.onerror) {
        (mockImage.onerror as any)();
      }
    }

    await new Promise(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();

    expect(imgElement.src).toContain('custom-placeholder.jpg');
  });
});