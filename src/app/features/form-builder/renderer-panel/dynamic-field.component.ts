import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FormFieldDefinition } from '../../../models/form-schema.model';
import { getValidationMessage } from '../../../utils/validation-messages';

@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dynamic-field">
      <label [attr.for]="'field-' + field.id" class="field-label">
        {{ field.label }}
        @if (field.validation.required) {
          <span class="required-indicator" aria-hidden="true">*</span>
        }
      </label>

      @switch (field.type) {
        @case ('text') {
          <input
            [id]="'field-' + field.id"
            type="text"
            [formControl]="control"
            [placeholder]="field.placeholder || ''"
            [attr.aria-describedby]="hasErrors ? 'error-' + field.id : null"
            [attr.aria-invalid]="hasErrors"
            class="field-input"
          />
        }
        @case ('number') {
          <input
            [id]="'field-' + field.id"
            type="number"
            [formControl]="control"
            [placeholder]="field.placeholder || ''"
            [attr.aria-describedby]="hasErrors ? 'error-' + field.id : null"
            [attr.aria-invalid]="hasErrors"
            class="field-input"
          />
        }
        @case ('select') {
          @if (!field.options || field.options.length === 0) {
            <select
              [id]="'field-' + field.id"
              [formControl]="control"
              [attr.aria-describedby]="'empty-options-' + field.id"
              aria-invalid="true"
              class="field-input field-select"
            >
              <option value="">No options defined</option>
            </select>
          } @else {
            <select
              [id]="'field-' + field.id"
              [formControl]="control"
              [attr.aria-describedby]="hasErrors ? 'error-' + field.id : null"
              [attr.aria-invalid]="hasErrors"
              class="field-input field-select"
            >
              <option value="">-- Select --</option>
              @for (opt of field.options; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          }
        }
        @case ('checkbox') {
          <div class="checkbox-wrapper">
            <input
              [id]="'field-' + field.id"
              type="checkbox"
              [formControl]="control"
              [attr.aria-describedby]="hasErrors ? 'error-' + field.id : null"
              [attr.aria-invalid]="hasErrors"
              class="field-checkbox"
            />
            <label [attr.for]="'field-' + field.id" class="checkbox-label">
              {{ field.label }}
            </label>
          </div>
        }
      }

      @if (hasErrors) {
        <div [id]="'error-' + field.id" class="field-errors" role="alert">
          @for (msg of errorMessages; track msg) {
            <div class="error-message">
              <span class="error-icon" aria-hidden="true">&#9888;</span>
              {{ msg }}
            </div>
          }
        </div>
      }

      @if (hasEmptyOptions) {
        <div [id]="'empty-options-' + field.id" class="field-errors" role="alert">
          <div class="error-message">
            <span class="error-icon" aria-hidden="true">&#9888;</span>
            No options defined for this select field
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dynamic-field {
      margin-bottom: 1rem;
    }
    .field-label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: #1a1a2e;
    }
    .required-indicator {
      color: #c0392b;
      margin-left: 2px;
    }
    .field-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 0.875rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .field-input:focus {
      outline: none;
      border-color: #6c63ff;
      box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.2);
    }
    .field-input:disabled {
      background: #f0f0f0;
      color: #999;
      cursor: not-allowed;
    }
    .field-input[aria-invalid="true"] {
      border-color: #c0392b;
    }
    .field-select {
      appearance: auto;
    }
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .field-checkbox {
      width: 1.1rem;
      height: 1.1rem;
    }
    .checkbox-label {
      font-weight: 400;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .field-errors {
      margin-top: 0.25rem;
    }
    .error-message {
      color: #c0392b;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.125rem;
    }
    .error-icon {
      font-size: 0.9rem;
    }
  `],
})
export class DynamicFieldComponent {
  @Input() field!: FormFieldDefinition;
  @Input() control!: FormControl;

  get hasErrors(): boolean {
    if (!this.control.touched || !this.control.invalid) return false;
    // Don't show generic errors if the only error is emptyOptions
    const errors = this.control.errors;
    if (!errors) return false;
    const keys = Object.keys(errors).filter(k => k !== 'emptyOptions');
    return keys.length > 0;
  }

  get hasEmptyOptions(): boolean {
    return (
      this.field.type === 'select' &&
      (!this.field.options || this.field.options.length === 0)
    );
  }

  get errorMessages(): string[] {
    if (!this.control.errors) return [];
    return Object.entries(this.control.errors)
      .filter(([key]) => key !== 'emptyOptions')
      .map(([key, value]) =>
        getValidationMessage(key, value, this.field.type)
      );
  }
}
