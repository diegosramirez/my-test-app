import { Routes } from '@angular/router';
import { ContactFormComponent } from './contact/contact-form.component';

export const routes: Routes = [
  { path: 'contact', component: ContactFormComponent },
  { path: '', redirectTo: '/contact', pathMatch: 'full' }
];
