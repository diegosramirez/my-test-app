import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  forwardRef,
  ChangeDetectorRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, timer, takeUntil } from 'rxjs';

import { ToggleChangeEvent, ToggleSize } from '../../shared/toggle.types';
import { EventTrackingService } from '../../shared/event-tracking.service';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'switch',
    'tabindex': '0',
    '[attr.aria-checked]': 'isChecked',
    '[attr.aria-disabled]': 'disabled',
    '[class.toggle--small]': 'size === "small"',
    '[class.toggle--medium]': 'size === "medium"',
    '[class.toggle--large]': 'size === "large"',
    '[class.toggle--checked]': 'isChecked',
    '[class.toggle--disabled]': 'disabled',
    '[class.toggle--animating]': 'isAnimating',
    '(click)': 'onToggle()',
    '(keydown)': 'onKeyDown($event)'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ]
})
export class ToggleSwitchComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() isChecked: boolean = false;
  @Input() disabled: boolean = false;
  @Input() size: ToggleSize = 'medium';
  @Input() componentId?: string;
  @Input() showLabels: boolean = false;
  @Input() debounceMs: number = 50;

  @Output() change = new EventEmitter<ToggleChangeEvent>();

  isAnimating = false;
  private destroy$ = new Subject<void>();
  private animationStartTime = 0;
  private debounceTimer?: any;

  // ControlValueAccessor
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  constructor(
    private eventTracking: EventTrackingService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {
    this.componentId = this.componentId || `toggle_${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    // Ensure minimum touch target size
    const element = this.elementRef.nativeElement;
    const computedStyle = getComputedStyle(element);
    const minSize = 44; // 44px minimum touch target

    if (parseInt(computedStyle.height) < minSize || parseInt(computedStyle.width) < minSize) {
      element.style.minHeight = `${minSize}px`;
      element.style.minWidth = `${minSize}px`;
    }

    this.eventTracking.trackToggleInit(this.componentId!, this.isChecked);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  onToggle(): void {
    if (this.disabled || this.isAnimating) {
      return;
    }

    this.toggleState('user');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.isAnimating) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.eventTracking.trackKeyboardUsed(this.componentId!, event.key);
      this.toggleState('user');
    }
  }

  private toggleState(trigger: 'user' | 'programmatic'): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const newState = !this.isChecked;
      this.setCheckedState(newState, trigger);
    }, this.debounceMs);
  }

  private setCheckedState(checked: boolean, trigger: 'user' | 'programmatic'): void {
    if (this.isChecked === checked) {
      return;
    }

    this.isChecked = checked;
    this.startAnimation();

    this.eventTracking.trackToggleStateChange(this.componentId!, checked, trigger);

    // Emit change event
    const changeEvent: ToggleChangeEvent = { checked, trigger };
    this.change.emit(changeEvent);

    // ControlValueAccessor callback
    this.onChange(checked);
    this.onTouched();

    this.cdr.markForCheck();
  }

  private startAnimation(): void {
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.isAnimating = true;
    this.animationStartTime = performance.now();

    // Use timer to track animation completion
    timer(300).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.isAnimating = false;
      const duration = performance.now() - this.animationStartTime;
      this.eventTracking.trackAnimationComplete(this.componentId!, Math.round(duration));
      this.cdr.markForCheck();
    });
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    if (value !== this.isChecked) {
      this.setCheckedState(!!value, 'programmatic');
    }
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}