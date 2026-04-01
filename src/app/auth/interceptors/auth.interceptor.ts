import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { trackEvent } from '../../shared/utils/analytics';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  let request = req;
  if (token && req.url.includes('/api/')) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && req.url.includes('/api/') && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/register')) {
        trackEvent('auth_token_expired', { requestUrl: req.url });
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
