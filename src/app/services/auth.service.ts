import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SignupStep1Request, SignupStep1Response, SignupStep1WireResponse } from '../models/signup.model';
import { mapKeysToSnakeCase } from '../utils/case-transform.util';

function nfcNormalize(value: string): string {
  return value.normalize('NFC');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  signupStep1(request: SignupStep1Request): Observable<SignupStep1Response> {
    const normalized: SignupStep1Request = {
      email: request.email,
      password: nfcNormalize(request.password),
      passwordConfirmation: nfcNormalize(request.passwordConfirmation),
    };

    const wireBody = mapKeysToSnakeCase(normalized as unknown as Record<string, unknown>);

    return this.http
      .post<SignupStep1WireResponse>(`${this.apiBase}/signup/step1`, wireBody)
      .pipe(
        map((wire) => ({
          userId: wire.user_id,
          step: wire.step,
        }))
      );
  }
}
