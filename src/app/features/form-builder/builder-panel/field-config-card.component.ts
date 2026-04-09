import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { FormFieldDefinition, SelectOption } from '../../../models/form-schema.model';
import { FormSchemaService } from '../../../services/form-schema.service';

@Component({
  selector: 'app-field-config-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDragHandle],
  template: `
    <div class="field-card" [class.has-warning]="warnings.length > 0">
      <div class="card-header">
        <span class="drag-handle" cdkDragHandle aria-label="Drag to reorder field">
          &#9776;
        </span>
        <span class="field-type-badge">{{ field.type }}</span>
        <div class="card-actions">
          <button
            class="move-btn"
            [disabled]="isFirst"
            (click)="moveUp.emit()"
            [attr.aria-label]="'Move ' + field.label + ' up'"
          >&#9650;</button>
          <button
            class="move-btn"
            [disabled]="isLast"
            (click)="moveDown.emit()"
            [attr.aria-label]="'Move ' + field.label + ' down'"
          >&#9660;</button>
          <button
            class="delete-btn"
            (click)="deleteField.emit()"
            [attr.aria-label]="'Delete ' + field.label"
          >&#10005;</button>
        </div>
      </div>

      <div class="card-body">
        <div class="config-row">
          <label [attr.for]="'label-' + field.id" class="config-label">Label</label>
          <input
            [id]="'label-' + field.id"
            type="text"
            [ngModel]="field.label"
            (ngModelChange)="onUpdate({ label: $event })"
            class="config-input"
            [attr.aria-label]="'Label for ' + field.label"
          />
        </div>

        <div class="config-row checkbox-row">
          <label class="config-label">
            <input
              type="checkbox"
              [ngModel]="field.validation.required"
              (ngModelChange)="onValidationChange('required', $event)"
              [attr.aria-label]="'Required toggle for ' + field.label"
            />
            Required
          </label>
        </div>

        @if (field.type === 'text') {
          <div class="config-row inline-row">
            <div class="inline-field">
              <label [attr.for]="'minlen-' + field.id" class="config-label">Min Length</label>
              <input
                [id]="'minlen-' + field.id"
                type="number"
                [ngModel]="field.validation.minLength"
                (ngModelChange)="onValidationChange('minLength', $event)"
                class="config-input small"
                min="0"
                [attr.aria-label]="'Minimum length for ' + field.label"
              />
            </div>
            <div class="inline-field">
              <label [attr.for]="'maxlen-' + field.id" class="config-label">Max Length</label>
              <input
                [id]="'maxlen-' + field.id"
                type="number"
                [ngModel]="field.validation.maxLength"
                (ngModelChange)="onValidationChange('maxLength', $event)"
                class="config-input small"
                min="0"
                [attr.aria-label]="'Maximum length for ' + field.label"
              />
            </div>
          </div>
        }

        @if (field.type === 'number') {
          <div class="config-row inline-row">
            <div class="inline-field">
              <label [attr.for]="'min-' + field.id" class="config-label">Min</label>
              <input
                [id]="'min-' + field.id"
                type="number"
                [ngModel]="field.validation.min"
                (ngModelChange)="onValidationChange('min', $event)"
                class="config-input small"
                [attr.aria-label]="'Minimum value for ' + field.label"
              />
            </div>
            <div class="inline-field">
              <label [attr.for]="'max-' + field.id" class="config-label">Max</label>
              <input
                [id]="'max-' + field.id"
                type="number"
                [ngModel]="field.validation.max"
                (ngModelChange)="onValidationChange('max', $event)"
                class="config-input small"
                [attr.aria-label]="'Maximum value for ' + field.label"
              />
            </div>
          </div>
        }

        @if (field.type === 'select') {
          <div class="options-editor">
            <label class="config-label">Options</label>
            @if (!field.options || field.options.length === 0) {
              <div class="warning-inline">
                <span class="error-icon" aria-hidden="true">&#9888;</span>
                No options defined
              </div>
            }
            @for (opt of field.options || []; track $index) {
              <div class="option-row">
                <input
                  type="text"
                  [ngModel]="opt.label"
                  (ngModelChange)="onOptionLabelChange($index, $event)"
                  placeholder="Option label"
                  class="config-input option-input"
                  [attr.aria-label]="'Option ' + ($index + 1) + ' label'"
                />
                <button
                  class="remove-option-btn"
                  (click)="removeOption($index)"
                  [attr.aria-label]="'Remove option ' + ($index + 1)"
                >&#10005;</button>
              </div>
            }
            <button
              class="add-option-btn"
              (click)="addOption()"
              aria-label="Add select option"
            >+ Add option</button>
          </div>
        }

        @for (w of warnings; track w) {
          <div class="warning-inline">
            <span class="error-icon" aria-hidden="true">&#9888;</span>
            {{ w }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .field-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .field-card.has-warning {
      border-color: #e67e22;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .drag-handle {
      cursor: grab;
      font-size: 1.1rem;
      color: #999;
      user-select: none;
    }
    .field-type-badge {
      background: #e8e7ff;
      color: #6c63ff;
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 8px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .card-actions {
      margin-left: auto;
      display: flex;
      gap: 0.25rem;
    }
    .move-btn {
      background: none;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      padding: 0.1rem 0.4rem;
      font-size: 0.7rem;
      color: #666;
    }
    .move-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .delete-btn {
      background: none;
      border: 1px solid #e74c3c;
      color: #e74c3c;
      border-radius: 4px;
      cursor: pointer;
      padding: 0.1rem 0.4rem;
      font-size: 0.8rem;
    }
    .delete-btn:hover {
      background: #e74c3c;
      color: #fff;
    }
    .card-body {
      padding-left: 1.5rem;
    }
    .config-row {
      margin-bottom: 0.5rem;
    }
    .config-label {
      display: block;
      font-size: 0.75rem;
      color: #666;
      margin-bottom: 0.15rem;
      font-weight: 600;
    }
    .config-input {
      width: 100%;
      padding: 0.35rem 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.85rem;
      box-sizing: border-box;
    }
    .config-input.small {
      width: 100%;
    }
    .checkbox-row label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .inline-row {
      display: flex;
      gap: 0.75rem;
    }
    .inline-field {
      flex: 1;
    }
    .options-editor {
      margin-top: 0.25rem;
    }
    .option-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }
    .option-input {
      flex: 1;
    }
    .remove-option-btn {
      background: none;
      border: none;
      color: #e74c3c;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0.2rem;
    }
    .add-option-btn {
      background: none;
      border: none;
      color: #6c63ff;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0;
    }
    .warning-inline {
      color: #e67e22;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
      padding: 0.2rem 0.4rem;
      background: #fef5e7;
      border-radius: 4px;
    }
    .error-icon {
      font-size: 0.85rem;
    }
    @media (max-width: 1024px) {
      .move-btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.85rem;
      }
    }
  `],
})
export class FieldConfigCardComponent {
  @Input() field!: FormFieldDefinition;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() duplicateLabel = false;

  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() deleteField = new EventEmitter<void>();

