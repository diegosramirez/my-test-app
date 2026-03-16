import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'calculator',
    loadComponent: () =>
      import('./calculator/calculator.component').then(m => m.CalculatorComponent),
  },
];
