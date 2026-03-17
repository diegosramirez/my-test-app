export interface FieldError {
  field: string;
  message: string;
}

export interface NormalizedApiError {
  status: number;
  errors: FieldError[];
  retryAfter?: number;
}

export interface WireErrorResponse {
  detail: string | FieldError[];
}
