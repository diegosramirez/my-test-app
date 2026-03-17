import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Transactions</h1>
    <form class="add-form" (ngSubmit)="onAdd()" #txForm="ngForm">
      <input name="description" [(ngModel)]="newDescription" placeholder="Description" required aria-label="Description" />
      <input name="amount" [(ngModel)]="newAmount" type="number" placeholder="Amount" required min="0.01" step="0.01" aria-label="Amount" />
      <select name="type" [(ngModel)]="newType" aria-label="Type">
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <input name="category" [(ngModel)]="newCategory" placeholder="Category" required aria-label="Category" />
      <button type="submit" [disabled]="!txForm.valid">Add</button>
    </form>
    <table class="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (tx of txService.transactions(); track tx.id) {
          <tr [class]="tx.type">
            <td>{{ tx.date }}</td>
            <td>{{ tx.description }}</td>
            <td>{{ tx.category }}</td>
            <td class="amount">{{ tx.type === 'expense' ? '-' : '+' }}{{ tx.amount | currency }}</td>
            <td><button class="delete-btn" (click)="txService.deleteTransaction(tx.id)" aria-label="Delete {{ tx.description }}">Delete</button></td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    :host { display: block; padding: 1rem; }
    .add-form { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .add-form input, .add-form select { padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; }
    .add-form button { padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .add-form button:disabled { opacity: 0.5; cursor: not-allowed; }
    .transactions-table { width: 100%; border-collapse: collapse; }
    .transactions-table th, .transactions-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e9ecef; }
    .transactions-table th { font-weight: 600; color: #6c757d; }
    tr.income .amount { color: #28a745; }
    tr.expense .amount { color: #dc3545; }
    .delete-btn { background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; }
  `],
})
export class TransactionsPageComponent {
  readonly txService = inject(TransactionService);

  newDescription = '';
  newAmount: number | null = null;
  newType: 'income' | 'expense' = 'expense';
  newCategory = '';

  onAdd(): void {
    if (!this.newDescription || !this.newAmount || !this.newCategory) return;
    this.txService.addTransaction({
      description: this.newDescription,
      amount: this.newAmount,
      type: this.newType,
      category: this.newCategory,
      date: new Date().toISOString().slice(0, 10),
    });
    this.newDescription = '';
    this.newAmount = null;
    this.newCategory = '';
  }
}
