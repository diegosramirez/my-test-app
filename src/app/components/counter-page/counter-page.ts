import { Component, inject } from '@angular/core';
import { CounterDisplayComponent } from '../counter-display/counter-display';
import { HistoryListComponent } from '../history-list/history-list';
import { CounterService } from '../../services/counter.service';

@Component({
  selector: 'app-counter-page',
  standalone: true,
  imports: [CounterDisplayComponent, HistoryListComponent],
  template: `
    <div class="page-card">
      <app-counter-display />
      <app-history-list />
      <div class="action-count" aria-live="polite">
        Total actions: {{ counterService.actionCount() }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 2rem 1rem;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .page-card {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      background: #fff;
    }
    .action-count {
      text-align: center;
      color: #555;
      font-size: 0.95rem;
    }
  `]
})
export class CounterPageComponent {
  protected readonly counterService = inject(CounterService);
}
