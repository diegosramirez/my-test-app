import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, delay, throwError } from 'rxjs';

import { TypeaheadComponent } from '../../shared/components/typeahead/typeahead.component';
import { SearchResult } from '../../shared/interfaces/search-result.interface';

@Component({
  selector: 'app-typeahead-demo',
  standalone: true,
  imports: [CommonModule, TypeaheadComponent],
  template: `
    <div class="demo-container">
      <h1>Typeahead Search Component Demo</h1>

      <div class="demo-section">
        <h2>Standard Search</h2>
        <p>Search for programming topics, frameworks, or technologies:</p>

        <app-typeahead
          [searchFunction]="searchTechnology"
          [totalResults]="totalTechResults"
          placeholder="Search technologies..."
          (resultSelected)="onTechSelected($event)"
          (searchStarted)="onSearchStarted($event)"
          (searchCompleted)="onSearchCompleted($event)"
          (searchError)="onSearchError($event)"
          (keyboardNavigation)="onKeyboardNav($event)"
        ></app-typeahead>
      </div>

      <div class="demo-section">
        <h2>Error Simulation</h2>
        <p>This search will simulate various error conditions:</p>

        <app-typeahead
          [searchFunction]="searchWithErrors"
          placeholder="Type 'error' to simulate failures..."
          (resultSelected)="onErrorTestSelected($event)"
        ></app-typeahead>
      </div>

      <div class="demo-section">
        <h2>Mobile Optimized</h2>
        <p>This demo shows mobile-optimized behavior (200ms debounce):</p>

        <app-typeahead
          [searchFunction]="searchBooks"
          [debounceTime]="200"
          placeholder="Search books..."
          (resultSelected)="onBookSelected($event)"
        ></app-typeahead>
      </div>

      <div class="results-display" *ngIf="selectedResult">
        <h3>Selected Result:</h3>
        <div class="selected-result">
          <strong>{{ selectedResult.title }}</strong>
          <p>{{ selectedResult.description }}</p>
          <p><em>Selection method: {{ selectionMethod }}</em></p>
          <div *ngIf="selectedResult.metadata" class="metadata">
            <strong>Metadata:</strong>
            <pre>{{ selectedResult.metadata | json }}</pre>
          </div>
        </div>
      </div>

      <div class="analytics-display" *ngIf="analytics.length > 0">
        <h3>Analytics Events:</h3>
        <div class="analytics-list">
          <div *ngFor="let event of analytics; let i = index" class="analytics-item">
            <strong>{{ event.type }}:</strong>
            <pre>{{ event.data | json }}</pre>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./typeahead-demo.component.scss']
})
export class TypeaheadDemoComponent {
  selectedResult: SearchResult | null = null;
  selectionMethod: string = '';
  analytics: { type: string; data: any }[] = [];
  totalTechResults = 50;

  private technologyData: SearchResult[] = [
    { id: '1', title: 'Angular', description: 'A platform for building mobile and desktop web applications', metadata: { category: 'Frontend', popularity: 95 } },
    { id: '2', title: 'TypeScript', description: 'A strongly typed programming language that builds on JavaScript', metadata: { category: 'Language', popularity: 90 } },
    { id: '3', title: 'RxJS', description: 'A library for reactive programming using Observables', metadata: { category: 'Library', popularity: 75 } },
    { id: '4', title: 'JavaScript', description: 'A high-level programming language that conforms to ECMAScript', metadata: { category: 'Language', popularity: 98 } },
    { id: '5', title: 'React', description: 'A JavaScript library for building user interfaces', metadata: { category: 'Frontend', popularity: 92 } },
    { id: '6', title: 'Vue.js', description: 'A progressive framework for building user interfaces', metadata: { category: 'Frontend', popularity: 85 } },
    { id: '7', title: 'Node.js', description: 'A JavaScript runtime built on Chrome\'s V8 JavaScript engine', metadata: { category: 'Backend', popularity: 88 } },
    { id: '8', title: 'Express.js', description: 'Fast, unopinionated, minimalist web framework for Node.js', metadata: { category: 'Backend', popularity: 82 } },
    { id: '9', title: 'MongoDB', description: 'A document database with the scalability and flexibility', metadata: { category: 'Database', popularity: 78 } },
    { id: '10', title: 'PostgreSQL', description: 'A powerful, open source object-relational database system', metadata: { category: 'Database', popularity: 85 } },
    { id: '11', title: 'Docker', description: 'A platform for developing, shipping, and running applications', metadata: { category: 'DevOps', popularity: 87 } },
    { id: '12', title: 'Kubernetes', description: 'An open-source container orchestration platform', metadata: { category: 'DevOps', popularity: 83 } },
    { id: '13', title: 'Python', description: 'An interpreted high-level general-purpose programming language', metadata: { category: 'Language', popularity: 94 } },
    { id: '14', title: 'Django', description: 'A high-level Python web framework', metadata: { category: 'Backend', popularity: 80 } },
    { id: '15', title: 'Flask', description: 'A lightweight WSGI web application framework', metadata: { category: 'Backend', popularity: 75 } }
  ];

  private bookData: SearchResult[] = [
    { id: 'b1', title: 'Clean Code', description: 'A Handbook of Agile Software Craftsmanship by Robert C. Martin', metadata: { author: 'Robert C. Martin', year: 2008 } },
    { id: 'b2', title: 'Design Patterns', description: 'Elements of Reusable Object-Oriented Software', metadata: { author: 'Gang of Four', year: 1994 } },
    { id: 'b3', title: 'Refactoring', description: 'Improving the Design of Existing Code by Martin Fowler', metadata: { author: 'Martin Fowler', year: 1999 } },
    { id: 'b4', title: 'The Pragmatic Programmer', description: 'Your Journey to Mastery by David Thomas', metadata: { author: 'David Thomas', year: 1999 } },
    { id: 'b5', title: 'Code Complete', description: 'A Practical Handbook of Software Construction', metadata: { author: 'Steve McConnell', year: 2004 } }
  ];

  searchTechnology = (query: string): Observable<SearchResult[]> => {
    // Simulate network delay
    return of(this.filterResults(this.technologyData, query)).pipe(
      delay(Math.random() * 300 + 100) // 100-400ms delay
    );
  };

  searchBooks = (query: string): Observable<SearchResult[]> => {
    return of(this.filterResults(this.bookData, query)).pipe(
      delay(Math.random() * 200 + 50) // 50-250ms delay
    );
  };

  searchWithErrors = (query: string): Observable<SearchResult[]> => {
    // Simulate different error conditions
    if (query.toLowerCase().includes('timeout')) {
      return throwError({ name: 'TimeoutError', message: 'Connection timeout' }).pipe(delay(100));
    }

    if (query.toLowerCase().includes('server')) {
      return throwError({ status: 500, message: 'Internal server error' }).pipe(delay(100));
    }

    if (query.toLowerCase().includes('service')) {
      return throwError({ status: 503, message: 'Service unavailable' }).pipe(delay(100));
    }

    if (query.toLowerCase().includes('rate')) {
      return throwError({ status: 429, message: 'Too many requests' }).pipe(delay(100));
    }

    if (query.toLowerCase() === 'error') {
      return throwError({ message: 'Generic error' }).pipe(delay(100));
    }

    // Return normal results for other queries
    return of(this.filterResults([
      { id: 'e1', title: 'Try "timeout", "server", "service", "rate", or "error"', description: 'These will trigger different error conditions' }
    ], query)).pipe(delay(100));
  };

  private filterResults(data: SearchResult[], query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    return data.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results
  }

  onTechSelected(event: { result: SearchResult; selectionMethod: string }): void {
    this.selectedResult = event.result;
    this.selectionMethod = event.selectionMethod;
    this.addAnalytics('result_selected', {
      result_id: event.result.id,
      title: event.result.title,
      method: event.selectionMethod,
      timestamp: new Date().toISOString()
    });
  }

  onBookSelected(event: { result: SearchResult; selectionMethod: string }): void {
    this.selectedResult = event.result;
    this.selectionMethod = event.selectionMethod;
    this.addAnalytics('book_selected', event);
  }

  onErrorTestSelected(event: { result: SearchResult; selectionMethod: string }): void {
    this.selectedResult = event.result;
    this.selectionMethod = event.selectionMethod;
    this.addAnalytics('error_test_selected', event);
  }

  onSearchStarted(event: any): void {
    this.addAnalytics('search_started', event);
  }

  onSearchCompleted(event: any): void {
    this.addAnalytics('search_completed', event);
  }

  onSearchError(event: any): void {
    this.addAnalytics('search_error', event);
  }

  onKeyboardNav(event: any): void {
    this.addAnalytics('keyboard_navigation', event);
  }

  private addAnalytics(type: string, data: any): void {
    this.analytics.unshift({ type, data });
    // Keep only last 10 events
    if (this.analytics.length > 10) {
      this.analytics = this.analytics.slice(0, 10);
    }
  }
}