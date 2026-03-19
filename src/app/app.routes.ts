import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'countries', pathMatch: 'full' },
  {
    path: 'countries',
    loadComponent: () =>
      import('./features/countries/countries.component').then(
        (m) => m.CountriesComponent
      ),
  },
];
