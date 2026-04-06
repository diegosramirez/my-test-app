/**
 * Configuration interface for the StarRating component
 */
export interface StarRatingConfig {
  /** Current rating value (0-5, supports decimals) */
  rating: number;
  /** Maximum number of stars to display */
  maxStars: number;
  /** Whether the component is interactive */
  interactive: boolean;
  /** Whether to show numeric rating alongside stars */
  showNumeric: boolean;
  /** Size variant for the component */
  size: StarRatingSize;
  /** Precision for displaying half-star ratings */
  precision: number;
}

/**
 * Size variants for the star rating component
 */
export type StarRatingSize = 'small' | 'medium' | 'large';

/**
 * Display modes for the star rating component
 */
export type StarRatingMode = 'interactive' | 'readonly' | 'disabled';

/**
 * Event data emitted when rating changes
 */
export interface RatingChangeEvent {
  /** The new rating value */
  rating: number;
  /** The interaction method used */
  interactionMethod: 'mouse' | 'keyboard' | 'touch';
  /** Unique identifier for the component instance */
  componentId?: string;
}

/**
 * Event data emitted when hovering over stars
 */
export interface RatingHoverEvent {
  /** The preview rating value being hovered */
  previewRating: number;
  /** Unique identifier for the component instance */
  componentId?: string;
}

/**
 * Individual star state for rendering
 */
export interface StarState {
  /** Index of the star (0-based) */
  index: number;
  /** Whether this star is filled */
  filled: boolean;
  /** Whether this star is half-filled */
  halfFilled: boolean;
  /** Whether this star is being hovered */
  hovered: boolean;
}

/**
 * Keyboard navigation events
 */
export interface KeyboardNavigationEvent {
  /** Direction of navigation */
  direction: 'left' | 'right' | 'home' | 'end';
  /** Current focused star index */
  currentFocus: number;
  /** Component ID for tracking */
  componentId?: string;
}

/**
 * Validation result for rating values
 */
export interface RatingValidation {
  /** Whether the rating is valid */
  isValid: boolean;
  /** Normalized rating value within bounds */
  normalizedRating: number;
  /** Error message if validation fails */
  errorMessage?: string;
}