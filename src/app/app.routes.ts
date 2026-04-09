import { Routes } from '@angular/router';
import { TemplateManagerComponent } from './components/template-manager/template-manager.component';

export const routes: Routes = [
  { path: '', redirectTo: '/templates', pathMatch: 'full' },
  { path: 'templates', component: TemplateManagerComponent },
  { path: '**', redirectTo: '/templates' }
];
