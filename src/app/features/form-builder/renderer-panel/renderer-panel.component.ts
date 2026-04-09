import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { FormSchema, FormFieldDefinition } from '../../../models/form-schema.model';
import { mapValidationRules } from '../../../utils/validation-mapper';
import { DynamicFieldComponent } from './dynamic-field.component';
import { AnalyticsService } from '../../../services/analytics.service';

function emptyOptionsValidator(control: AbstractControl): ValidationErrors | null {
  // This validator is attached to select fields with no options.
  // The field definition is captured in closure by the caller.
  return { emptyOptions: true };
}

@Component({
  selector: 'app-renderer-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DynamicFieldComponent],
  template: `
    <div class="renderer-panel" [class.fill-mode]="mode === 'fill'">
      <div class="renderer-header">
        <h3>Preview</h3>
        @if (mode === 'fill') {
          <span class="mode-badge fill-badge">Fill Mode</span>
        } @else {
          <span class="mode-badge build-badge">Build Mode</span>
        }
      </div>

      <div aria-live="polite" class="renderer-form-area">
        @if (schema.fields.length === 0) {
          <div class="empty-preview">
            <p>Add fields in the builder to see them here.</p>
          </div>
        } @else {
          <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" novalidate>
            @for (field of schema.fields; track field.id) {
              <div class="renderer-field-wrapper">
                @if (hasConflict(field)) {
                  <div class="conflict-warning" role="alert">
                    <span class="error-icon" aria-hidden="true">&#9888;</span>
                    Conflicting validation rules detected
                  </div>
                }
                <app-dynamic-field
                  [field]="field"
                  [control]="getControl(field.id)"
                ></app-dynamic-field>
              </div>
            }
            @if (mode === 'fill') {
              <button type="submit" class="submit-btn" aria-label="Submit form">
                Submit
              </button>
            }
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .renderer-panel {
      background: #fafafa;
      border-radius: 12px;
      padding: 1.25rem;
      border: 2px solid #e0e0e0;
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
    }
    .renderer-panel.fill-mode {
      border-color: #6c63ff;
      background: #fff;
    }
    .renderer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .renderer-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1a1a2e;
    }
    .mode-badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-weight: 600;
    }
    .build-badge {
      background: #e0e0e0;
      color: #666;
    }
    .fill-badge {
      background: #6c63ff;
      color: #fff;
    }
    .renderer-form-area {
      min-height: 100px;
    }
    .empty-preview {
      text-align: center;
      color: #999;
      padding: 2rem;
    }
    .renderer-field-wrapper {
      margin-bottom: 0.5rem;
    }
    .conflict-warning {
      color: #e67e22;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: #fef5e7;
      border-radius: 4px;
    }
    .error-icon {
      font-size: 0.9rem;
    }
    .submit-btn {
      margin-top: 1rem;
      padding: 0.6rem 1.5rem;
      background: #6c63ff;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .submit-btn:hover {
      background: #5a52d5;
    }
  `],
})
export class FormRendererPanelComponent implements OnChanges {
  @Input() schema: FormSchema = { fields: [], version: 0 };
  @Input() mode: 'build' | 'fill' = 'build';

  formGroup = new FormGroup({});
  private lastVersion = -1;
  private fieldStructureCache = new Map<string, { type: string; validationJson: string }>();
  private fallbackControl: FormControl | null = null;

  constructor(private readonly analytics: AnalyticsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema']) {
      this.diffAndUpdateFormGroup();
    }
    if (changes['mode']) {
      this.applyModeToControls();
    }
  }

  private buildValidators(field: FormFieldDefinition): any[] {
    const validators = mapValidationRules(field);
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      validators.push(emptyOptionsValidator);
    }
    return validators;
  }

  private diffAndUpdateFormGroup(): void {
    const schema = this.schema;
    if (schema.version === this.lastVersion) return;
    this.lastVersion = schema.version;

    const currentControlIds = new Set(Object.keys(this.formGroup.controls));
    const newFieldIds = new Set(schema.fields.map((f) => f.id));

    // Remove deleted fields
    for (const id of currentControlIds) {
      if (!newFieldIds.has(id)) {
        this.formGroup.removeControl(id);
        this.fieldStructureCache.delete(id);
      }
    }

    // Add or update fields
    for (const field of schema.fields) {
      const validationJson = JSON.stringify(field.validation);
      const optionsJson = field.type === 'select' ? JSON.stringify(field.options || []) : '';
      const cacheKey = validationJson + '|' + optionsJson;
      const cached = this.fieldStructureCache.get(field.id);

      if (!currentControlIds.has(field.id)) {
        // New field — create enabled, then applyModeToControls will handle disable
        const control = new FormControl(
          field.type === 'checkbox' ? false : '',
          this.buildValidators(field)
        );
        this.formGroup.addControl(field.id, control);
        this.fieldStructureCache.set(field.id, { type: field.type, validationJson: cacheKey });
      } else if (cached && (cached.type !== field.type || cached.validationJson !== cacheKey)) {
        // Validation, type, or options changed — update in place
        const control = this.formGroup.get(field.id) as FormControl;
        if (cached.type !== field.type) {
          control.setValue(field.type === 'checkbox' ? false : '');
        }
        control.setValidators(this.buildValidators(field));
        control.updateValueAndValidity();
        this.fieldStructureCache.set(field.id, { type: field.type, validationJson: cacheKey });
      }
      // label-only change: skip — no control rebuild needed
    }

    // Apply current mode to all controls (including newly added ones)
    this.applyModeToControls();
  }

  private applyModeToControls(): void {
    for (const key of Object.keys(this.formGroup.controls)) {
      const control = this.formGroup.get(key) as FormControl;
      if (this.mode === 'build') {
        control.disable();
      } else {
        control.enable();
      }
    }
  }

  getControl(fieldId: string): FormControl {
    const control = this.formGroup.get(fieldId) as FormControl;
    if (control) return control;
    // Return a stable cached fallback to avoid creating new controls on every change detection
    if (!this.fallbackControl) {
      this.fallbackControl = new FormControl('');
    }
    return this.fallbackControl;
  }

  hasConflict(field: FormFieldDefinition): boolean {
    const v = field.validation;
    if (field.type === 'text' && v.minLength != null && v.maxLength != null && v.minLength > v.maxLength) {
      return true;
    }
    if (field.type === 'number' && v.min != null && v.max != null && v.min > v.max) {
      return true;
    }
    return false;
  }

  onSubmit(): void {
    // Mark all as touched
    Object.values(this.formGroup.controls).forEach((c: any) => c.markAsTouched());

    const errorCount = Object.values(this.formGroup.controls).filter(
      (c: any) => c.invalid
    ).length;

    this.analytics.track('form_validated', {
      isValid: this.formGroup.valid,
      errorCount,
    });
  }
}
