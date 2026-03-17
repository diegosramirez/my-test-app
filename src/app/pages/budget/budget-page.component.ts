import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-budget-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Budget</h1>
    <div class="budget-summary">
      <p>Total Budgeted: <strong data-testid="total-budgeted">{{ budgetService.totalBudgeted() | currency }}</strong></p>
      <p>Total Spent: <strong data-testid="total-spent">{{ budgetService.totalSpent() | currency }}</strong></p>
    </div>
    <div class="category-list">
      @for (cat of budgetService.categories(); track cat.id) {
        <div class="budget-card">
          <div class="budget-header">
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-amounts">{{ cat.spent | currency }} / {{ cat.budgeted | currency }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="cat.budgeted > 0 ? mathMin((cat.spent / cat.budgeted) * 100, 100) : 0"
              [class.over-budget]="cat.spent > cat.budgeted"
            ></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; padding: 1rem; }
    .budget-summary { margin-bottom: 1.5rem; }
    .budget-summary p { margin: 0.25rem 0; }
    .category-list { display: flex; flex-direction: column; gap: 1rem; }
    .budget-card { padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
    .budget-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .cat-name { font-weight: 600; }
    .cat-amounts { color: #6c757d; }
    .progress-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #28a745; border-radius: 4px; transition: width 0.3s; }
    .progress-fill.over-budget { background: #dc3545; }
  `],
})
export class BudgetPageComponent {
  readonly budgetService = inject(BudgetService);

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
