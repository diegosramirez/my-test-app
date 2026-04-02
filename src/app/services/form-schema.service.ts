import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import {
  FieldType,
  FormFieldDefinition,
  FormSchema,
  ExportedFormSchema,
} from '../models/form-schema.model';
import { AnalyticsService } from './analytics.service';

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Untitled Text Field',
  number: 'Untitled Number Field',
  select: 'Untitled Select Field',
  checkbox: 'Untitled Checkbox',
};

@Injectable({ providedIn: 'root' })
export class FormSchemaService {
  private readonly _schema$ = new BehaviorSubject<FormSchema>({
    fields: [],
    version: 0,
  });

  readonly schema$: Observable<FormSchema> = this._schema$.asObservable();

  constructor(private readonly analytics: AnalyticsService) {}

  currentSnapshot(): FormSchema {
    return this._schema$.getValue();
  }

  addField(type: FieldType): void {
    const current = this.currentSnapshot();
    const newField: FormFieldDefinition = {
      id: crypto.randomUUID(),
      type,
      label: DEFAULT_LABELS[type],
      validation: {},
      ...(type === 'select' ? { options: [] } : {}),
    };
    const fields = [...current.fields, newField];
    const next: FormSchema = { fields, version: current.version + 1 };
    this._schema$.next(next);
    this.analytics.track('field_added', {
      fieldType: type,
      fieldIndex: fields.length - 1,
    });
  }

  removeField(fieldId: string): void {
    const current = this.currentSnapshot();
    const removed = current.fields.find((f) => f.id === fieldId);
    const fields = current.fields.filter((f) => f.id !== fieldId);
    this._schema$.next({ fields, version: current.version + 1 });
    if (removed) {
      this.analytics.track('field_removed', {
        fieldType: removed.type,
        fieldId: removed.id,
      });
    }
  }

  updateField(fieldId: string, patch: Partial<FormFieldDefinition>): void {
    const current = this.currentSnapshot();
    const fields = current.fields.map((f) =>
      f.id === fieldId ? { ...f, ...patch } : f
    );
    this._schema$.next({ fields, version: current.version + 1 });
  }

  reorderFields(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }
    const current = this.currentSnapshot();
    const fields = [...current.fields];
    moveItemInArray(fields, previousIndex, currentIndex);
    this._schema$.next({ fields, version: current.version + 1 });
    this.analytics.track('field_reordered', {
      fromIndex: previousIndex,
      toIndex: currentIndex,
    });
  }

  exportSchemaAsJson(): boolean {
    try {
      const current = this.currentSnapshot();
      const exportData: ExportedFormSchema = {
        ...current,
        schemaVersion: 1,
      };
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `form-schema-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.analytics.track('schema_exported', {
        fieldCount: current.fields.length,
        timestamp: Date.now(),
      });
      return true;
    } catch {
      return false;
    }
  }
}
