import { Injectable } from '@angular/core';
import { RatingValue, RatingAnalyticsEvent } from './rating.types';

/**
 * Service for handling star rating validation and analytics
 */
@Injectable({
  providedIn: 'root'
})
export class StarRatingService {

  /**
   * Validates and normalizes a rating value
   * @param value - Raw rating value to validate
   * @returns Validated rating value clamped to 0-5 range with 0.5 precision
   */
  validateRating(value: number): RatingValue {
    if (isNaN(value) || value < 0) {
      return 0;
    }
    if (value > 5) {
      return 5;
    }
    // Round to nearest 0.5 for display consistency
    return Math.round(value * 2) / 2;
  }

  /**
   * Calculates the display state for each star (empty, half, or full)
   * @param rating - Current rating value
   * @param starIndex - Zero-based index of the star (0-4)
   * @returns 'empty' | 'half' | 'full'
   */
  getStarState(rating: number, starIndex: number): 'empty' | 'half' | 'full' {
    const starValue = starIndex + 1;

    if (rating >= starValue) {
      return 'full';
    }
    if (rating >= starValue - 0.5) {
      return 'half';
    }
    return 'empty';
  }

  /**
   * Formats rating for numeric display
   * @param rating - Rating value to format
   * @returns Formatted string like "3.5/5.0"
   */
  formatRatingDisplay(rating: number): string {
    const validatedRating = this.validateRating(rating);
    return `${validatedRating.toFixed(1)}/5.0`;
  }

  /**
   * Tracks analytics events for rating interactions
   * @param event - Analytics event to track
   */
  trackEvent(event: RatingAnalyticsEvent): void {
    // In a real application, this would integrate with analytics service
    console.log(`[StarRating Analytics] ${event.eventName}:`, event.properties);
  }

  /**
   * Tracks star rating selection event
   */
  trackRatingSelection(rating: number, contentId?: string): void {
    this.trackEvent({
      eventName: 'star_rating_selected',
      properties: {
        rating_value: rating,
        content_id: contentId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Tracks component render event
   */
  trackComponentRender(displayMode: 'interactive' | 'readonly', initialRating: number, renderTime: number): void {
    this.trackEvent({
      eventName: 'star_component_viewed',
      properties: {
        display_mode: displayMode,
        initial_rating: initialRating,
        render_time: renderTime
      }
    });
  }

  /**
   * Tracks hover interaction event
   */
  trackHoverInteraction(hoveredRating: number, contentId?: string): void {
    this.trackEvent({
      eventName: 'star_hover',
      properties: {
        hovered_rating: hoveredRating,
        content_id: contentId
      }
    });
  }

  /**
   * Tracks keyboard navigation event
   */
  trackKeyboardNavigation(actionType: string, ratingValue: number): void {
    this.trackEvent({
      eventName: 'star_keyboard_nav',
      properties: {
        action_type: actionType,
        rating_value: ratingValue
      }
    });
  }

  /**
   * Tracks rating cleared event
   */
  trackRatingCleared(previousRating: number, contentId?: string): void {
    this.trackEvent({
      eventName: 'star_rating_cleared',
      properties: {
        previous_rating: previousRating,
        content_id: contentId
      }
    });
  }
}