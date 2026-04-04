import { Routes } from '@angular/router';
import { TypeaheadDemoComponent } from './demo/typeahead-demo.component';

export const routes: Routes = [
  { path: '', redirectTo: '/demo', pathMatch: 'full' },
  { path: 'demo', component: TypeaheadDemoComponent },
  { path: '**', redirectTo: '/demo' }
];
