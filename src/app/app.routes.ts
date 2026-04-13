import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/fixtures',
    pathMatch: 'full'
  },
  {
    path: 'fixtures',
    loadComponent: () => import('./components/upcoming-fixtures/upcoming-fixtures.component').then(m => m.UpcomingFixturesComponent)
  }
];
