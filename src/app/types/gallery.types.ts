export interface GalleryImage {
  id: string;
  thumbnailUrl: string;
  fullSizeUrl: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  loadingState?: 'pending' | 'loading' | 'loaded' | 'error';
}

export interface GalleryConfig {
  aspectRatio: string;
  lazyLoadThreshold: number;
  transitionDuration: number;
  retryAttempts: number;
  retryDelay: number;
  breakpoints: ResponsiveBreakpoints;
}

export interface ResponsiveBreakpoints {
  mobile: number;    // <480px - 1 column
  tablet: number;    // 480-767px - 2 columns
  desktop: number;   // 768-1199px - 3 columns
  large: number;     // ≥1200px - 4 columns
}

export interface ResponsiveColumns {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

export interface ImageLoadMetrics {
  imageId: string;
  loadDuration: number;
  retryCount: number;
  errorType?: string;
  timestamp: number;
}

export interface GalleryEvent {
  eventName: string;
  imageId?: string;
  properties: Record<string, any>;
  timestamp: number;
}

export type NavigationMethod = 'keyboard' | 'mouse' | 'touch';
export type CloseMethod = 'escape' | 'button' | 'outside-click';