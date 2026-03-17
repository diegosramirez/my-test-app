import { TestBed } from '@angular/core/testing';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have seed transactions', () => {
    expect(service.transactions().length).toBe(5);
  });

  it('should compute totalIncome from income transactions', () => {
    // Salary 5000 + Freelance 1200
    expect(service.totalIncome()).toBe(6200);
  });

  it('should compute totalExpenses from expense transactions', () => {
    // Rent 1500 + Groceries 320 + Electric 95
    expect(service.totalExpenses()).toBe(1915);
  });

  it('should compute balance as income minus expenses', () => {
    expect(service.balance()).toBe(6200 - 1915);
  });

  it('should add a transaction', () => {
    service.addTransaction({
      description: 'Test',
      amount: 100,
      type: 'income',
      category: 'Test',
      date: '2026-03-15',
    });
    expect(service.transactions().length).toBe(6);
    const added = service.transactions().find(t => t.description === 'Test');
    expect(added).toBeTruthy();
    expect(added!.id).toBeTruthy();
  });

  it('should update computed values after adding income', () => {
    service.addTransaction({
      description: 'Bonus',
      amount: 500,
      type: 'income',
      category: 'Employment',
      date: '2026-03-15',
    });
    expect(service.totalIncome()).toBe(6700);
    expect(service.balance()).toBe(6700 - 1915);
  });

  it('should update computed values after adding expense', () => {
    service.addTransaction({
      description: 'Coffee',
      amount: 5,
      type: 'expense',
      category: 'Food',
      date: '2026-03-15',
    });
    expect(service.totalExpenses()).toBe(1920);
  });

  it('should delete a transaction by id', () => {
    service.deleteTransaction('1');
    expect(service.transactions().length).toBe(4);
    expect(service.transactions().find(t => t.id === '1')).toBeUndefined();
  });

  it('should update totals after deletion', () => {
    service.deleteTransaction('1'); // remove Salary 5000
    expect(service.totalIncome()).toBe(1200);
    expect(service.balance()).toBe(1200 - 1915);
  });

  it('should handle deleting non-existent id gracefully', () => {
    service.deleteTransaction('nonexistent');
    expect(service.transactions().length).toBe(5);
  });

  it('should generate unique ids for added transactions', () => {
    service.addTransaction({ description: 'A', amount: 1, type: 'income', category: 'X', date: '2026-01-01' });
    service.addTransaction({ description: 'B', amount: 2, type: 'income', category: 'X', date: '2026-01-01' });
    const ids = service.transactions().map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
