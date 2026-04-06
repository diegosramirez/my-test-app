import { Routes } from '@angular/router';
import { ToggleDemoComponent } from './pages/toggle-demo/toggle-demo.component';

export const routes: Routes = [
  { path: '', component: ToggleDemoComponent },
  { path: 'demo', component: ToggleDemoComponent },
  { path: '**', redirectTo: '' }
];
