import { FieldConfigCardComponent } from './field-config-card.component';
import { FormSchemaService } from '../../../services/form-schema.service';
import { FormFieldDefinition } from '../../../models/form-schema.model';

function makeField(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { id: 'f1', type: 'text', label: 'Test', validation: {}, ...overrides };
}

describe('FieldConfigCardComponent', () => {
  let component: FieldConfigCardComponent;
  let mockService: { updateField: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = { updateField: vi.fn() };
    component = new FieldConfigCardComponent(mockService as unknown as FormSchemaService);
    component.field = makeField();
  });

  // --- warnings ---
  it('should return empty warnings when no issues', () => {
    expect(component.warnings).toEqual([]);
  });

  it('should warn on duplicate label', () => {
    component.duplicateLabel = true;
    expect(component.warnings).toContain('Duplicate label detected');
  });

  it('should warn when text minLength > maxLength', () => {
    component.field = makeField({ type: 'text', validation: { minLength: 10, maxLength: 5 } });
    expect(component.warnings).toContain('Min length exceeds max length');
  });

  it('should warn when number min > max', () => {
    component.field = makeField({ type: 'number', validation: { min: 50, max: 10 } });
    expect(component.warnings).toContain('Min value exceeds max value');
  });

  it('should not warn about number conflicts on text fields', () => {
    component.field = makeField({ type: 'text', validation: { min: 50, max: 10 } });
    expect(component.warnings.length).toBe(0);
  });

  // --- onUpdate ---
  it('should call updateField with label patch', () => {
    component.onUpdate({ label: 'New Label' });
    expect(mockService.updateField).toHaveBeenCalledWith('f1', { label: 'New Label' });
  });

  // --- onValidationChange ---
  it('should update required as boolean', () => {
    component.onValidationChange('required', true);
    expect(mockService.updateField).toHaveBeenCalledWith('f1', { validation: { required: true } });
  });

  it('should convert numeric validation to number', () => {
    component.onValidationChange('minLength', 5);
    expect(mockService.updateField).toHaveBeenCalledWith('f1', { validation: { minLength: 5 } });
  });

  it('should convert empty string to undefined', () => {
    component.onValidationChange('minLength', '');
    expect(mockService.updateField).toHaveBeenCalledWith('f1', { validation: { minLength: undefined } });
  });

  // --- options management ---
  it('should add an option to select field', () => {
    component.field = makeField({ type: 'select', options: [] });
    vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
    component.addOption();
    expect(mockService.updateField).toHaveBeenCalledWith('f1', {
      options: [{ label: '', value: 'mock-uuid' }],
    });
    vi.unstubAllGlobals();
  });

  it('should remove an option by index', () => {
    component.field = makeField({ type: 'select', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] });
    component.removeOption(0);
    expect(mockService.updateField).toHaveBeenCalledWith('f1', {
      options: [{ label: 'B', value: 'b' }],
    });
  });

  it('should update option label and derive value', () => {
    component.field = makeField({ type: 'select', options: [{ label: 'Old', value: 'old' }] });
    component.onOptionLabelChange(0, 'New Label');
    expect(mockService.updateField).toHaveBeenCalledWith('f1', {
      options: [{ label: 'New Label', value: 'new-label' }],
    });
  });
});