  constructor(private readonly schemaService: FormSchemaService) {}

  get warnings(): string[] {
    const w: string[] = [];
    if (this.duplicateLabel) {
      w.push('Duplicate label detected');
    }
    const v = this.field.validation;
    if (this.field.type === 'text' && v.minLength != null && v.maxLength != null && v.minLength > v.maxLength) {
      w.push('Min length exceeds max length');
    }
    if (this.field.type === 'number' && v.min != null && v.max != null && v.min > v.max) {
      w.push('Min value exceeds max value');
    }
    return w;
  }

  onUpdate(patch: Partial<FormFieldDefinition>): void {
    this.schemaService.updateField(this.field.id, patch);
  }

  onValidationChange(key: string, value: unknown): void {
    const numVal = value === '' || value === null ? undefined : Number(value);
    const validation = {
      ...this.field.validation,
      [key]: key === 'required' ? value : numVal,
    };
    this.schemaService.updateField(this.field.id, { validation });
  }

  addOption(): void {
    const options: SelectOption[] = [...(this.field.options || []), { label: '', value: crypto.randomUUID() }];
    this.schemaService.updateField(this.field.id, { options });
  }

  removeOption(index: number): void {
    const options = [...(this.field.options || [])];
    options.splice(index, 1);
    this.schemaService.updateField(this.field.id, { options });
  }

  onOptionLabelChange(index: number, label: string): void {
    const options = [...(this.field.options || [])];
    options[index] = { ...options[index], label, value: label.toLowerCase().replace(/\s+/g, '-') || options[index].value };
    this.schemaService.updateField(this.field.id, { options });
  }
}
