import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'counter',
    loadComponent: () => import('./counter/counter.component').then(c => c.CounterComponent)
  },
  {
    path: '',
    redirectTo: '/counter',
    pathMatch: 'full'
  }
];
