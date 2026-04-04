import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TypeaheadSearchComponent } from './typeahead-search.component';
import { SearchResult } from './search-result.interface';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TypeaheadSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-test-app');

  onResultSelected(result: SearchResult) {
    console.log('Selected result:', result);
  }
}
