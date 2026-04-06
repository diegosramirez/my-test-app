import { Routes } from '@angular/router';
import { CheckoutComponent } from './checkout/checkout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/checkout', pathMatch: 'full' },
  { path: 'checkout', component: CheckoutComponent },
  { path: '**', redirectTo: '/checkout' }
];
