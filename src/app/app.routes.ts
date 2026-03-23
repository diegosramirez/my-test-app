import { Routes } from '@angular/router';
import { CounterComponent } from './features/counter/counter.component';

export const routes: Routes = [
  { path: '', component: CounterComponent },
  { path: '**', redirectTo: '' }
];
