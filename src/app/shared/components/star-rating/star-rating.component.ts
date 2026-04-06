import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export type StarSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarRatingComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() rating: number = 0;
  @Input() readonly: boolean = false;
  @Input() showNumeric: boolean = false;
  @Input() size: StarSize = 'medium';
  @Input() contentId?: string;

  @Output() ratingChange = new EventEmitter<number>();
  @Output() hover = new EventEmitter<number>();

  @ViewChild('ratingContainer', { static: true }) ratingContainer!: ElementRef<HTMLDivElement>;

  // Signals for reactive state management
  private _rating = signal(0);
  private _hoveredRating = signal(0);
  private _focusedStarIndex = signal(-1);

  // Computed values for display
  displayRating = computed(() => {
    const hovered = this._hoveredRating();
    return hovered > 0 ? hovered : this._rating();
  });

  stars = computed(() => {
    const rating = this.displayRating();
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      const filled = this.getStarFillPercentage(i, rating);
      stars.push({
        index: i,
        filled,
        isHalf: filled > 0 && filled < 100,
        isFull: filled === 100,
        isEmpty: filled === 0
      });
    }

    return stars;
  });

  formattedRating = computed(() => {
    const rating = this._rating();
    return rating % 1 === 0 ? rating.toString() : rating.toFixed(1);
  });

  // Computed accessibility attributes that react to readonly changes
  tabIndex = computed(() => this.readonly ? null : 0);
  ariaReadonly = computed(() => this.readonly.toString());
  ariaLabel = computed(() => {
    const rating = this._rating();
    if (this.readonly) {
      return `Rating: ${rating} out of 5 stars`;
    }
    return `Rate content from 1 to 5 stars. Current rating: ${rating} stars`;
  });

  private ratingSubject = new Subject<number>();
  private hoverSubject = new Subject<number>();
  private isKeyboardNavigation = false;

  constructor() {
    // Debounced rating changes
    this.ratingSubject.pipe(
      debounceTime(300)
    ).subscribe(rating => {
      this.ratingChange.emit(rating);
    });

    // Debounced hover events for analytics
    this.hoverSubject.pipe(
      debounceTime(100)
    ).subscribe(rating => {
      this.hover.emit(rating);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rating']) {
      const newRating = this.clampRating(changes['rating'].currentValue || 0);
      this._rating.set(newRating);
    }

    // Handle readonly changes to ensure proper accessibility and focus management
    if (changes['readonly']) {
      // If component becomes readonly while focused, blur it
      if (changes['readonly'].currentValue && this.ratingContainer?.nativeElement === document.activeElement) {
        this.ratingContainer.nativeElement.blur();
      }
    }
  }

  ngAfterViewInit(): void {
    // Set up accessibility attributes
    this.setupAccessibility();
  }

  ngOnDestroy(): void {
    this.ratingSubject.complete();
    this.hoverSubject.complete();
  }

  private setupAccessibility(): void {
    // Most accessibility attributes are now handled reactively in the template
    // This method can be simplified to handle any initialization that needs the DOM
    // Currently no additional setup is needed since template bindings handle all attributes
  }

  private clampRating(value: number): number {
    if (isNaN(value) || value < 0) return 0;
    if (value > 5) return 5;
    return Math.round(value * 2) / 2; // Round to nearest 0.5
  }

  private getStarFillPercentage(starIndex: number, rating: number): number {
    if (rating >= starIndex) return 100;
    if (rating >= starIndex - 0.5) return 50;
    return 0;
  }

  onStarClick(starIndex: number): void {
    if (this.readonly) return;

    const newRating = starIndex;
    this._rating.set(newRating);
    this.ratingSubject.next(newRating);
    this.updateAccessibilityAttributes();
    this.announceRatingChange(newRating);
  }

  onStarHover(starIndex: number): void {
    if (this.readonly) return;

    this._hoveredRating.set(starIndex);
    this.hoverSubject.next(starIndex);
  }

  onMouseLeave(): void {
    if (this.readonly) return;

    this._hoveredRating.set(0);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.readonly) return;

    const currentRating = this._rating();
    let newRating = currentRating;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newRating = Math.max(0, currentRating - 1);
        this.isKeyboardNavigation = true;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newRating = Math.min(5, currentRating + 1);
        this.isKeyboardNavigation = true;
        break;
      case 'Home':
        event.preventDefault();
        newRating = 1;
        this.isKeyboardNavigation = true;
        break;
      case 'End':
        event.preventDefault();
        newRating = 5;
        this.isKeyboardNavigation = true;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Use focused star index if keyboard navigation is active
        if (this.isKeyboardNavigation && this._focusedStarIndex() > 0) {
          newRating = this._focusedStarIndex();
        }
        break;
      default:
        // Handle numeric keys 1-5
        const numKey = parseInt(event.key);
        if (numKey >= 1 && numKey <= 5) {
          event.preventDefault();
          newRating = numKey;
          this.isKeyboardNavigation = true;
        }
        return;
    }

    if (newRating !== currentRating) {
      this._rating.set(newRating);
      this._focusedStarIndex.set(newRating);
      this.ratingSubject.next(newRating);
      this.updateAccessibilityAttributes();
      this.announceRatingChange(newRating);
    }
  }

  @HostListener('focus')
  onFocus(): void {
    this.isKeyboardNavigation = true;
  }

  @HostListener('blur')
  onBlur(): void {
    this.isKeyboardNavigation = false;
    this._focusedStarIndex.set(-1);
  }

  private updateAccessibilityAttributes(): void {
    // Accessibility attributes are now handled reactively in the template
    // This method is kept for potential future dynamic updates but currently
    // all attributes are properly bound in the template and update automatically
  }

  private announceRatingChange(rating: number): void {
    // Create live region announcement for screen readers
    const announcement = `Rating set to ${rating} out of 5 stars`;

    // Create temporary live region element
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = announcement;

    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  }

  // Track by function for star list performance
  trackByStar(index: number, star: any): number {
    return star.index;
  }
}