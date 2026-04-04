import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TypeaheadSearchComponent } from './shared/components/typeahead-search/typeahead-search.component';
import { SearchResult } from './shared/models/search.models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TypeaheadSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Typeahead Search Demo');

  onResultSelected(result: SearchResult): void {
    console.log('Selected result:', result);
    alert(`You selected: ${result.title}`);
  }

  onQueryChanged(query: string): void {
    console.log('Query changed:', query);
  }
}
