import { Injectable, inject, signal, computed } from '@angular/core';
import { BudgetCategory } from '../models/budget-category.model';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly txService = inject(TransactionService);

  private readonly categoriesSignal = signal<Omit<BudgetCategory, 'spent'>[]>([
    { id: '1', name: 'Housing', budgeted: 1600 },
    { id: '2', name: 'Food', budgeted: 500 },
    { id: '3', name: 'Utilities', budgeted: 200 },
    { id: '4', name: 'Entertainment', budgeted: 150 },
    { id: '5', name: 'Transportation', budgeted: 300 },
  ]);

  readonly categories = computed<BudgetCategory[]>(() => {
    const txs = this.txService.transactions();
    const spentByCategory = new Map<string, number>();
    for (const tx of txs) {
      if (tx.type === 'expense') {
        spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return this.categoriesSignal().map(c => ({
      ...c,
      spent: spentByCategory.get(c.name) ?? 0,
    }));
  });

  readonly totalBudgeted = computed(() =>
    this.categoriesSignal().reduce((sum, c) => sum + c.budgeted, 0)
  );

  readonly totalSpent = computed(() =>
    this.categories().reduce((sum, c) => sum + c.spent, 0)
  );

  updateCategory(id: string, updates: Partial<Pick<BudgetCategory, 'budgeted'>>): void {
    this.categoriesSignal.update(list =>
      list.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }
}
