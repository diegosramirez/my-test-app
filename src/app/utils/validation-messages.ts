import { FieldType } from '../models/form-schema.model';

export function getValidationMessage(
  errorKey: string,
  errorValue: unknown,
  fieldType: FieldType
): string {
  switch (errorKey) {
    case 'required':
      if (fieldType === 'checkbox') {
        return 'This checkbox must be checked';
      }
      return 'This field is required';
    case 'minlength': {
      const val = errorValue as { requiredLength: number };
      return `Minimum length is ${val.requiredLength} characters`;
    }
    case 'maxlength': {
      const val = errorValue as { requiredLength: number };
      return `Maximum length is ${val.requiredLength} characters`;
    }
    case 'min': {
      const val = errorValue as { min: number };
      return `Minimum value is ${val.min}`;
    }
    case 'max': {
      const val = errorValue as { max: number };
      return `Maximum value is ${val.max}`;
    }
    case 'emptyOptions':
      return 'No options defined for this select field';
    default:
      return 'Invalid value';
  }
}
