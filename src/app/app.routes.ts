import { Routes } from '@angular/router';
import { ContactFormComponent } from './components/contact-form/contact-form.component';

export const routes: Routes = [
  {
    path: 'contact',
    component: ContactFormComponent,
    title: 'Contact Us'
  },
  {
    path: '',
    redirectTo: '/contact',
    pathMatch: 'full'
  }
];
