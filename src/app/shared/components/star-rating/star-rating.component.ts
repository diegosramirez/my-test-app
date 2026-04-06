import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { RatingChangeEvent, RatingValue, StarRatingConfig } from './rating.types';
import { StarRatingService } from './star-rating.service';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true
    }
  ]
})
export class StarRatingComponent implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  @Input() currentRating: number = 0;
  @Input() readonly: boolean = false;
  @Input() contentId?: string;
  @Input() config: StarRatingConfig = {};

  @Output() ratingChange = new EventEmitter<RatingChangeEvent>();

  @ViewChildren('starButton') starButtons!: QueryList<ElementRef>;

  // Component state
  hoveredRating: number = 0;
  displayRating: number = 0;
  stars: Array<{ value: number; state: 'empty' | 'half' | 'full' }> = [];
  isTouchDevice: boolean = false;

  // ControlValueAccessor
  private onChange = (rating: number): void => {};
  private onTouched = (): void => {};

  // Observables
  private destroy$ = new Subject<void>();
  private clickSubject$ = new Subject<number>();
  private renderStartTime: number = 0;

  // Configuration
  maxRating = 5;
  showNumeric = true;
  private allowHalfStars = true;
  private debounceMs = 100;

  constructor(
    private cdr: ChangeDetectorRef,
    private ratingService: StarRatingService
  ) {
    this.detectTouchDevice();
    this.setupDebouncedClicks();
  }

  ngOnInit(): void {
    this.renderStartTime = performance.now();

    // Apply configuration
    this.maxRating = this.config.maxRating || 5;
    this.showNumeric = this.config.showNumeric !== false;
    this.allowHalfStars = this.config.allowHalfStars !== false;
    this.debounceMs = this.config.debounceMs || 100;

    this.initializeStars();
    this.updateDisplayRating();
  }

  ngAfterViewInit(): void {
    const renderTime = performance.now() - this.renderStartTime;
    this.ratingService.trackComponentRender(
      this.readonly ? 'readonly' : 'interactive',
      this.currentRating,
      renderTime
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ControlValueAccessor implementation
  writeValue(value: number): void {
    this.currentRating = this.ratingService.validateRating(value || 0);
    this.updateDisplayRating();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (rating: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
    this.cdr.markForCheck();
  }

  // Public methods
  setRating(value: number): void {
    const validatedRating = this.ratingService.validateRating(value);
    this.currentRating = validatedRating;
    this.updateDisplayRating();
    this.emitChange();
  }

  getRating(): number {
    return this.currentRating;
  }

  clearRating(): void {
    const previousRating = this.currentRating;
    this.currentRating = 0;
    this.updateDisplayRating();
    this.emitChange();
    this.ratingService.trackRatingCleared(previousRating, this.contentId);
  }

  // Event handlers
  onStarClick(rating: number): void {
    if (this.readonly) return;

    this.onTouched();
    this.clickSubject$.next(rating);
  }

  onStarHover(rating: number): void {
    if (this.readonly || this.isTouchDevice) return;

    this.hoveredRating = rating;
    this.updateDisplayRating();
    this.ratingService.trackHoverInteraction(rating, this.contentId);
    this.cdr.markForCheck();
  }

  onMouseLeave(): void {
    if (this.readonly || this.isTouchDevice) return;

    this.hoveredRating = 0;
    this.updateDisplayRating();
    this.cdr.markForCheck();
  }

  onKeyDown(event: KeyboardEvent, rating: number): void {
    if (this.readonly) return;

    const { key } = event;
    let newRating = this.currentRating;
    let actionType = '';

    switch (key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onStarClick(rating);
        actionType = 'select';
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newRating = Math.min(this.maxRating, this.currentRating + 1);
        this.setRating(newRating);
        actionType = 'increment';
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newRating = Math.max(0, this.currentRating - 1);
        this.setRating(newRating);
        actionType = 'decrement';
        break;
      case 'Home':
        event.preventDefault();
        this.clearRating();
        actionType = 'clear';
        break;
      case 'End':
        event.preventDefault();
        this.setRating(this.maxRating);
        actionType = 'max';
        break;
    }

    if (actionType) {
      this.ratingService.trackKeyboardNavigation(actionType, newRating);
    }
  }

  // Utility methods
  getStarState(index: number): 'empty' | 'half' | 'full' {
    const rating = this.hoveredRating || this.displayRating;
    return this.ratingService.getStarState(rating, index);
  }

  getFormattedRating(): string {
    const rating = this.hoveredRating || this.displayRating;
    return this.ratingService.formatRatingDisplay(rating);
  }

  getAriaLabel(): string {
    const rating = this.displayRating;
    if (this.readonly) {
      return `Rating: ${this.getFormattedRating()}`;
    }
    return `Rate this content. Current rating: ${this.getFormattedRating()}`;
  }

  getStarAriaLabel(index: number): string {
    const starValue = index + 1;
    const isSelected = this.displayRating >= starValue;

    if (this.readonly) {
      return `Star ${starValue} of ${this.maxRating}${isSelected ? ' filled' : ' empty'}`;
    }

    return `Give ${starValue} star${starValue === 1 ? '' : 's'} rating${isSelected ? ' (selected)' : ''}`;
  }

  // Private methods
  private initializeStars(): void {
    this.stars = Array.from({ length: this.maxRating }, (_, index) => ({
      value: index + 1,
      state: 'empty' as const
    }));
  }

  private updateDisplayRating(): void {
    this.displayRating = this.ratingService.validateRating(this.currentRating);
    this.updateStarStates();
  }

  private updateStarStates(): void {
    this.stars.forEach((star, index) => {
      star.state = this.getStarState(index);
    });
  }

  private setupDebouncedClicks(): void {
    this.clickSubject$
      .pipe(
        debounceTime(this.debounceMs),
        takeUntil(this.destroy$)
      )
      .subscribe(rating => {
        this.currentRating = this.ratingService.validateRating(rating);
        this.updateDisplayRating();
        this.emitChange();
        this.ratingService.trackRatingSelection(rating, this.contentId);
        this.cdr.markForCheck();
      });
  }

  private emitChange(): void {
    const event: RatingChangeEvent = {
      rating: this.currentRating,
      contentId: this.contentId,
      timestamp: new Date()
    };

    this.ratingChange.emit(event);
    this.onChange(this.currentRating);
  }

  private detectTouchDevice(): void {
    this.isTouchDevice = 'ontouchstart' in window ||
                       navigator.maxTouchPoints > 0 ||
                       (navigator as any).msMaxTouchPoints > 0;
  }

  // TrackBy function for ngFor performance
  trackByStarIndex(index: number): number {
    return index;
  }
}