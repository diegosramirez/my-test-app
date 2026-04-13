import { Routes } from '@angular/router';
import { WizardContainerComponent } from './wizard/components/wizard-container/wizard-container.component';
import { PersonalInfoStepComponent } from './wizard/components/personal-info-step/personal-info-step.component';
import { AddressInfoStepComponent } from './wizard/components/address-info-step/address-info-step.component';
import { ReviewStepComponent } from './wizard/components/review-step/review-step.component';
import { WizardStepGuard } from './wizard/guards/wizard-step.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/form-wizard/personal',
    pathMatch: 'full'
  },
  {
    path: 'form-wizard',
    component: WizardContainerComponent,
    children: [
      {
        path: '',
        redirectTo: 'personal',
        pathMatch: 'full'
      },
      {
        path: 'personal',
        component: PersonalInfoStepComponent,
        canActivate: [WizardStepGuard]
      },
      {
        path: 'address',
        component: AddressInfoStepComponent,
        canActivate: [WizardStepGuard]
      },
      {
        path: 'review',
        component: ReviewStepComponent,
        canActivate: [WizardStepGuard]
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/form-wizard/personal'
  }
];
