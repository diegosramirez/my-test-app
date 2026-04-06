import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ToggleChangeEvent {
  value: boolean;
  previousValue: boolean;
  source: 'user' | 'programmatic';
}

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true
    }
  ]
})
export class ToggleComponent implements ControlValueAccessor {
  @Input() disabled: boolean = false;
  @Input() ariaLabel?: string;
  @Input() ariaLabelledBy?: string;
  @Output() valueChange = new EventEmitter<boolean>();
  @Output() toggleChange = new EventEmitter<ToggleChangeEvent>();

  @ViewChild('toggleButton', { static: true }) toggleButton!: ElementRef<HTMLButtonElement>;

  private _value: boolean = false;
  private _isAnimating: boolean = false;

  // ControlValueAccessor properties
  private onChange = (value: boolean) => {};
  private onTouched = () => {};

  get value(): boolean {
    return this._value;
  }

  set value(val: boolean) {
    this.writeValue(val);
  }

  get isChecked(): boolean {
    return this._value;
  }

  get ariaChecked(): string {
    return this._value.toString();
  }

  get circleTransform(): string {
    return this._value ? 'translateX(24px)' : 'translateX(0px)';
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    const previousValue = this._value;

    // Input validation with type guards
    if (value === null || value === undefined) {
      this._value = false;
    } else if (typeof value === 'boolean') {
      this._value = value;
    } else {
      console.warn(`Toggle received invalid value: ${value}. Expected boolean. Defaulting to false.`);
      this._value = false;
    }

    // Emit programmatic change event if value actually changed
    if (previousValue !== this._value) {
      this.toggleChange.emit({
        value: this._value,
        previousValue,
        source: 'programmatic'
      });
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
  }

  onToggleClick(event: Event): void {
    event.preventDefault();

    if (this.disabled || this._isAnimating) {
      return;
    }

    this.toggle('user');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this._isAnimating) {
      return;
    }

    // Handle Space and Enter keys
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.toggle('user');
    }
  }

  onFocus(): void {
    this.onTouched();
  }

  private toggle(source: 'user' | 'programmatic'): void {
    const previousValue = this._value;
    this._value = !this._value;

    // Start animation state
    this._isAnimating = true;

    // Emit events
    this.valueChange.emit(this._value);
    this.toggleChange.emit({
      value: this._value,
      previousValue,
      source
    });

    // Notify forms
    this.onChange(this._value);

    // Reset animation state after transition completes
    const transitionDuration = this.getTransitionDuration();
    setTimeout(() => {
      this._isAnimating = false;
    }, transitionDuration);
  }

  /**
   * Gets the current transition duration from CSS custom property
   * Falls back to 200ms if unable to read the value
   */
  private getTransitionDuration(): number {
    if (!this.toggleButton?.nativeElement) {
      return 200; // Fallback if element not available
    }

    try {
      const computedStyle = getComputedStyle(this.toggleButton.nativeElement);
      const duration = computedStyle.getPropertyValue('--toggle-transition-duration').trim();

      if (!duration) {
        return 200; // Fallback if custom property not set
      }

      // Parse duration value (e.g., "200ms" -> 200, "0.2s" -> 200)
      if (duration.endsWith('ms')) {
        return parseInt(duration.slice(0, -2), 10) || 200;
      } else if (duration.endsWith('s')) {
        return parseFloat(duration.slice(0, -1)) * 1000 || 200;
      }

      return 200; // Fallback for unrecognized format
    } catch (error) {
      console.warn('Toggle: Unable to read transition duration from CSS. Using fallback.', error);
      return 200;
    }
  }
}