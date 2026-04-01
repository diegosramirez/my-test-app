import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login-page';
import { RegisterPage } from './pages/register/register-page';
import { TasksPage } from './pages/tasks/tasks-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'tasks', component: TasksPage }, // TODO: add authGuard — see auth story
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Wildcard must remain the last entry in this array
  { path: '**', redirectTo: 'login' }
];
