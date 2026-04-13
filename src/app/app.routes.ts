import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/upcoming-fixtures', pathMatch: 'full' },
  {
    path: 'upcoming-fixtures',
    loadComponent: () => import('./components/upcoming-fixtures/upcoming-fixtures.component').then(m => m.UpcomingFixturesComponent)
  },
];
