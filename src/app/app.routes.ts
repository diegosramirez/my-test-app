import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { JournalListComponent } from './journal/journal-list.component';
import { JournalFormComponent } from './journal/journal-form.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/journal', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'journal', component: JournalListComponent, canActivate: [AuthGuard] },
  { path: 'journal/new', component: JournalFormComponent, canActivate: [AuthGuard] },
  { path: 'journal/edit/:id', component: JournalFormComponent, canActivate: [AuthGuard] }
];
