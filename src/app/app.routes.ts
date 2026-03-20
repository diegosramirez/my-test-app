import { Routes } from '@angular/router';
import { NewsletterComponent } from './features/newsletter/newsletter.component';

export const routes: Routes = [
  { path: 'newsletter', component: NewsletterComponent },
  { path: '', redirectTo: 'newsletter', pathMatch: 'full' },
];
