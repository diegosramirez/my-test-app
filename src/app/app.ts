import { Component } from '@angular/core';
import { CounterComponent } from './components/counter/counter.component';
import { HistoryComponent } from './components/history/history.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CounterComponent, HistoryComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
