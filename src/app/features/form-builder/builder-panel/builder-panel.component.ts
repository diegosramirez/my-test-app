import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { FormSchema, FieldType } from '../../../models/form-schema.model';
import { FormSchemaService } from '../../../services/form-schema.service';
import { FieldConfigCardComponent } from './field-config-card.component';

interface PendingDeletion {
  fieldId: string;
  fieldIndex: number;
  timer: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-builder-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDragPlaceholder, FieldConfigCardComponent],
  template: `
    <div class="builder-panel">
      <div class="builder-header">
        <h3>Builder</h3>
        <div class="add-field-group">
          <select
            [(ngModel)]="selectedType"
            class="type-select"
            aria-label="Select field type to add"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <button
            class="add-btn"
            (click)="addField()"
            aria-label="Add field"
          >+ Add Field</button>
        </div>
      </div>

      @if (visibleFields.length === 0) {
        <div class="empty-state">
          <div class="empty-illustration" aria-hidden="true">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect x="10" y="20" width="60" height="10" rx="3" fill="#e0e0e0"/>
              <rect x="10" y="36" width="60" height="10" rx="3" fill="#e8e7ff"/>
              <rect x="10" y="52" width="40" height="10" rx="3" fill="#e0e0e0"/>
            </svg>
          </div>
          <p class="empty-text">Add your first field to get started</p>
          <button
            class="add-btn primary"
            (click)="addField()"
            aria-label="Add your first field"
          >+ Add Field</button>
        </div>
      } @else {
        <div
          cdkDropList
          class="field-list"
          (cdkDropListDropped)="onDrop($event)"
        >
          @for (field of visibleFields; track field.id; let i = $index; let first = $first; let last = $last) {
            <div cdkDrag cdkDragLockAxis="y" class="drag-item">
              <div class="drag-placeholder" *cdkDragPlaceholder></div>
              <app-field-config-card
                [field]="field"
                [isFirst]="first"
                [isLast]="last"
                [duplicateLabel]="isDuplicateLabel(field.label)"
                (moveUp)="onMoveUp(i)"
                (moveDown)="onMoveDown(i)"
                (deleteField)="onDelete(field.id, i)"
              ></app-field-config-card>
            </div>
          }
        </div>
      }

      @if (undoToast) {
        <div class="undo-toast" role="alert">
          <span>Field deleted</span>
          <button
            class="undo-btn"
            (click)="undoDeletion()"
            aria-label="Undo field deletion"
          >Undo</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .builder-panel {
      background: #fff;
      border-radius: 12px;
      padding: 1.25rem;
      border: 2px solid #e0e0e0;
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
      position: relative;
    }
    .builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .builder-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1a1a2e;
    }
    .add-field-group {
      display: flex;
      gap: 0.35rem;
    }
    .type-select {
      padding: 0.35rem 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .add-btn {
      padding: 0.4rem 0.9rem;
      background: #6c63ff;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .add-btn:hover {
      background: #5a52d5;
    }
    .add-btn.primary {
      padding: 0.6rem 1.5rem;
      font-size: 0.95rem;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }
    .empty-illustration {
      margin-bottom: 1rem;
    }
    .empty-text {
      color: #888;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .field-list {
      min-height: 60px;
    }
    .drag-item {
      cursor: default;
    }
    .drag-placeholder {
      background: #e8e7ff;
      border: 2px dashed #6c63ff;
      border-radius: 10px;
      height: 60px;
      margin-bottom: 0.5rem;
      transition: transform 250ms;
    }
    .cdk-drag-preview {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      border-radius: 10px;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .undo-toast {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: #333;
      color: #fff;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.5rem;
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .undo-btn {
      background: #6c63ff;
      color: #fff;
      border: none;
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
    }
  `],
})
export class FormBuilderPanelComponent {
  @Input() schema: FormSchema = { fields: [], version: 0 };

  selectedType: FieldType = 'text';
  undoToast = false;
  private pendingDeletion: PendingDeletion | null = null;
  private deletedFieldSnapshot: { field: import('../../../models/form-schema.model').FormFieldDefinition; index: number } | null = null;

  constructor(private readonly schemaService: FormSchemaService) {}

  get visibleFields() {
    if (this.pendingDeletion) {
      return this.schema.fields.filter((f) => f.id !== this.pendingDeletion!.fieldId);
    }
    return this.schema.fields;
  }

  addField(): void {
    this.schemaService.addField(this.selectedType);
  }

  onDrop(event: CdkDragDrop<unknown>): void {
    this.schemaService.reorderFields(event.previousIndex, event.currentIndex);
  }

  onMoveUp(index: number): void {
    if (index > 0) {
      // Map visible index to real index
      const field = this.visibleFields[index];
      const realIndex = this.schema.fields.findIndex((f) => f.id === field.id);
      const prevField = this.visibleFields[index - 1];
      const realPrevIndex = this.schema.fields.findIndex((f) => f.id === prevField.id);
      this.schemaService.reorderFields(realIndex, realPrevIndex);
    }
  }

  onMoveDown(index: number): void {
    if (index < this.visibleFields.length - 1) {
      const field = this.visibleFields[index];
      const realIndex = this.schema.fields.findIndex((f) => f.id === field.id);
      const nextField = this.visibleFields[index + 1];
      const realNextIndex = this.schema.fields.findIndex((f) => f.id === nextField.id);
      this.schemaService.reorderFields(realIndex, realNextIndex);
    }
  }

  onDelete(fieldId: string, visibleIndex: number): void {
    // Cancel any existing pending deletion
    if (this.pendingDeletion) {
      this.commitDeletion();
    }

    const field = this.schema.fields.find((f) => f.id === fieldId);
    const realIndex = this.schema.fields.findIndex((f) => f.id === fieldId);
    if (field) {
      this.deletedFieldSnapshot = { field: { ...field }, index: realIndex };
    }

    this.undoToast = true;
    this.pendingDeletion = {
      fieldId,
      fieldIndex: realIndex,
      timer: setTimeout(() => {
        this.commitDeletion();
      }, 5000),
    };
  }

  undoDeletion(): void {
    if (this.pendingDeletion) {
      clearTimeout(this.pendingDeletion.timer);
      this.pendingDeletion = null;
      this.deletedFieldSnapshot = null;
      this.undoToast = false;
    }
  }

  private commitDeletion(): void {
    if (this.pendingDeletion) {
      clearTimeout(this.pendingDeletion.timer);
      this.schemaService.removeField(this.pendingDeletion.fieldId);
      this.pendingDeletion = null;
      this.deletedFieldSnapshot = null;
      this.undoToast = false;
    }
  }

  isDuplicateLabel(label: string): boolean {
    const count = this.schema.fields.filter((f) => f.label === label).length;
    return count > 1;
  }
}
