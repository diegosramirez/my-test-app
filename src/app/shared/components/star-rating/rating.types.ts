/**
 * Type alias for rating values with 0.1 precision but 0.5 display rounding
 */
export type RatingValue = number;

/**
 * Interface for rating change events emitted by the star rating component
 */
export interface RatingChangeEvent {
  /** The selected rating value (0-5) */
  rating: number;
  /** Optional content identifier for tracking */
  contentId?: string;
  /** Timestamp of the rating change */
  timestamp: Date;
}

/**
 * Interface for analytics tracking events
 */
export interface RatingAnalyticsEvent {
  /** Event name for tracking */
  eventName: string;
  /** Properties associated with the event */
  properties: Record<string, any>;
}

/**
 * Configuration interface for star rating component
 */
export interface StarRatingConfig {
  /** Maximum rating value (default: 5) */
  maxRating?: number;
  /** Whether to show numeric display (default: true) */
  showNumeric?: boolean;
  /** Whether to allow half-star display (default: true) */
  allowHalfStars?: boolean;
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
}