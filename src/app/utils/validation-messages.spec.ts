import { getValidationMessage } from './validation-messages';

describe('getValidationMessage', () => {
  it('should return checkbox-specific message for required checkbox', () => {
    expect(getValidationMessage('required', true, 'checkbox')).toBe('This checkbox must be checked');
  });

  it('should return generic required message for text', () => {
    expect(getValidationMessage('required', true, 'text')).toBe('This field is required');
  });

  it('should return generic required message for number', () => {
    expect(getValidationMessage('required', true, 'number')).toBe('This field is required');
  });

  it('should return generic required message for select', () => {
    expect(getValidationMessage('required', true, 'select')).toBe('This field is required');
  });

  it('should return minlength message with required length', () => {
    expect(getValidationMessage('minlength', { requiredLength: 3 }, 'text')).toBe('Minimum length is 3 characters');
  });

  it('should return maxlength message with required length', () => {
    expect(getValidationMessage('maxlength', { requiredLength: 10 }, 'text')).toBe('Maximum length is 10 characters');
  });

  it('should return min message with min value', () => {
    expect(getValidationMessage('min', { min: 5 }, 'number')).toBe('Minimum value is 5');
  });

  it('should return max message with max value', () => {
    expect(getValidationMessage('max', { max: 100 }, 'number')).toBe('Maximum value is 100');
  });

  it('should return empty options message', () => {
    expect(getValidationMessage('emptyOptions', true, 'select')).toBe('No options defined for this select field');
  });

  it('should return default message for unknown error key', () => {
    expect(getValidationMessage('unknownKey', {}, 'text')).toBe('Invalid value');
  });
});
