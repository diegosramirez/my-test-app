import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { CheckoutService } from '../services/checkout.service';

@Injectable({
  providedIn: 'root'
})
export class CheckoutStepGuard implements CanActivate {
  private checkoutService = inject(CheckoutService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const requestedStep = parseInt(route.queryParams['step']) || 1;
    const steps = this.checkoutService.steps();

    // Always allow access to step 1
    if (requestedStep === 1) {
      return true;
    }

    // For steps 2 and 3, check if previous steps are completed and valid
    for (let i = 0; i < requestedStep - 1; i++) {
      const step = steps[i];
      if (!step.completed || !step.valid) {
        // Redirect to the first incomplete step
        this.router.navigate(['/checkout'], {
          queryParams: { step: i + 1 },
          queryParamsHandling: 'replace'
        });
        return false;
      }
    }

    return true;
  }
}