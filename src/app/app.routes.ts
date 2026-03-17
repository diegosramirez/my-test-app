import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { TransactionsPageComponent } from './pages/transactions/transactions-page.component';
import { BudgetPageComponent } from './pages/budget/budget-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';

export const routes: Routes = [
  { path: '', component: DashboardPageComponent },
  { path: 'transactions', component: TransactionsPageComponent },
  { path: 'budget', component: BudgetPageComponent },
  { path: 'settings', component: SettingsPageComponent },
  { path: '**', redirectTo: '' },
];
