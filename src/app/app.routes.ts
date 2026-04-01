import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  // Wildcard intentionally redirects to 'dashboard'. The authGuard on /dashboard will cascade
  // unauthenticated users to /login?returnUrl=/dashboard, preventing unguarded access to any typo URL.
  { path: '**', redirectTo: 'dashboard' }
];
