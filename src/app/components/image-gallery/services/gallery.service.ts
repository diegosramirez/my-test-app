import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GalleryState, LoadingState, ErrorState, ImageItem } from '../types/image-gallery.types';

@Injectable({
  providedIn: 'root'
})
export class GalleryService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private keyboardListeners = new Set<(event: KeyboardEvent) => void>();
  private focusStack: HTMLElement[] = [];
  private memoryUsage = new Map<string, number>();
  private boundKeydownHandler: (event: KeyboardEvent) => void;

  // State management
  private stateSubject = new BehaviorSubject<GalleryState>({
    selectedIndex: -1,
    isModalOpen: false,
    loadingStates: new Map<string, LoadingState>(),
    errorStates: new Map<string, ErrorState>()
  });

  public readonly state$: Observable<GalleryState> = this.stateSubject
    .asObservable()
    .pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

  // Performance tracking
  private performanceMetrics = {
    componentLoadTime: 0,
    imageLoadTimes: new Map<string, number>(),
    navigationResponseTimes: new Map<string, number>()
  };

  constructor(private ngZone: NgZone) {
    this.boundKeydownHandler = this.handleGlobalKeydown.bind(this);
    this.initializeKeyboardListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  // State management methods
  getCurrentState(): GalleryState {
    return this.stateSubject.value;
  }

  openModal(index: number): void {
    const currentState = this.getCurrentState();
    this.stateSubject.next({
      ...currentState,
      selectedIndex: index,
      isModalOpen: true
    });
  }

  closeModal(): void {
    const currentState = this.getCurrentState();
    this.stateSubject.next({
      ...currentState,
      isModalOpen: false
    });
  }

  navigateToImage(index: number): void {
    const currentState = this.getCurrentState();
    if (currentState.isModalOpen) {
      this.stateSubject.next({
        ...currentState,
        selectedIndex: index
      });
    }
  }

  setImageLoadingState(imageId: string, state: LoadingState): void {
    const currentState = this.getCurrentState();
    const newLoadingStates = new Map(currentState.loadingStates);
    newLoadingStates.set(imageId, state);

    this.stateSubject.next({
      ...currentState,
      loadingStates: newLoadingStates
    });
  }

  setImageErrorState(imageId: string, errorState: ErrorState): void {
    const currentState = this.getCurrentState();
    const newErrorStates = new Map(currentState.errorStates);
    newErrorStates.set(imageId, errorState);

    this.stateSubject.next({
      ...currentState,
      errorStates: newErrorStates
    });
  }

  // Keyboard management
  private initializeKeyboardListener(): void {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.boundKeydownHandler);
    });
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    this.keyboardListeners.forEach(listener => {
      this.ngZone.run(() => listener(event));
    });
  }

  addKeyboardListener(listener: (event: KeyboardEvent) => void): () => void {
    this.keyboardListeners.add(listener);

    return () => {
      this.keyboardListeners.delete(listener);
    };
  }

  // Focus management
  pushFocus(element: HTMLElement): void {
    if (document.activeElement && document.activeElement !== document.body) {
      this.focusStack.push(document.activeElement as HTMLElement);
    }
    element.focus();
  }

  popFocus(): void {
    const previousElement = this.focusStack.pop();
    if (previousElement) {
      previousElement.focus();
    }
  }

  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(
      container.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
  }

  // Memory management
  trackImageMemoryUsage(imageId: string, sizeBytes: number): void {
    this.memoryUsage.set(imageId, sizeBytes);
    this.checkMemoryThreshold();
  }

  untrackImageMemoryUsage(imageId: string): void {
    this.memoryUsage.delete(imageId);
  }

  getTotalMemoryUsage(): number {
    return Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
  }

  private checkMemoryThreshold(): void {
    const totalMemory = this.getTotalMemoryUsage();
    const thresholdMB = 50;
    const thresholdBytes = thresholdMB * 1024 * 1024;

    if (totalMemory > thresholdBytes) {
      console.warn(`Image gallery memory usage (${Math.round(totalMemory / 1024 / 1024)}MB) exceeds threshold (${thresholdMB}MB)`);
      this.cleanupOldestImages();
    }
  }

  private cleanupOldestImages(): void {
    // Implement cleanup logic for oldest images
    // This would typically involve removing images that are far from the current view
    const sortedEntries = Array.from(this.memoryUsage.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by size, largest first

    // Remove largest images until we're under threshold
    const thresholdBytes = 50 * 1024 * 1024; // 50MB
    let currentTotal = this.getTotalMemoryUsage();

    for (const [imageId, size] of sortedEntries) {
      if (currentTotal <= thresholdBytes) break;

      this.untrackImageMemoryUsage(imageId);
      currentTotal -= size;

      // Emit event to notify components to cleanup this image
      // This could be extended to use a more sophisticated cleanup strategy
    }
  }

  // Performance tracking
  trackComponentLoadTime(timeMs: number): void {
    this.performanceMetrics.componentLoadTime = timeMs;
  }

  trackImageLoadTime(imageId: string, timeMs: number): void {
    this.performanceMetrics.imageLoadTimes.set(imageId, timeMs);
  }

  trackNavigationResponseTime(action: string, timeMs: number): void {
    this.performanceMetrics.navigationResponseTimes.set(action, timeMs);
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      totalMemoryUsageMB: Math.round(this.getTotalMemoryUsage() / 1024 / 1024),
      imageCount: this.memoryUsage.size
    };
  }

  // Utility methods
  calculateRetryDelay(retryCount: number, baseDelays: number[]): number {
    const index = Math.min(retryCount, baseDelays.length - 1);
    return baseDelays[index] || baseDelays[baseDelays.length - 1];
  }

  private cleanup(): void {
    this.keyboardListeners.clear();
    this.focusStack.length = 0;
    this.memoryUsage.clear();

    document.removeEventListener('keydown', this.boundKeydownHandler);
  }
}