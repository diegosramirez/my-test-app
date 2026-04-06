import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import {
  StarRatingConfig,
  StarRatingSize,
  StarRatingMode,
  RatingChangeEvent,
  RatingHoverEvent,
  StarState,
  KeyboardNavigationEvent,
  RatingValidation
} from './star-rating.interface';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarRatingComponent implements OnInit, OnDestroy {
  @Input() rating: number = 0;
  @Input() interactive: boolean = true;
  @Input() maxStars: number = 5;
  @Input() showNumeric: boolean = true;
  @Input() size: StarRatingSize = 'medium';
  @Input() componentId?: string;
  @Input() precision: number = 0.5; // For half-star rounding
  @Input() debounceTime: number = 100; // Milliseconds for hover events

  @Output() ratingChange = new EventEmitter<number>();
  @Output() ratingHover = new EventEmitter<RatingHoverEvent>();
  @Output() keyboardNavigation = new EventEmitter<KeyboardNavigationEvent>();

  @ViewChild('starContainer', { static: false }) starContainer?: ElementRef<HTMLDivElement>;

  // Internal state
  public stars: StarState[] = [];
  public currentRating: number = 0;
  public previewRating: number = 0;
  public focusedStarIndex: number = -1;
  public isHovering: boolean = false;
  public readonly uniqueId: string;

  // Reactive streams
  private destroy$ = new Subject<void>();
  private hoverSubject = new Subject<number>();

  // Validation and utility
  private validationRules = {
    minRating: 0,
    maxRating: 5,
    allowDecimals: true
  };

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    // Generate unique ID to prevent mask conflicts when componentId is not provided
    this.uniqueId = this.generateUniqueId();
    // Defer hover subject setup until ngOnInit when input properties are available
  }

  /**
   * Generate a unique ID for the component to prevent SVG mask conflicts
   */
  private generateUniqueId(): string {
    return 'star-rating-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  /**
   * Get the effective component ID (either provided componentId or generated uniqueId)
   */
  public getEffectiveComponentId(): string {
    return this.componentId || this.uniqueId;
  }

  ngOnInit(): void {
    // Set up debounced hover events now that input properties are available
    this.hoverSubject
      .pipe(
        debounceTime(this.debounceTime),
        takeUntil(this.destroy$)
      )
      .subscribe(rating => this.emitHoverEvent(rating));

    // Set CSS custom property for max stars
    this.elementRef.nativeElement.style.setProperty('--max-stars', this.maxStars.toString());

    this.currentRating = this.validateAndNormalizeRating(this.rating).normalizedRating;
    this.initializeStars();
    this.updateStarStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the stars array
   */
  private initializeStars(): void {
    this.stars = Array.from({ length: this.maxStars }, (_, index) => ({
      index,
      filled: false,
      halfFilled: false,
      hovered: false
    }));
  }

  /**
   * Update star states based on current and preview ratings
   */
  private updateStarStates(): void {
    let displayRating = this.isHovering ? this.previewRating : this.currentRating;

    // Apply precision rounding for half-star display
    if (this.precision > 0) {
      displayRating = Math.floor(displayRating / this.precision) * this.precision;
    }

    this.stars.forEach((star, index) => {
      const starValue = index + 1;

      star.filled = displayRating >= starValue;
      star.halfFilled = !star.filled && displayRating >= starValue - 0.5;
      star.hovered = this.isHovering && this.previewRating >= starValue;
    });

    this.cdr.markForCheck();
  }

  /**
   * Validate and normalize rating value
   */
  private validateAndNormalizeRating(rating: number): RatingValidation {
    if (typeof rating !== 'number' || isNaN(rating)) {
      return {
        isValid: false,
        normalizedRating: 0,
        errorMessage: 'Rating must be a valid number'
      };
    }

    const normalizedRating = Math.max(
      this.validationRules.minRating,
      Math.min(this.validationRules.maxRating, rating)
    );

    return {
      isValid: rating >= this.validationRules.minRating && rating <= this.validationRules.maxRating,
      normalizedRating,
      errorMessage: rating < this.validationRules.minRating || rating > this.validationRules.maxRating
        ? `Rating must be between ${this.validationRules.minRating} and ${this.validationRules.maxRating}`
        : undefined
    };
  }

  /**
   * Handle star click events
   */
  onStarClick(starIndex: number): void {
    if (!this.interactive) return;

    const newRating = starIndex + 1;
    this.currentRating = newRating;
    this.updateStarStates();

    const event: RatingChangeEvent = {
      rating: newRating,
      interactionMethod: 'mouse',
      componentId: this.componentId
    };

    this.ratingChange.emit(newRating);
    this.clearHoverState();
  }

  /**
   * Handle star hover events
   */
  onStarHover(starIndex: number): void {
    if (!this.interactive) return;

    this.isHovering = true;
    this.previewRating = starIndex + 1;
    this.updateStarStates();

    // Use debounced subject to prevent excessive events
    this.hoverSubject.next(this.previewRating);
  }

  /**
   * Handle mouse leave events
   */
  onMouseLeave(): void {
    this.clearHoverState();
  }

  /**
   * Clear hover state and reset to current rating
   */
  private clearHoverState(): void {
    this.isHovering = false;
    this.previewRating = 0;
    this.updateStarStates();
  }

  /**
   * Emit hover event with proper data structure
   */
  private emitHoverEvent(rating: number): void {
    const event: RatingHoverEvent = {
      previewRating: rating,
      componentId: this.componentId
    };
    this.ratingHover.emit(event);
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.interactive) return;

    const { key } = event;
    let handled = true;
    let navigationDirection: 'left' | 'right' | 'home' | 'end' | null = null;

    switch (key) {
      case 'ArrowLeft':
        this.navigateToStar(Math.max(0, this.focusedStarIndex - 1));
        navigationDirection = 'left';
        break;
      case 'ArrowRight':
        this.navigateToStar(Math.min(this.maxStars - 1, this.focusedStarIndex + 1));
        navigationDirection = 'right';
        break;
      case 'Home':
        this.navigateToStar(0);
        navigationDirection = 'home';
        break;
      case 'End':
        this.navigateToStar(this.maxStars - 1);
        navigationDirection = 'end';
        break;
      case 'Enter':
      case ' ':
        if (this.focusedStarIndex >= 0) {
          this.selectStar(this.focusedStarIndex, 'keyboard');
        }
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();

      if (navigationDirection) {
        const navEvent: KeyboardNavigationEvent = {
          direction: navigationDirection,
          currentFocus: this.focusedStarIndex,
          componentId: this.componentId
        };
        this.keyboardNavigation.emit(navEvent);
      }
    }
  }

  /**
   * Navigate to a specific star index
   */
  private navigateToStar(index: number): void {
    this.focusedStarIndex = index;
    this.previewRating = index + 1;
    this.isHovering = true;
    this.updateStarStates();
  }

  /**
   * Select a star with specified interaction method
   */
  private selectStar(starIndex: number, method: 'mouse' | 'keyboard' | 'touch'): void {
    const newRating = starIndex + 1;
    this.currentRating = newRating;
    this.clearHoverState();

    const event: RatingChangeEvent = {
      rating: newRating,
      interactionMethod: method,
      componentId: this.componentId
    };

    this.ratingChange.emit(newRating);
  }

  /**
   * Handle touch events for mobile interaction
   */
  onTouchStart(event: TouchEvent, starIndex: number): void {
    if (!this.interactive) return;

    event.preventDefault(); // Prevent mouse events from firing
    this.selectStar(starIndex, 'touch');
  }

  /**
   * Get CSS classes for the component container
   */
  getContainerClasses(): string {
    const classes = ['star-rating-container'];

    classes.push(`star-rating--${this.size}`);

    if (!this.interactive) {
      classes.push('star-rating--readonly');
    }

    if (this.isHovering) {
      classes.push('star-rating--hovering');
    }

    return classes.join(' ');
  }

  /**
   * Get CSS classes for individual stars
   */
  getStarClasses(star: StarState): string {
    const classes = ['star-rating__star'];

    if (star.filled) {
      classes.push('star-rating__star--filled');
    }

    if (star.halfFilled) {
      classes.push('star-rating__star--half-filled');
    }

    if (star.hovered) {
      classes.push('star-rating__star--hovered');
    }

    if (this.focusedStarIndex === star.index) {
      classes.push('star-rating__star--focused');
    }

    return classes.join(' ');
  }

  /**
   * Get ARIA label for the component
   */
  getAriaLabel(): string {
    if (this.interactive) {
      return `Rating: ${this.currentRating} out of ${this.maxStars} stars. Use arrow keys to navigate and Enter or Space to select.`;
    } else {
      return `Rating: ${this.currentRating} out of ${this.maxStars} stars`;
    }
  }

  /**
   * Get ARIA label for individual stars
   */
  getStarAriaLabel(starIndex: number): string {
    const starRating = starIndex + 1;
    const isSelected = this.currentRating >= starRating;

    if (this.interactive) {
      return `${starRating} star${starRating !== 1 ? 's' : ''}, ${isSelected ? 'selected' : 'not selected'}. Press Enter or Space to select.`;
    } else {
      return `${starRating} star${starRating !== 1 ? 's' : ''}, ${isSelected ? 'filled' : 'empty'}`;
    }
  }

  /**
   * Track by function for ngFor performance
   */
  trackByStar(index: number, star: StarState): number {
    return star.index;
  }

  /**
   * Get formatted numeric rating for display
   * Applies the same precision rounding used for visual star display
   */
  getFormattedRating(): string {
    let displayRating = this.currentRating;

    // Apply precision rounding to match visual star display
    if (this.precision > 0) {
      displayRating = Math.round(this.currentRating / this.precision) * this.precision;
    }

    return displayRating.toFixed(this.precision < 1 ? 1 : 0);
  }
}