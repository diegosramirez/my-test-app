import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'qr-generator',
    loadComponent: () => import('./components/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent)
  },
  {
    path: '',
    redirectTo: '/qr-generator',
    pathMatch: 'full'
  }
];
