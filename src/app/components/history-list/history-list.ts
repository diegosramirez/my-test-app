import { Component, computed, inject } from '@angular/core';
import { CounterService } from '../../services/counter.service';

@Component({
  selector: 'app-history-list',
  standalone: true,
  template: `
    <div class="history-container">
      @if (reversedHistory().length === 0) {
        <p class="placeholder">No actions yet</p>
      } @else {
        <ul class="history-list">
          @for (item of reversedHistory(); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .history-container {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 0.75rem;
      min-height: 60px;
      background: #fafafa;
    }
    .placeholder {
      color: #888;
      text-align: center;
      margin: 0;
      padding: 0.5rem 0;
    }
    .history-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .history-list li {
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid #eee;
      color: #333;
      font-size: 0.95rem;
    }
    .history-list li:last-child {
      border-bottom: none;
    }
  `]
})
export class HistoryListComponent {
  private readonly counterService = inject(CounterService);
  protected readonly reversedHistory = computed(() =>
    [...this.counterService.history()].reverse()
  );
}
