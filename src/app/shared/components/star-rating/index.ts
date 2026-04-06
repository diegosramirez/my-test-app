/**
 * Star Rating Component Exports
 *
 * This file exports all public interfaces and components from the star rating module
 * for easy importing throughout the application.
 */

// Component
export { StarRatingComponent } from './star-rating.component';

// Service
export { StarRatingService } from './star-rating.service';

// Types and Interfaces
export type {
  RatingValue,
  RatingChangeEvent,
  RatingAnalyticsEvent,
  StarRatingConfig
} from './rating.types';