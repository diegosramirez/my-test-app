import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NormalizedApiError, FieldError, WireErrorResponse } from '../models/api-error.model';

const PASSWORD_FIELDS = ['password', 'password_confirmation', 'passwordConfirmation'];

function stripPasswordFields(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!PASSWORD_FIELDS.includes(key)) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

function normalizeError(response: HttpErrorResponse): NormalizedApiError {
  const status = response.status;
  const body = response.error as WireErrorResponse | null;
  const retryAfterHeader = response.headers?.get('Retry-After');
  const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

  let errors: FieldError[] = [];

  if (body?.detail) {
    if (Array.isArray(body.detail)) {
      errors = body.detail.map((e) => {
        const cleaned = stripPasswordFields(e as unknown as Record<string, unknown>) as unknown as FieldError;
        return { field: cleaned.field ?? 'general', message: cleaned.message ?? '' };
      });
    } else if (typeof body.detail === 'string') {
      errors = [{ field: 'general', message: body.detail }];
    }
  }

  if (errors.length === 0) {
    errors = [{ field: 'general', message: 'An unexpected error occurred' }];
  }

  return { status, errors, retryAfter };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 400 || error.status === 409 || error.status === 429) {
        const normalized = normalizeError(error);
        return throwError(() => normalized);
      }
      return throwError(() => normalizeError(error));
    })
  );
};
