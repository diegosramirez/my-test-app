import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'qr-generator',
    loadComponent: () => import('./qr-generator.component').then(m => m.QrGeneratorComponent)
  },
  {
    path: '',
    redirectTo: '/qr-generator',
    pathMatch: 'full'
  }
];
