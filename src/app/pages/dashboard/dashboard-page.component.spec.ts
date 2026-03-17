import { TestBed } from '@angular/core/testing';
import { DashboardPageComponent } from './dashboard-page.component';
import { TransactionService } from '../../services/transaction.service';
import { BudgetService } from '../../services/budget.service';

describe('DashboardPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be standalone', () => {
    expect((DashboardPageComponent as any).ɵcmp.standalone).toBe(true);
  });

  it('should render h1 with "Dashboard"', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Dashboard');
  });

  it('should display summary cards', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(4);
  });

  it('should display balance from TransactionService', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const balance = fixture.nativeElement.querySelector('[data-testid="balance"]');
    expect(balance).toBeTruthy();
    expect(balance.textContent).toBeTruthy();
  });

  it('should display income total', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const income = fixture.nativeElement.querySelector('[data-testid="income"]');
    expect(income).toBeTruthy();
    expect(income.textContent).toContain('$');
  });

  it('should display expenses total', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const expenses = fixture.nativeElement.querySelector('[data-testid="expenses"]');
    expect(expenses).toBeTruthy();
    expect(expenses.textContent).toContain('$');
  });

  it('should display recent transactions section', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('.recent-transactions');
    expect(section).toBeTruthy();
    expect(section.querySelector('h2').textContent).toContain('Recent Transactions');
  });

  it('should display transaction list items', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.transaction-list li');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('should inject TransactionService', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    expect((fixture.componentInstance as any).txService).toBeInstanceOf(TransactionService);
  });

  it('should inject BudgetService', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    expect((fixture.componentInstance as any).budgetService).toBeInstanceOf(BudgetService);
  });

  it('should show budget used info', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const budgetUsed = fixture.nativeElement.querySelector('[data-testid="budget-used"]');
    expect(budgetUsed).toBeTruthy();
    expect(budgetUsed.textContent).toContain('/');
  });
});
