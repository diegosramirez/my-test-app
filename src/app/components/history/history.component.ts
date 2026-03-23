import { Component, computed, inject } from '@angular/core';
import { CounterService } from '../../services/counter.service';

@Component({
  selector: 'app-history',
  standalone: true,
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
  protected readonly service = inject(CounterService);
  protected readonly reversedHistory = computed(() => [...this.service.history()].reverse());

  protected formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
