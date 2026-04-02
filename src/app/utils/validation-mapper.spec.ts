import { FormControl, Validators } from '@angular/forms';
import { mapValidationRules } from './validation-mapper';
import { FormFieldDefinition } from '../models/form-schema.model';

function makeField(overrides: Partial<FormFieldDefinition>): FormFieldDefinition {
  return {
    id: 'test-id',
    type: 'text',
    label: 'Test',
    validation: {},
    ...overrides,
  };
}

function applyAndValidate(field: FormFieldDefinition, value: unknown) {
  const validators = mapValidationRules(field);
  const control = new FormControl(value, validators);
  return control;
}

describe('mapValidationRules', () => {
  // --- required ---
  it('should return empty array when no validation rules', () => {
    expect(mapValidationRules(makeField({ validation: {} }))).toEqual([]);
  });

  it('should add Validators.required for required text field', () => {
    const ctrl = applyAndValidate(makeField({ type: 'text', validation: { required: true } }), '');
    expect(ctrl.hasError('required')).toBe(true);
  });

  it('should add Validators.required for required number field', () => {
    const ctrl = applyAndValidate(makeField({ type: 'number', validation: { required: true } }), '');
    expect(ctrl.hasError('required')).toBe(true);
  });

  it('should add Validators.required for required select field', () => {
    const ctrl = applyAndValidate(makeField({ type: 'select', validation: { required: true } }), '');
    expect(ctrl.hasError('required')).toBe(true);
  });

  it('should add Validators.requiredTrue for required checkbox', () => {
    const ctrl = applyAndValidate(makeField({ type: 'checkbox', validation: { required: true } }), false);
    expect(ctrl.hasError('required')).toBe(true);
    // true should pass
    const ctrl2 = applyAndValidate(makeField({ type: 'checkbox', validation: { required: true } }), true);
    expect(ctrl2.valid).toBe(true);
  });

  // --- minLength / maxLength only for text ---
  it('should add minLength validator for text fields', () => {
    const ctrl = applyAndValidate(makeField({ type: 'text', validation: { minLength: 3 } }), 'ab');
    expect(ctrl.hasError('minlength')).toBe(true);
  });

  it('should add maxLength validator for text fields', () => {
    const ctrl = applyAndValidate(makeField({ type: 'text', validation: { maxLength: 5 } }), 'abcdef');
    expect(ctrl.hasError('maxlength')).toBe(true);
  });

  it('should NOT add minLength/maxLength for number fields', () => {
    const validators = mapValidationRules(makeField({ type: 'number', validation: { minLength: 3, maxLength: 5 } }));
    expect(validators.length).toBe(0);
  });

  it('should NOT add minLength/maxLength for checkbox fields', () => {
    const validators = mapValidationRules(makeField({ type: 'checkbox', validation: { minLength: 3, maxLength: 5 } }));
    expect(validators.length).toBe(0);
  });

  it('should NOT add minLength/maxLength for select fields', () => {
    const validators = mapValidationRules(makeField({ type: 'select', validation: { minLength: 3, maxLength: 5 } }));
    expect(validators.length).toBe(0);
  });

  // --- min / max only for number ---
  it('should add min validator for number fields', () => {
    const ctrl = applyAndValidate(makeField({ type: 'number', validation: { min: 10 } }), 5);
    expect(ctrl.hasError('min')).toBe(true);
  });

  it('should add max validator for number fields', () => {
    const ctrl = applyAndValidate(makeField({ type: 'number', validation: { max: 10 } }), 15);
    expect(ctrl.hasError('max')).toBe(true);
  });

  it('should NOT add min/max for text fields', () => {
    const validators = mapValidationRules(makeField({ type: 'text', validation: { min: 1, max: 10 } }));
    expect(validators.length).toBe(0);
  });

  // --- combined ---
  it('should combine required + minLength + maxLength for text', () => {
    const validators = mapValidationRules(makeField({ type: 'text', validation: { required: true, minLength: 2, maxLength: 10 } }));
    expect(validators.length).toBe(3);
  });

  it('should combine required + min + max for number', () => {
    const validators = mapValidationRules(makeField({ type: 'number', validation: { required: true, min: 0, max: 100 } }));
    expect(validators.length).toBe(3);
  });

  // --- edge: minLength of 0 should not add validator ---
  it('should not add minLength validator when minLength is 0', () => {
    const validators = mapValidationRules(makeField({ type: 'text', validation: { minLength: 0 } }));
    expect(validators.length).toBe(0);
  });

  // --- edge: min of 0 should still add validator ---
  it('should add min validator when min is 0', () => {
    const ctrl = applyAndValidate(makeField({ type: 'number', validation: { min: 0 } }), -1);
    expect(ctrl.hasError('min')).toBe(true);
  });

  // --- conflicting rules still produce validators ---
  it('should produce validators even when minLength > maxLength (conflict)', () => {
    const validators = mapValidationRules(makeField({ type: 'text', validation: { minLength: 10, maxLength: 5 } }));
    expect(validators.length).toBe(2);
  });
});
