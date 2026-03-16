import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ContactFormPayload } from './contact-form.model';

@Injectable({ providedIn: 'root' })
export class ContactFormService {
  submit(payload: ContactFormPayload): Observable<{ status: string }> {
    console.log(JSON.stringify({ event: 'contact_form_submitted', ...payload }));
    return of({ status: 'received' });
  }

  logViewed(): void {
    console.log(JSON.stringify({
      event: 'contact_form_viewed',
      route: '/contact',
      timestamp: new Date().toISOString(),
    }));
  }

  logValidationFailed(invalidFields: string[]): void {
    console.log(JSON.stringify({
      event: 'contact_form_validation_failed',
      invalid_fields: invalidFields,
      timestamp: new Date().toISOString(),
    }));
  }
}
