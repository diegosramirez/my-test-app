import { Routes } from '@angular/router';
import { CounterPageComponent } from './components/counter-page/counter-page';

export const routes: Routes = [
  { path: '', component: CounterPageComponent },
  { path: '**', redirectTo: '' },
];
