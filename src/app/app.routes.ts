import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/profile',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/profile'
  }
];
