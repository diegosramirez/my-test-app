import { Injectable, signal, computed } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly transactionsSignal = signal<Transaction[]>([
    { id: '1', description: 'Salary', amount: 5000, type: 'income', category: 'Employment', date: '2026-03-01' },
    { id: '2', description: 'Rent', amount: 1500, type: 'expense', category: 'Housing', date: '2026-03-02' },
    { id: '3', description: 'Groceries', amount: 320, type: 'expense', category: 'Food', date: '2026-03-05' },
    { id: '4', description: 'Freelance Project', amount: 1200, type: 'income', category: 'Freelance', date: '2026-03-10' },
    { id: '5', description: 'Electric Bill', amount: 95, type: 'expense', category: 'Utilities', date: '2026-03-12' },
  ]);

  readonly transactions = this.transactionsSignal.asReadonly();

  readonly totalIncome = computed(() =>
    this.transactionsSignal().filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this.transactionsSignal().filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpenses());

  addTransaction(transaction: Omit<Transaction, 'id'>): void {
    const id = crypto.randomUUID();
    this.transactionsSignal.update(list => [...list, { ...transaction, id }]);
  }

  deleteTransaction(id: string): void {
    this.transactionsSignal.update(list => list.filter(t => t.id !== id));
  }
}
