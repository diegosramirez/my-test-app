import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpcomingFixturesComponent } from './components/upcoming-fixtures/upcoming-fixtures.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpcomingFixturesComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Premier League Predictions');
}
