import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { DemoComponent } from './demo.component';
import { TypeaheadSearchComponent, SearchEvent, SelectionEvent } from '../shared/components/typeahead-search/typeahead-search.component';
import { SearchService } from '../shared/services/search.service';
import { HighlightPipe } from '../shared/pipes/highlight.pipe';
import { provideHttpClient } from '@angular/common/http';

describe('DemoComponent', () => {
  let component: DemoComponent;
  let fixture: ComponentFixture<DemoComponent>;
  let searchService: jasmine.SpyObj<SearchService>;

  beforeEach(async () => {
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['mockSearch']);

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        DemoComponent,
        TypeaheadSearchComponent,
        HighlightPipe
      ],
      providers: [
        { provide: SearchService, useValue: searchServiceSpy },
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DemoComponent);
    component = fixture.componentInstance;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;

    // Mock the search service methods
    searchService.mockSearch.and.returnValue(() => of({
      results: [
        { id: '1', displayValue: 'Test User', data: { id: 1, name: 'Test User', email: 'test@test.com', department: 'IT' } }
      ],
      totalCount: 1,
      query: 'test'
    }));

    fixture.detectChanges();
  });

  it('should create the demo component', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize search functions on ngOnInit', () => {
      expect(component.userSearchFn).toBeDefined();
      expect(component.productSearchFn).toBeDefined();
      expect(searchService.mockSearch).toHaveBeenCalledTimes(2);
    });

    it('should initialize event log with startup message', () => {
      expect(component.eventLog.length).toBeGreaterThan(0);
      expect(component.eventLog[0].type).toBe('info');
      expect(component.eventLog[0].data).toContain('Demo component initialized');
    });

    it('should initialize demo form with empty values', () => {
      expect(component.demoForm.get('selectedUser')?.value).toBe('');
      expect(component.demoForm.get('selectedProduct')?.value).toBe('');
    });

    it('should initialize performance metrics', () => {
      expect(component.metrics.totalSearches).toBe(0);
      expect(component.metrics.cacheHits).toBe(0);
      expect(component.metrics.apiCallsSaved).toBe(0);
      expect(component.metrics.averageResponseTime).toBe(0);
    });
  });

  describe('user search functionality', () => {
    it('should render user search component', () => {
      const userSearchComponent = fixture.debugElement.query(By.css('app-typeahead-search'));
      expect(userSearchComponent).toBeTruthy();
    });

    it('should handle user search events', () => {
      const searchEvent: SearchEvent<any> = {
        query: 'john',
        results: [
          { id: '1', displayValue: 'John Doe', data: { id: 1, name: 'John Doe', email: 'john@test.com', department: 'IT' } }
        ],
        total: 1,
        cacheHit: false
      };

      const initialSearches = component.metrics.totalSearches;

      component.onUserSearch(searchEvent);

      expect(component.metrics.totalSearches).toBe(initialSearches + 1);
      expect(component.eventLog[0].type).toBe('search');
      expect(component.eventLog[0].data).toContain('User search: "john" → 1 results');
    });

    it('should handle user selection events', () => {
      const user = { id: 1, name: 'John Doe', email: 'john@test.com', department: 'IT' };
      const selectionEvent: SelectionEvent<any> = {
        result: { id: '1', displayValue: 'John Doe', data: user },
        index: 0,
        method: 'click'
      };

      component.onUserSelect(selectionEvent);

      expect(component.selectedUser).toEqual(user);
      expect(component.eventLog[0].type).toBe('select');
      expect(component.eventLog[0].data).toContain('User selected: John Doe (via click)');
    });

    it('should display selected user information', () => {
      const user = { id: 1, name: 'John Doe', email: 'john@test.com', department: 'IT' };
      component.selectedUser = user;
      fixture.detectChanges();

      const userCard = fixture.debugElement.query(By.css('.user-card'));
      expect(userCard).toBeTruthy();
      expect(userCard.nativeElement.textContent).toContain('John Doe');
      expect(userCard.nativeElement.textContent).toContain('john@test.com');
      expect(userCard.nativeElement.textContent).toContain('IT');
    });
  });

  describe('product search functionality', () => {
    it('should handle product search events', () => {
      const searchEvent: SearchEvent<any> = {
        query: 'laptop',
        results: [
          { id: '1', displayValue: 'Laptop Pro', data: { id: 'prod-1', name: 'Laptop Pro', category: 'Electronics', price: 1299.99 } }
        ],
        total: 1,
        cacheHit: true
      };

      const initialSearches = component.metrics.totalSearches;
      const initialCacheHits = component.metrics.cacheHits;

      component.onProductSearch(searchEvent);

      expect(component.metrics.totalSearches).toBe(initialSearches + 1);
      expect(component.metrics.cacheHits).toBe(initialCacheHits + 1);
      expect(component.eventLog[0].type).toBe('search');
      expect(component.eventLog[0].data).toContain('Product search: "laptop" → 1 results');
    });

    it('should handle product selection events', () => {
      const product = { id: 'prod-1', name: 'Laptop Pro', category: 'Electronics', price: 1299.99 };
      const selectionEvent: SelectionEvent<any> = {
        result: { id: 'prod-1', displayValue: 'Laptop Pro', data: product },
        index: 0,
        method: 'keyboard'
      };

      component.onProductSelect(selectionEvent);

      expect(component.selectedProduct).toEqual(product);
      expect(component.eventLog[0].type).toBe('select');
      expect(component.eventLog[0].data).toContain('Product selected: Laptop Pro (via keyboard)');
    });

    it('should display selected product information with price formatting', () => {
      const product = { id: 'prod-1', name: 'Laptop Pro', category: 'Electronics', price: 1299.99 };
      component.selectedProduct = product;
      fixture.detectChanges();

      const productCard = fixture.debugElement.query(By.css('.product-card'));
      expect(productCard).toBeTruthy();
      expect(productCard.nativeElement.textContent).toContain('Laptop Pro');
      expect(productCard.nativeElement.textContent).toContain('Electronics');
      expect(productCard.nativeElement.textContent).toContain('$1299.99');
    });
  });

  describe('form integration', () => {
    it('should render form with typeahead components', () => {
      const form = fixture.debugElement.query(By.css('.demo-form'));
      expect(form).toBeTruthy();

      const formTypeaheads = fixture.debugElement.queryAll(By.css('form app-typeahead-search'));
      expect(formTypeaheads.length).toBe(2);
    });

    it('should display form values in JSON format', () => {
      component.demoForm.patchValue({
        selectedUser: 'John Doe',
        selectedProduct: 'Laptop Pro'
      });
      fixture.detectChanges();

      const formValues = fixture.debugElement.query(By.css('.form-values pre'));
      expect(formValues).toBeTruthy();
      expect(formValues.nativeElement.textContent).toContain('John Doe');
      expect(formValues.nativeElement.textContent).toContain('Laptop Pro');
    });

    it('should have proper form control bindings', () => {
      const userFormControl = component.demoForm.get('selectedUser');
      const productFormControl = component.demoForm.get('selectedProduct');

      expect(userFormControl).toBeTruthy();
      expect(productFormControl).toBeTruthy();

      userFormControl?.setValue('Test User');
      productFormControl?.setValue('Test Product');

      expect(component.demoForm.value.selectedUser).toBe('Test User');
      expect(component.demoForm.value.selectedProduct).toBe('Test Product');
    });
  });

  describe('error handling demo', () => {
    it('should render error simulation component', () => {
      const errorComponents = fixture.debugElement.queryAll(By.css('app-typeahead-search'));
      // Should have 4 components total (user, product, form user, form product, error demo)
      expect(errorComponents.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle error demo search events', () => {
      const searchEvent: SearchEvent<any> = {
        query: 'error test',
        results: [],
        total: 0,
        cacheHit: false
      };

      component.onErrorDemo(searchEvent);

      expect(component.eventLog[0].type).toBe('search');
      expect(component.eventLog[0].data).toContain('Error demo search: "error test"');
    });

    it('should handle search error events', () => {
      const errorEvent = {
        error: {
          message: 'Network error occurred',
          type: 'network_error'
        },
        query: 'test'
      };

      component.onSearchError(errorEvent);

      expect(component.eventLog[0].type).toBe('error');
      expect(component.eventLog[0].data).toContain('Search error: Network error occurred');
    });

    it('should handle undefined error messages gracefully', () => {
      const errorEvent = {
        error: null,
        query: 'test'
      };

      component.onSearchError(errorEvent);

      expect(component.eventLog[0].type).toBe('error');
      expect(component.eventLog[0].data).toContain('Search error: Unknown error');
    });
  });

  describe('event logging', () => {
    it('should render event log section', () => {
      const eventLog = fixture.debugElement.query(By.css('.event-log'));
      expect(eventLog).toBeTruthy();

      const clearButton = fixture.debugElement.query(By.css('.clear-button'));
      expect(clearButton).toBeTruthy();
    });

    it('should display log entries with proper formatting', () => {
      // Add some test events
      component['logEvent']('test', 'Test event data');
      fixture.detectChanges();

      const logEntries = fixture.debugElement.queryAll(By.css('.log-entry'));
      expect(logEntries.length).toBeGreaterThan(0);

      const latestEntry = logEntries[0];
      expect(latestEntry.nativeElement.textContent).toContain('Test event data');
    });

    it('should clear event log when clear button is clicked', () => {
      // Add some events
      component['logEvent']('test', 'Test event 1');
      component['logEvent']('test', 'Test event 2');

      const initialCount = component.eventLog.length;
      expect(initialCount).toBeGreaterThan(1);

      component.clearLog();

      expect(component.eventLog.length).toBe(1); // Only the "cleared" event remains
      expect(component.eventLog[0].data).toContain('Event log cleared');
    });

    it('should limit event log to 50 entries', () => {
      // Add more than 50 events
      for (let i = 0; i < 60; i++) {
        component['logEvent']('test', `Test event ${i}`);
      }

      expect(component.eventLog.length).toBeLessThanOrEqual(50);
    });

    it('should track events by index', () => {
      const index = component.trackByIndex(5);
      expect(index).toBe(5);
    });
  });

  describe('performance metrics', () => {
    it('should render performance metrics section', () => {
      const metricsSection = fixture.debugElement.query(By.css('.metrics'));
      expect(metricsSection).toBeTruthy();

      const metricElements = fixture.debugElement.queryAll(By.css('.metric'));
      expect(metricElements.length).toBe(4);
    });

    it('should display current metric values', () => {
      component.metrics.totalSearches = 10;
      component.metrics.cacheHits = 7;
      component.metrics.apiCallsSaved = 5;
      component.metrics.averageResponseTime = 250;

      fixture.detectChanges();

      const metricsSection = fixture.debugElement.query(By.css('.metrics'));
      const metricsText = metricsSection.nativeElement.textContent;

      expect(metricsText).toContain('Total Searches: 10');
      expect(metricsText).toContain('Cache Hits: 7');
      expect(metricsText).toContain('API Calls Saved: 5');
      expect(metricsText).toContain('Average Response Time: 250ms');
    });

    it('should update metrics when cache hits occur', () => {
      const cacheHitEvent: SearchEvent<any> = {
        query: 'test',
        results: [],
        total: 0,
        cacheHit: true
      };

      const initialCacheHits = component.metrics.cacheHits;
      const initialTotalSearches = component.metrics.totalSearches;

      component.onUserSearch(cacheHitEvent);

      expect(component.metrics.cacheHits).toBe(initialCacheHits + 1);
      expect(component.metrics.totalSearches).toBe(initialTotalSearches + 1);
    });
  });

  describe('mock data integrity', () => {
    it('should have properly structured user data', () => {
      expect(component['users']).toBeDefined();
      expect(component['users'].length).toBeGreaterThan(0);

      const user = component['users'][0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('department');
    });

    it('should have properly structured product data', () => {
      expect(component['products']).toBeDefined();
      expect(component['products'].length).toBeGreaterThan(0);

      const product = component['products'][0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('price');
      expect(typeof product.price).toBe('number');
    });

    it('should have diverse departments in user data', () => {
      const departments = component['users'].map(user => user.department);
      const uniqueDepartments = [...new Set(departments)];

      expect(uniqueDepartments.length).toBeGreaterThan(3);
      expect(uniqueDepartments).toContain('Engineering');
    });

    it('should have diverse categories in product data', () => {
      const categories = component['products'].map(product => product.category);
      const uniqueCategories = [...new Set(categories)];

      expect(uniqueCategories.length).toBeGreaterThan(1);
      expect(uniqueCategories).toContain('Electronics');
    });
  });

  describe('error search function', () => {
    it('should simulate different types of errors', (done) => {
      component.errorSearchFn('test query').subscribe({
        error: (error) => {
          expect(error.message).toContain('Simulated');
          expect(['network', 'timeout', 'server'].some(type =>
            error.message.includes(type)
          )).toBe(true);
          done();
        }
      });
    });
  });

  describe('component lifecycle', () => {
    it('should handle component initialization properly', () => {
      expect(component.selectedUser).toBeNull();
      expect(component.selectedProduct).toBeNull();
      expect(component.eventLog).toBeDefined();
      expect(component.metrics).toBeDefined();
      expect(component.demoForm).toBeDefined();
    });
  });

  describe('template rendering', () => {
    it('should render all major sections', () => {
      const sections = fixture.debugElement.queryAll(By.css('.demo-section'));
      expect(sections.length).toBeGreaterThanOrEqual(5);

      // Check for key sections
      const sectionTexts = sections.map(section => section.nativeElement.textContent);
      expect(sectionTexts.some(text => text.includes('User Search'))).toBe(true);
      expect(sectionTexts.some(text => text.includes('Product Search'))).toBe(true);
      expect(sectionTexts.some(text => text.includes('Form Integration'))).toBe(true);
      expect(sectionTexts.some(text => text.includes('Error Handling'))).toBe(true);
      expect(sectionTexts.some(text => text.includes('Event Log'))).toBe(true);
      expect(sectionTexts.some(text => text.includes('Performance Metrics'))).toBe(true);
    });

    it('should have proper heading structure', () => {
      const h1 = fixture.debugElement.query(By.css('h1'));
      expect(h1).toBeTruthy();
      expect(h1.nativeElement.textContent).toContain('Typeahead Search Component Demo');

      const h2Elements = fixture.debugElement.queryAll(By.css('h2'));
      expect(h2Elements.length).toBeGreaterThanOrEqual(5);
    });
  });
});