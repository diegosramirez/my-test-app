import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs';

/**
 * Auth guard that protects routes requiring authentication
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      } else {
        // Preserve the intended destination
        const returnUrl = state.url;

        // Navigate to login with return URL
        router.navigate(['/login'], {
          queryParams: { returnUrl },
          queryParamsHandling: 'merge'
        });

        return false;
      }
    })
  );
};