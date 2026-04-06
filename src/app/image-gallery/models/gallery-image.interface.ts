export interface GalleryImage {
  id: string;
  thumbnailUrl: string;
  fullSizeUrl: string;
  altText: string;
  title?: string;
  description?: string;
  fileSize?: number;
  loadError?: boolean;
  retryCount?: number;
}

export interface GalleryConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  thumbnailDimensions: {
    width: number;
    height: number;
  };
  lazyLoadThreshold: number;
  maxRetries: number;
  animationDuration: number;
}

export interface GalleryAnalyticsEvent {
  eventName: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  userId?: string;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  columns: {
    mobile: 2,
    tablet: 3,
    desktop: 4
  },
  thumbnailDimensions: {
    width: 300,
    height: 180
  },
  lazyLoadThreshold: 100,
  maxRetries: 3,
  animationDuration: 300
};