import { FormControl, Validators } from '@angular/forms';
import { DynamicFieldComponent } from './dynamic-field.component';
import { FormFieldDefinition } from '../../../models/form-schema.model';

function makeField(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { id: 'f1', type: 'text', label: 'Test', validation: {}, ...overrides };
}

describe('DynamicFieldComponent', () => {
  let component: DynamicFieldComponent;

  beforeEach(() => {
    component = new DynamicFieldComponent();
    component.field = makeField();
    component.control = new FormControl('');
  });

  // --- hasErrors ---
  it('should return false when control is untouched', () => {
    component.control.setValidators(Validators.required);
    component.control.updateValueAndValidity();
    expect(component.hasErrors).toBe(false);
  });

  it('should return false when control is valid', () => {
    component.control.setValue('hello');
    component.control.markAsTouched();
    expect(component.hasErrors).toBe(false);
  });

  it('should return true when control is touched and invalid', () => {
    component.control.setValidators(Validators.required);
    component.control.updateValueAndValidity();
    component.control.markAsTouched();
    expect(component.hasErrors).toBe(true);
  });

  it('should return false when only error is emptyOptions', () => {
    component.control.setErrors({ emptyOptions: true });
    component.control.markAsTouched();
    expect(component.hasErrors).toBe(false);
  });

  it('should return true when errors include non-emptyOptions keys', () => {
    component.control.setErrors({ emptyOptions: true, required: true });
    component.control.markAsTouched();
    expect(component.hasErrors).toBe(true);
  });

  // --- hasEmptyOptions ---
  it('should return true for select field with no options', () => {
    component.field = makeField({ type: 'select', options: [] });
    expect(component.hasEmptyOptions).toBe(true);
  });

  it('should return true for select field with undefined options', () => {
    component.field = makeField({ type: 'select' });
    expect(component.hasEmptyOptions).toBe(true);
  });

  it('should return false for select field with options', () => {
    component.field = makeField({ type: 'select', options: [{ label: 'A', value: 'a' }] });
    expect(component.hasEmptyOptions).toBe(false);
  });

  it('should return false for non-select fields', () => {
    component.field = makeField({ type: 'text' });
    expect(component.hasEmptyOptions).toBe(false);
  });

  // --- errorMessages ---
  it('should return empty array when no errors', () => {
    expect(component.errorMessages).toEqual([]);
  });

  it('should return validation messages excluding emptyOptions', () => {
    component.control.setErrors({ required: true, emptyOptions: true });
    const msgs = component.errorMessages;
    expect(msgs.length).toBe(1);
    expect(msgs[0]).toBe('This field is required');
  });

  it('should return minlength message', () => {
    component.control.setErrors({ minlength: { requiredLength: 5, actualLength: 2 } });
    expect(component.errorMessages).toEqual(['Minimum length is 5 characters']);
  });

  it('should return checkbox-specific required message', () => {
    component.field = makeField({ type: 'checkbox' });
    component.control.setErrors({ required: true });
    expect(component.errorMessages).toEqual(['This checkbox must be checked']);
  });

  it('should return multiple error messages', () => {
    component.control.setErrors({
      required: true,
      minlength: { requiredLength: 3, actualLength: 0 },
    });
    expect(component.errorMessages.length).toBe(2);
  });
});
