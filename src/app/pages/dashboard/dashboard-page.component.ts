import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Dashboard</h1>
    <div class="summary-cards">
      <div class="card card-balance">
        <h2>Balance</h2>
        <p class="amount" data-testid="balance">{{ txService.balance() | currency }}</p>
      </div>
      <div class="card card-income">
        <h2>Income</h2>
        <p class="amount" data-testid="income">{{ txService.totalIncome() | currency }}</p>
      </div>
      <div class="card card-expenses">
        <h2>Expenses</h2>
        <p class="amount" data-testid="expenses">{{ txService.totalExpenses() | currency }}</p>
      </div>
      <div class="card card-budget">
        <h2>Budget Used</h2>
        <p class="amount" data-testid="budget-used">{{ budgetService.totalSpent() | currency }} / {{ budgetService.totalBudgeted() | currency }}</p>
      </div>
    </div>
    <section class="recent-transactions">
      <h2>Recent Transactions</h2>
      <ul class="transaction-list">
        @for (tx of txService.transactions().slice(0, 5); track tx.id) {
          <li [class]="tx.type">
            <span class="tx-desc">{{ tx.description }}</span>
            <span class="tx-amount">{{ tx.type === 'expense' ? '-' : '+' }}{{ tx.amount | currency }}</span>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    :host { display: block; padding: 1rem; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { padding: 1rem; border-radius: 8px; background: #f8f9fa; border: 1px solid #e9ecef; }
    .card h2 { margin: 0 0 0.5rem; font-size: 0.875rem; color: #6c757d; text-transform: uppercase; }
    .amount { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .card-income .amount { color: #28a745; }
    .card-expenses .amount { color: #dc3545; }
    .recent-transactions h2 { margin-bottom: 1rem; }
    .transaction-list { list-style: none; padding: 0; }
    .transaction-list li { display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #e9ecef; }
    .transaction-list li.income .tx-amount { color: #28a745; }
    .transaction-list li.expense .tx-amount { color: #dc3545; }
  `],
})
export class DashboardPageComponent {
  protected readonly txService = inject(TransactionService);
  protected readonly budgetService = inject(BudgetService);
}
