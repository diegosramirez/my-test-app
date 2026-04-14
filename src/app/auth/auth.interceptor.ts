import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs';

/**
 * HTTP interceptor that adds JWT token to requests and handles 401 responses
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  // Get the token
  const token = authService.getToken();

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (token && req.url.startsWith('/api/')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  // Handle the request
  return next(authReq).pipe(
    catchError((error) => {
      // If we get a 401 response, logout the user
      if (error.status === 401 && token) {
        authService.logout();
      }

      throw error;
    })
  );
};