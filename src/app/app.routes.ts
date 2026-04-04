import { Routes } from '@angular/router';
import { CounterComponent } from './components/counter/counter.component';

export const routes: Routes = [
  { path: '', component: CounterComponent },
  { path: 'counter', component: CounterComponent },
  { path: '**', redirectTo: '' }
];
