import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CountryListComponent } from './components/country-list/country-list.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CountryListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('World Cup Predictor');
}
