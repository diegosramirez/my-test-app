export interface ImageItem {
  id: string;
  thumbnailUrl: string;
  fullSizeUrl: string;
  alt: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface GalleryState {
  selectedIndex: number;
  isModalOpen: boolean;
  loadingStates: Map<string, LoadingState>;
  errorStates: Map<string, ErrorState>;
}

export enum LoadingState {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export interface ErrorState {
  retryCount: number;
  lastRetryTime: number;
  nextRetryDelay: number;
}

export interface GalleryConfig {
  lazyLoadingThreshold: number;
  retryDelays: number[];
  maxRetryCount: number;
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    large: number;
  };
}

export interface GalleryEvent {
  imageIndex?: number;
  imageUrl?: string;
  method?: string;
  direction?: string;
  loadTime?: number;
  errorType?: string;
  retryCount?: number;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  lazyLoadingThreshold: 100,
  retryDelays: [2000, 5000, 10000],
  maxRetryCount: 3,
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    large: 1920
  }
};