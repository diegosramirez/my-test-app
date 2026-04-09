import { SimpleChange } from '@angular/core';
import { FormRendererPanelComponent } from './renderer-panel.component';
import { AnalyticsService } from '../../../services/analytics.service';
import { FormSchema, FormFieldDefinition } from '../../../models/form-schema.model';

function makeTextField(id: string, overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { id, type: 'text', label: 'Text', validation: {}, ...overrides };
}

describe('FormRendererPanelComponent', () => {
  let component: FormRendererPanelComponent;
  let analytics: { track: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    analytics = { track: vi.fn() };
    component = new FormRendererPanelComponent(analytics as unknown as AnalyticsService);
  });

  function setSchema(schema: FormSchema) {
    component.schema = schema;
    component.ngOnChanges({ schema: new SimpleChange(null, schema, false) });
  }

  function setMode(mode: 'build' | 'fill') {
    component.mode = mode;
    component.ngOnChanges({ mode: new SimpleChange(null, mode, false) });
  }

  it('should create FormGroup controls for new fields', () => {
    setSchema({ fields: [makeTextField('a'), makeTextField('b')], version: 1 });
    expect(component.formGroup.get('a')).not.toBeNull();
    expect(component.formGroup.get('b')).not.toBeNull();
  });

  it('should remove controls for deleted fields', () => {
    setSchema({ fields: [makeTextField('a'), makeTextField('b')], version: 1 });
    setSchema({ fields: [makeTextField('a')], version: 2 });
    expect(component.formGroup.get('a')).not.toBeNull();
    expect(component.formGroup.get('b')).toBeNull();
  });

  it('should preserve user values on label-only change', () => {
    setSchema({ fields: [makeTextField('a')], version: 1 });
    setMode('fill');
    component.getControl('a').setValue('user input');
    setSchema({ fields: [makeTextField('a', { label: 'New Label' })], version: 2 });
    expect(component.getControl('a').value).toBe('user input');
  });

  it('should update validators in-place on validation change', () => {
    setSchema({ fields: [makeTextField('a')], version: 1 });
    setMode('fill');
    component.getControl('a').setValue('hi');
    setSchema({ fields: [makeTextField('a', { validation: { minLength: 5 } })], version: 2 });
    component.getControl('a').updateValueAndValidity();
    expect(component.getControl('a').hasError('minlength')).toBe(true);
    expect(component.getControl('a').value).toBe('hi'); // value preserved
  });

  it('should disable controls in build mode', () => {
    setSchema({ fields: [makeTextField('a')], version: 1 });
    setMode('build');
    expect(component.getControl('a').disabled).toBe(true);
  });

  it('should enable controls in fill mode', () => {
    setSchema({ fields: [makeTextField('a')], version: 1 });
    setMode('fill');
    expect(component.getControl('a').enabled).toBe(true);
  });

  it('should skip update when version unchanged', () => {
    const schema: FormSchema = { fields: [makeTextField('a')], version: 1 };
    setSchema(schema);
    // Setting same version should not error or add duplicates
    setSchema(schema);
    expect(Object.keys(component.formGroup.controls).length).toBe(1);
  });

  // --- hasConflict ---
  it('should detect text minLength > maxLength conflict', () => {
    const field = makeTextField('a', { validation: { minLength: 10, maxLength: 5 } });
    expect(component.hasConflict(field)).toBe(true);
  });

  it('should detect number min > max conflict', () => {
    const field: FormFieldDefinition = { id: 'n', type: 'number', label: 'N', validation: { min: 50, max: 10 } };
    expect(component.hasConflict(field)).toBe(true);
  });

  it('should not flag conflict when rules are valid', () => {
    expect(component.hasConflict(makeTextField('a', { validation: { minLength: 2, maxLength: 10 } }))).toBe(false);
  });

  // --- onSubmit ---
  it('should mark all controls as touched on submit', () => {
    setSchema({ fields: [makeTextField('a', { validation: { required: true } })], version: 1 });
    setMode('fill');
    component.onSubmit();
    expect(component.getControl('a').touched).toBe(true);
  });

  it('should track form_validated event on submit', () => {
    setSchema({ fields: [makeTextField('a', { validation: { required: true } })], version: 1 });
    setMode('fill');
    component.onSubmit();
    expect(analytics.track).toHaveBeenCalledWith('form_validated', { isValid: false, errorCount: 1 });
  });

  // --- empty select handling ---
  it('should set emptyOptions error for select with no options', () => {
    const selectField: FormFieldDefinition = { id: 's', type: 'select', label: 'S', validation: {}, options: [] };
    setSchema({ fields: [selectField], version: 1 });
    setMode('fill');
    expect(component.getControl('s').hasError('emptyOptions')).toBe(true);
  });

  // --- checkbox default value ---
  it('should initialize checkbox with false value', () => {
    const cbField: FormFieldDefinition = { id: 'cb', type: 'checkbox', label: 'CB', validation: {} };
    setSchema({ fields: [cbField], version: 1 });
    expect(component.getControl('cb').value).toBe(false);
  });

  // --- getControl fallback ---
  it('should return a fallback FormControl for unknown id', () => {
    const ctrl = component.getControl('nonexistent');
    expect(ctrl).toBeTruthy();
    expect(ctrl.value).toBe('');
  });
});
