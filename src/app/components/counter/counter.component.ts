import { Component, inject } from '@angular/core';
import { CounterService } from '../../services/counter.service';

@Component({
  selector: 'app-counter',
  standalone: true,
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  protected readonly service = inject(CounterService);
}
