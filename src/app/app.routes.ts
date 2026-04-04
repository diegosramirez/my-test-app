import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/typeahead-demo',
    pathMatch: 'full'
  },
  {
    path: 'typeahead-demo',
    loadComponent: () => import('./demo/typeahead-demo/typeahead-demo.component').then(m => m.TypeaheadDemoComponent)
  }
];
