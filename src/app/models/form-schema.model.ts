export type FieldType = 'text' | 'number' | 'select' | 'checkbox';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  validation: ValidationRule;
  options?: SelectOption[];
}

export interface FormSchema {
  fields: FormFieldDefinition[];
  version: number;
}

export interface ExportedFormSchema extends FormSchema {
  schemaVersion: number;
}
