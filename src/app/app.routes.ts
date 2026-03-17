import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/user-settings/user-settings.component').then(
        m => m.UserSettingsComponent
      )
  }
];
