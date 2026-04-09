import { ValidatorFn, Validators } from '@angular/forms';
import { FormFieldDefinition } from '../models/form-schema.model';

export function mapValidationRules(field: FormFieldDefinition): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const rules = field.validation;

  if (rules.required) {
    if (field.type === 'checkbox') {
      validators.push(Validators.requiredTrue);
    } else {
      validators.push(Validators.required);
    }
  }

  if (field.type === 'text') {
    if (rules.minLength != null && rules.minLength > 0) {
      validators.push(Validators.minLength(rules.minLength));
    }
    if (rules.maxLength != null && rules.maxLength > 0) {
      validators.push(Validators.maxLength(rules.maxLength));
    }
  }

  if (field.type === 'number') {
    if (rules.min != null) {
      validators.push(Validators.min(rules.min));
    }
    if (rules.max != null) {
      validators.push(Validators.max(rules.max));
    }
  }

  return validators;
}
