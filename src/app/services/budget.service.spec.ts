import { TestBed } from '@angular/core/testing';
import { BudgetService } from './budget.service';
import { TransactionService } from './transaction.service';

describe('BudgetService', () => {
  let service: BudgetService;
  let txService: TransactionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BudgetService);
    txService = TestBed.inject(TransactionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have 5 seed categories', () => {
    expect(service.categories().length).toBe(5);
  });

  it('should compute totalBudgeted', () => {
    // 1600+500+200+150+300
    expect(service.totalBudgeted()).toBe(2750);
  });

  it('should compute totalSpent from transactions', () => {
    // Seed transactions: Housing=1500, Food=320, Utilities=95
    expect(service.totalSpent()).toBe(1915);
  });

  it('should compute spent per category from transactions', () => {
    const housing = service.categories().find(c => c.name === 'Housing');
    expect(housing!.spent).toBe(1500);
    const food = service.categories().find(c => c.name === 'Food');
    expect(food!.spent).toBe(320);
    const utils = service.categories().find(c => c.name === 'Utilities');
    expect(utils!.spent).toBe(95);
    const entertainment = service.categories().find(c => c.name === 'Entertainment');
    expect(entertainment!.spent).toBe(0);
  });

  it('should update a category budgeted amount', () => {
    service.updateCategory('1', { budgeted: 2000 });
    const cat = service.categories().find(c => c.id === '1');
    expect(cat!.budgeted).toBe(2000);
    expect(cat!.spent).toBe(1500); // still from transactions
  });

  it('should update computed totals after category update', () => {
    service.updateCategory('4', { budgeted: 250 });
    expect(service.totalBudgeted()).toBe(2850);
  });

  it('should not modify other categories on update', () => {
    service.updateCategory('1', { budgeted: 9999 });
    const other = service.categories().find(c => c.id === '2');
    expect(other!.budgeted).toBe(500);
  });

  it('should handle updating non-existent category gracefully', () => {
    service.updateCategory('nonexistent', { budgeted: 100 });
    expect(service.categories().length).toBe(5);
    expect(service.totalBudgeted()).toBe(2750);
  });

  it('should reflect new transactions in spent amounts', () => {
    txService.addTransaction({
      description: 'Movie',
      amount: 50,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-03-15',
    });
    const entertainment = service.categories().find(c => c.name === 'Entertainment');
    expect(entertainment!.spent).toBe(50);
    expect(service.totalSpent()).toBe(1965);
  });

  it('should reflect deleted transactions in spent amounts', () => {
    // Delete the rent transaction (id '2', Housing, 1500)
    txService.deleteTransaction('2');
    const housing = service.categories().find(c => c.name === 'Housing');
    expect(housing!.spent).toBe(0);
    expect(service.totalSpent()).toBe(415);
  });
});
