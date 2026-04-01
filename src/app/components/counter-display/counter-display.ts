import { Component, inject } from '@angular/core';
import { CounterService } from '../../services/counter.service';

@Component({
  selector: 'app-counter-display',
  standalone: true,
  template: `
    <div class="counter-display">
      <div class="counter-value" aria-live="polite" data-testid="counter-value">
        {{ counterService.counter() }}
      </div>
      <div class="button-row">
        <button
          class="btn btn-primary"
          data-testid="increment-btn"
          (click)="counterService.increment()"
        >+1</button>
        <button
          class="btn btn-primary"
          data-testid="decrement-btn"
          (click)="counterService.decrement()"
        >&minus;1</button>
        <button
          class="btn btn-reset"
          data-testid="reset-btn"
          (click)="counterService.reset()"
        >Reset</button>
      </div>
    </div>
  `,
  styles: [`
    .counter-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .counter-value {
      font-size: 3rem;
      font-weight: 700;
      color: #1a1a2e;
      min-width: 200px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }
    .button-row {
      display: flex;
      gap: 0.75rem;
    }
    .btn {
      min-width: 44px;
      min-height: 44px;
      padding: 0.5rem 1.25rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: background-color 0.15s, transform 0.1s;
    }
    .btn:active {
      transform: scale(0.95);
    }
    .btn-primary {
      background-color: #4361ee;
      color: #ffffff;
      border-color: #4361ee;
    }
    .btn-primary:active {
      background-color: #3a56d4;
    }
    .btn-reset {
      background-color: transparent;
      color: #555;
      border: 2px solid #999;
    }
    .btn-reset:active {
      background-color: #e0e0e0;
    }
  `]
})
export class CounterDisplayComponent {
  protected readonly counterService = inject(CounterService);
}
