import { Routes } from '@angular/router';
import { RegisterComponent } from './components/register.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/register',
    pathMatch: 'full'
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'dashboard',
    redirectTo: '/register', // Temporary redirect - dashboard component will be created later
    pathMatch: 'full'
  },
  {
    path: 'login',
    redirectTo: '/register', // Temporary redirect - login component will be created later
    pathMatch: 'full'
  },
  {
    path: 'terms',
    redirectTo: '/register', // Temporary redirect - terms page will be created later
    pathMatch: 'full'
  },
  {
    path: 'privacy',
    redirectTo: '/register', // Temporary redirect - privacy page will be created later
    pathMatch: 'full'
  }
];
