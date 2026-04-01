import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { trackEvent } from '../../shared/utils/analytics';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  trackEvent('auth_guard_redirect', { targetRoute: state.url });
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
