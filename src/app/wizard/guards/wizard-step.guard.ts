import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { FormWizardService } from '../services/form-wizard.service';
import { WizardStep } from '../models/wizard-form-data.interface';

@Injectable({
  providedIn: 'root'
})
export class WizardStepGuard implements CanActivate {

  constructor(
    private formWizardService: FormWizardService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const requestedStep = route.params['step'] as WizardStep;

    // Validate that the step parameter is valid
    if (!Object.values(WizardStep).includes(requestedStep)) {
      this.router.navigate(['/form-wizard/personal']);
      return false;
    }

    // Check if the user can access the requested step
    if (!this.formWizardService.canAccessStep(requestedStep)) {
      // Redirect to the appropriate step based on current progress
      const redirectStep = this.getAppropriateStep();
      this.router.navigate([`/form-wizard/${redirectStep}`]);
      return false;
    }

    return true;
  }

  private getAppropriateStep(): WizardStep {
    // Start from the beginning and find the first incomplete step
    if (!this.formWizardService.isStepValid(WizardStep.PERSONAL)) {
      return WizardStep.PERSONAL;
    }

    if (!this.formWizardService.isStepValid(WizardStep.ADDRESS)) {
      return WizardStep.ADDRESS;
    }

    // If both personal and address are valid, user can go to review
    return WizardStep.REVIEW;
  }
}