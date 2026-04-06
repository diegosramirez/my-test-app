import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/demo',
    pathMatch: 'full'
  },
  {
    path: 'demo',
    loadComponent: () => import('./demo/demo.component').then(c => c.DemoComponent)
  }
];
