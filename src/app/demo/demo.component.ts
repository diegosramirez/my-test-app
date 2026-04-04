import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';

import { TypeaheadSearchComponent, SearchEvent, SelectionEvent } from '../shared/components/typeahead-search/typeahead-search.component';
import { SearchResult, SearchResponse } from '../shared/interfaces/search-result.interface';
import { SearchService } from '../shared/services/search.service';
import { HighlightPipe } from '../shared/pipes/highlight.pipe';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TypeaheadSearchComponent,
    HighlightPipe
  ],
  template: `
    <div class="demo-container">
      <h1>Typeahead Search Component Demo</h1>
      <p>This demo showcases the typeahead search component with debouncing, cancellation, error handling, and accessibility features.</p>

      <!-- User Search Section -->
      <section class="demo-section">
        <h2>User Search</h2>
        <p>Search for users by name. Demonstrates basic typeahead functionality with highlighting.</p>

        <app-typeahead-search
          [searchFunction]="userSearchFn"
          [placeholder]="'Search users...'"
          [minQueryLength]="2"
          [debounceMs]="300"
          (search)="onUserSearch($event)"
          (select)="onUserSelect($event)"
          (error)="onSearchError($event)"
        ></app-typeahead-search>

        <div *ngIf="selectedUser" class="selection-display">
          <h3>Selected User:</h3>
          <div class="user-card">
            <strong>{{ selectedUser.name }}</strong><br>
            <span class="email">{{ selectedUser.email }}</span><br>
            <span class="department">{{ selectedUser.department }}</span>
          </div>
        </div>
      </section>

      <!-- Product Search with Custom Template -->
      <section class="demo-section">
        <h2>Product Search with Custom Template</h2>
        <p>Search for products with custom result template showing price and category.</p>

        <app-typeahead-search
          [searchFunction]="productSearchFn"
          [placeholder]="'Search products...'"
          [minQueryLength]="1"
          [debounceMs]="300"
          [maxResults]="10"
          (search)="onProductSearch($event)"
          (select)="onProductSelect($event)"
          (error)="onSearchError($event)"
        >
          <ng-template #resultTemplate let-result let-query="query" let-index="index">
            <div class="product-result">
              <div class="product-info">
                <div class="product-name" [innerHTML]="result.displayValue | highlight : query : 'highlight'"></div>
                <div class="product-details">
                  <span class="category">{{ result.data.category }}</span>
                  <span class="price">\${{ result.data.price.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </ng-template>
        </app-typeahead-search>

        <div *ngIf="selectedProduct" class="selection-display">
          <h3>Selected Product:</h3>
          <div class="product-card">
            <strong>{{ selectedProduct.name }}</strong><br>
            <span class="category">Category: {{ selectedProduct.category }}</span><br>
            <span class="price">Price: \${{ selectedProduct.price.toFixed(2) }}</span>
          </div>
        </div>
      </section>

      <!-- Form Integration -->
      <section class="demo-section">
        <h2>Form Integration</h2>
        <p>Demonstrates integration with Angular reactive forms using ControlValueAccessor.</p>

        <form [formGroup]="demoForm" class="demo-form">
          <div class="form-group">
            <label for="selectedUser">Selected User:</label>
            <app-typeahead-search
              id="selectedUser"
              formControlName="selectedUser"
              [searchFunction]="userSearchFn"
              [placeholder]="'Choose a user...'"
              [clearOnSelect]="false"
            ></app-typeahead-search>
          </div>

          <div class="form-group">
            <label for="selectedProduct">Selected Product:</label>
            <app-typeahead-search
              id="selectedProduct"
              formControlName="selectedProduct"
              [searchFunction]="productSearchFn"
              [placeholder]="'Choose a product...'"
              [clearOnSelect]="false"
            ></app-typeahead-search>
          </div>

          <div class="form-values">
            <h3>Form Values:</h3>
            <pre>{{ demoForm.value | json }}</pre>
          </div>
        </form>
      </section>

      <!-- Error Simulation -->
      <section class="demo-section">
        <h2>Error Handling Demo</h2>
        <p>This search will simulate network errors to demonstrate error handling and retry functionality.</p>

        <app-typeahead-search
          [searchFunction]="errorSearchFn"
          [placeholder]="'Type anything to trigger errors...'"
          [minQueryLength]="1"
          (search)="onErrorDemo($event)"
          (error)="onSearchError($event)"
        ></app-typeahead-search>
      </section>

      <!-- Event Log -->
      <section class="demo-section">
        <h2>Event Log</h2>
        <p>Monitor search events, selections, and errors in real-time.</p>

        <div class="event-log">
          <button (click)="clearLog()" class="clear-button">Clear Log</button>
          <div class="log-entries">
            <div *ngFor="let event of eventLog; trackBy: trackByIndex" class="log-entry" [ngClass]="event.type">
              <span class="timestamp">{{ event.timestamp | date:'HH:mm:ss.SSS' }}</span>
              <span class="event-type">{{ event.type }}</span>
              <span class="event-data">{{ event.data }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Performance Metrics -->
      <section class="demo-section">
        <h2>Performance Metrics</h2>
        <div class="metrics">
          <div class="metric">
            <strong>Total Searches:</strong> {{ metrics.totalSearches }}
          </div>
          <div class="metric">
            <strong>Cache Hits:</strong> {{ metrics.cacheHits }}
          </div>
          <div class="metric">
            <strong>API Calls Saved:</strong> {{ metrics.apiCallsSaved }}
          </div>
          <div class="metric">
            <strong>Average Response Time:</strong> {{ metrics.averageResponseTime }}ms
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./demo.component.css']
})
export class DemoComponent implements OnInit {
  selectedUser: User | null = null;
  selectedProduct: Product | null = null;
  eventLog: Array<{ timestamp: Date; type: string; data: string }> = [];

  metrics = {
    totalSearches: 0,
    cacheHits: 0,
    apiCallsSaved: 0,
    averageResponseTime: 0
  };

  demoForm = new FormGroup({
    selectedUser: new FormControl(''),
    selectedProduct: new FormControl('')
  });

  // Mock data
  private users: User[] = [
    { id: 1, name: 'John Doe', email: 'john.doe@company.com', department: 'Engineering' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@company.com', department: 'Design' },
    { id: 3, name: 'Bob Johnson', email: 'bob.johnson@company.com', department: 'Product' },
    { id: 4, name: 'Alice Brown', email: 'alice.brown@company.com', department: 'Marketing' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie.wilson@company.com', department: 'Sales' },
    { id: 6, name: 'Diana Davis', email: 'diana.davis@company.com', department: 'Engineering' },
    { id: 7, name: 'Edward Miller', email: 'edward.miller@company.com', department: 'Support' },
    { id: 8, name: 'Fiona Garcia', email: 'fiona.garcia@company.com', department: 'HR' },
    { id: 9, name: 'George Martinez', email: 'george.martinez@company.com', department: 'Finance' },
    { id: 10, name: 'Helen Anderson', email: 'helen.anderson@company.com', department: 'Legal' }
  ];

  private products: Product[] = [
    { id: 'prod-1', name: 'Laptop Pro', category: 'Electronics', price: 1299.99 },
    { id: 'prod-2', name: 'Wireless Mouse', category: 'Electronics', price: 29.99 },
    { id: 'prod-3', name: 'Coffee Maker', category: 'Appliances', price: 89.99 },
    { id: 'prod-4', name: 'Standing Desk', category: 'Furniture', price: 399.99 },
    { id: 'prod-5', name: 'Monitor 4K', category: 'Electronics', price: 499.99 },
    { id: 'prod-6', name: 'Office Chair', category: 'Furniture', price: 249.99 },
    { id: 'prod-7', name: 'Tablet Pro', category: 'Electronics', price: 799.99 },
    { id: 'prod-8', name: 'Desk Lamp', category: 'Furniture', price: 49.99 },
    { id: 'prod-9', name: 'Printer', category: 'Electronics', price: 199.99 },
    { id: 'prod-10', name: 'Bookshelf', category: 'Furniture', price: 149.99 }
  ];

  // Search functions
  userSearchFn!: (query: string, signal?: AbortSignal) => Observable<SearchResponse<User>>;
  productSearchFn!: (query: string, signal?: AbortSignal) => Observable<SearchResponse<Product>>;

  errorSearchFn = (query: string): Observable<SearchResponse<any>> => {
    // Simulate random errors
    const errorTypes = ['network', 'timeout', 'server'];
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];

    return new Observable(observer => {
      setTimeout(() => {
        observer.error(new Error(`Simulated ${randomError} error`));
      }, 1000);
    });
  };

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    // Initialize search functions
    this.userSearchFn = this.searchService.mockSearch(this.users, 'name', 'id');
    this.productSearchFn = this.searchService.mockSearch(this.products, 'name', 'id');

    this.logEvent('info', 'Demo component initialized');
  }

  onUserSearch(event: SearchEvent<User>): void {
    this.metrics.totalSearches++;
    if (event.cacheHit) {
      this.metrics.cacheHits++;
    }

    this.logEvent('search', `User search: "${event.query}" → ${event.results.length} results`);
  }

  onUserSelect(event: SelectionEvent<User>): void {
    this.selectedUser = event.result.data;
    this.logEvent('select', `User selected: ${event.result.displayValue} (via ${event.method})`);
  }

  onProductSearch(event: SearchEvent<Product>): void {
    this.metrics.totalSearches++;
    if (event.cacheHit) {
      this.metrics.cacheHits++;
    }

    this.logEvent('search', `Product search: "${event.query}" → ${event.results.length} results`);
  }

  onProductSelect(event: SelectionEvent<Product>): void {
    this.selectedProduct = event.result.data;
    this.logEvent('select', `Product selected: ${event.result.displayValue} (via ${event.method})`);
  }

  onErrorDemo(event: SearchEvent<any>): void {
    this.logEvent('search', `Error demo search: "${event.query}"`);
  }

  onSearchError(event: any): void {
    this.logEvent('error', `Search error: ${event.error?.message || 'Unknown error'}`);
  }

  clearLog(): void {
    this.eventLog = [];
    this.logEvent('info', 'Event log cleared');
  }

  trackByIndex(index: number): number {
    return index;
  }

  private logEvent(type: string, data: string): void {
    this.eventLog.unshift({
      timestamp: new Date(),
      type,
      data
    });

    // Keep only last 50 events
    if (this.eventLog.length > 50) {
      this.eventLog = this.eventLog.slice(0, 50);
    }
  }
}