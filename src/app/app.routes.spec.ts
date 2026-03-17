import { routes } from './app.routes';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { TransactionsPageComponent } from './pages/transactions/transactions-page.component';
import { BudgetPageComponent } from './pages/budget/budget-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';

describe('App Routes', () => {
  it('should have 5 routes defined', () => {
    expect(routes.length).toBe(5);
  });

  it('should map empty path to DashboardPageComponent', () => {
    const route = routes.find(r => r.path === '');
    expect(route).toBeTruthy();
    expect(route!.component).toBe(DashboardPageComponent);
  });

  it('should map "transactions" to TransactionsPageComponent', () => {
    const route = routes.find(r => r.path === 'transactions');
    expect(route).toBeTruthy();
    expect(route!.component).toBe(TransactionsPageComponent);
  });

  it('should map "budget" to BudgetPageComponent', () => {
    const route = routes.find(r => r.path === 'budget');
    expect(route).toBeTruthy();
    expect(route!.component).toBe(BudgetPageComponent);
  });

  it('should map "settings" to SettingsPageComponent', () => {
    const route = routes.find(r => r.path === 'settings');
    expect(route).toBeTruthy();
    expect(route!.component).toBe(SettingsPageComponent);
  });

  it('should have a wildcard route that redirects to empty path', () => {
    const wildcard = routes.find(r => r.path === '**');
    expect(wildcard).toBeTruthy();
    expect(wildcard!.redirectTo).toBe('');
  });

  it('wildcard should be the last route', () => {
    const last = routes[routes.length - 1];
    expect(last.path).toBe('**');
  });

  it('should not have duplicate paths', () => {
    const paths = routes.map(r => r.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});
