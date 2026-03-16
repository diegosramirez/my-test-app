import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact-form/contact-form.component').then(m => m.ContactFormComponent),
  },
];
