import { Component, Input, Output, EventEmitter, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ValidationMessageComponent } from '../validation-message/validation-message.component';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ValidationMessageComponent],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
      multi: true
    }
  ]
})
export class FormFieldComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() errors: string[] = [];
  @Input() touched: boolean = false;
  @Input() fieldName: string = '';
  @Input() autocomplete: string = '';
  @Input() maxlength: number | null = null;
  @Input() rows: number = 4; // For textarea

  @Output() valueChange = new EventEmitter<string>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();

  protected readonly value = signal('');
  protected readonly isFocused = signal(false);

  // Computed properties for accessibility and styling
  protected readonly hasError = computed(() => this.touched && this.errors.length > 0);
  protected readonly isValid = computed(() => this.touched && this.errors.length === 0 && this.value().length > 0);
  protected readonly showValidation = computed(() => this.touched);

  // ControlValueAccessor implementation
  private onChange = (value: string) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = target.value;
    this.value.set(newValue);
    this.onChange(newValue);
    this.valueChange.emit(newValue);
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.focus.emit();
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
    this.blur.emit();
  }

  getFieldId(): string {
    return `field-${this.fieldName}`;
  }

  getLabelId(): string {
    return `label-${this.fieldName}`;
  }

  getErrorIds(): string {
    if (!this.hasError()) return '';
    return this.errors.map((_, index) => `${this.fieldName}-error-${index}`).join(' ');
  }

  getDescribedByIds(): string {
    const ids: string[] = [];
    if (this.hasError()) {
      ids.push(...this.getErrorIds().split(' '));
    }
    return ids.join(' ');
  }

  getInputClasses(): string {
    const baseClasses = 'form-input';
    const stateClasses = [];

    if (this.isFocused()) {
      stateClasses.push('focused');
    }

    if (this.hasError()) {
      stateClasses.push('invalid');
    } else if (this.isValid()) {
      stateClasses.push('valid');
    }

    if (this.disabled) {
      stateClasses.push('disabled');
    }

    return [baseClasses, ...stateClasses].join(' ');
  }

  getLabelClasses(): string {
    const baseClasses = 'form-label';
    const stateClasses = [];

    if (this.required) {
      stateClasses.push('required');
    }

    if (this.hasError()) {
      stateClasses.push('error');
    }

    return [baseClasses, ...stateClasses].join(' ');
  }

  shouldShowCharacterCount(): boolean {
    return this.maxlength !== null && (this.type === 'text' || this.type === 'textarea' || this.type === 'email');
  }

  getCharacterCountText(): string {
    if (!this.maxlength) return '';
    const remaining = this.maxlength - this.value().length;
    return `${this.value().length}/${this.maxlength}`;
  }

  isCharacterLimitNearExceeded(): boolean {
    if (!this.maxlength) return false;
    const remaining = this.maxlength - this.value().length;
    return remaining <= Math.min(20, this.maxlength * 0.1);
  }
}