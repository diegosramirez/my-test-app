import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { filter, map, take, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthResolved$.pipe(
    filter((resolved): resolved is boolean => resolved !== null),
    take(1),
    switchMap(() => authService.isAuthenticated$),
    take(1),
    map(isAuth => {
      if (!isAuth) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    })
  );
};
