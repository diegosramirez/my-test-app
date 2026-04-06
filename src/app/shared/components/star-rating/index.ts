/**
 * Star Rating Component Module
 *
 * Exports all public APIs for the star rating component including:
 * - StarRatingComponent (main component)
 * - All interfaces and types
 */

// Main component export
export { StarRatingComponent } from './star-rating.component';

// Interface and type exports
export type {
  StarRatingConfig,
  StarRatingSize,
  StarRatingMode,
  RatingChangeEvent,
  RatingHoverEvent,
  StarState,
  KeyboardNavigationEvent,
  RatingValidation
} from './star-rating.interface';

// Default export for convenience
export { StarRatingComponent as default } from './star-rating.component';