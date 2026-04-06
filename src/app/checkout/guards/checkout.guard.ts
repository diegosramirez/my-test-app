import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { CheckoutService } from '../services/checkout.service';
import { CheckoutStep } from '../models/checkout.models';

export const checkoutGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const checkoutService = inject(CheckoutService);
  const router = inject(Router);

  const requestedStep = route.data['step'] as CheckoutStep;

  if (!requestedStep) {
    console.warn('No step specified in route data');
    return router.createUrlTree(['/checkout', CheckoutStep.SHIPPING]);
  }

  // Allow access to shipping step always
  if (requestedStep === CheckoutStep.SHIPPING) {
    return true;
  }

  // Check if user can navigate to the requested step
  if (!checkoutService.canNavigateToStep(requestedStep)) {
    console.warn(`Cannot navigate to step ${requestedStep}. Prerequisites not met.`);

    // Find the first incomplete step and redirect there
    const steps = [CheckoutStep.SHIPPING, CheckoutStep.PAYMENT, CheckoutStep.SUMMARY];
    for (const step of steps) {
      if (!checkoutService.isStepCompleted(step)) {
        return router.createUrlTree(['/checkout', step], {
          queryParams: { error: 'incomplete_prerequisites' }
        });
      }
    }

    // Fallback to shipping if all else fails
    return router.createUrlTree(['/checkout', CheckoutStep.SHIPPING]);
  }

  return true;
};