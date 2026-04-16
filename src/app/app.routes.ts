import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AnnouncementsComponent } from './components/announcements/announcements.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'announcements', component: AnnouncementsComponent },
  { path: '', redirectTo: '/announcements', pathMatch: 'full' },
  { path: '**', redirectTo: '/announcements' }
];
