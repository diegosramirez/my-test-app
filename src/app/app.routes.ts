import { Routes } from '@angular/router';
import { StopwatchComponent } from './stopwatch/stopwatch.component';

export const routes: Routes = [
  { path: '', component: StopwatchComponent },
  { path: 'stopwatch', component: StopwatchComponent },
  { path: '**', redirectTo: '' }
];
