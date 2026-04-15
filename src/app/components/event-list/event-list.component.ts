import { Component, OnInit, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, combineLatest, map } from 'rxjs';
import { EventService } from '../../services/event.service';
import { Event } from '../../models/event.interface';
import { EventCardComponent } from '../event-card/event-card.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Pipe({
  name: 'highlightSearch',
  standalone: true
})
export class HighlightSearchPipe implements PipeTransform {
  transform(text: string, searchTerm: string): string {
    if (!searchTerm || !text) {
      return text;
    }

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EventCardComponent,
    ConfirmDialogComponent,
    HighlightSearchPipe
  ],
  template: `
    <div class="event-list-container">
      <div class="list-header">
        <h1 class="page-title">My Events</h1>
        <button
          type="button"
          class="btn btn-primary"
          routerLink="/create">
          Create Event
        </button>
      </div>

      <div class="filters-section" [class.collapsed]="filtersCollapsed">
        <div class="filters-header">
          <h2 class="filters-title">Filters & Search</h2>
          <button
            type="button"
            class="toggle-filters"
            (click)="toggleFilters()">
            {{ filtersCollapsed ? 'Show' : 'Hide' }}
          </button>
        </div>

        <div class="filters-content" *ngIf="!filtersCollapsed">
          <div class="filter-row">
            <div class="filter-group">
              <label for="search" class="filter-label">Search Events</label>
              <input
                id="search"
                type="text"
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange($event)"
                class="form-control"
                placeholder="Search by title, location, or description..."
                maxlength="100">
            </div>

            <div class="filter-group">
              <label for="monthFilter" class="filter-label">Filter by Month</label>
              <select
                id="monthFilter"
                [(ngModel)]="selectedMonth"
                (ngModelChange)="onMonthChange()"
                class="form-control">
                <option value="">All Events</option>
                <option *ngFor="let month of availableMonths" [value]="month.value">
                  {{ month.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="active-filters" *ngIf="hasActiveFilters()">
            <span class="filters-label">Active filters:</span>
            <span class="filter-tag" *ngIf="searchTerm">
              Search: "{{ searchTerm }}"
              <button type="button" (click)="clearSearch()" class="remove-filter">×</button>
            </span>
            <span class="filter-tag" *ngIf="selectedMonth">
              Month: {{ getSelectedMonthLabel() }}
              <button type="button" (click)="clearMonthFilter()" class="remove-filter">×</button>
            </span>
            <button type="button" (click)="clearAllFilters()" class="clear-all">Clear All</button>
          </div>
        </div>
      </div>

      <div class="results-section">
        <div class="results-info" *ngIf="filteredEvents.length > 0">
          <span>Showing {{ filteredEvents.length }} of {{ allEvents.length }} events</span>
        </div>

        <div class="events-grid" *ngIf="filteredEvents.length > 0; else emptyState">
          <app-event-card
            *ngFor="let event of sortedEvents"
            [event]="event"
            (delete)="onDeleteEvent($event)">
          </app-event-card>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <h2 class="empty-title">
              {{ hasActiveFilters() ? 'No events found' : 'No events yet' }}
            </h2>
            <p class="empty-description">
              <span *ngIf="!hasActiveFilters()">
                Plan your next adventure! Create your first event to get started.
              </span>
              <span *ngIf="hasActiveFilters()">
                Try adjusting your search criteria or filters to find events.
              </span>
            </p>
            <button
              *ngIf="!hasActiveFilters()"
              type="button"
              class="btn btn-primary btn-large"
              routerLink="/create">
              Create Your First Event
            </button>
            <button
              *ngIf="hasActiveFilters()"
              type="button"
              class="btn btn-secondary"
              (click)="clearAllFilters()">
              Clear Filters
            </button>
          </div>
        </ng-template>
      </div>

      <app-confirm-dialog
        [isVisible]="showDeleteDialog"
        [event]="eventToDelete"
        (confirm)="confirmDelete($event)"
        (cancel)="cancelDelete()">
      </app-confirm-dialog>

      <div class="storage-info" *ngIf="storageInfo.quotaExceeded" class="storage-warning">
        ⚠️ Storage quota exceeded. Using {{ storageInfo.type }} for this session.
      </div>
    </div>
  `,
  styles: [`
    .event-list-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }

    .page-title {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
      color: #333;
    }

    .filters-section {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #ffffff;
      border-bottom: 1px solid #e9ecef;
    }

    .filters-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
    }

    .toggle-filters {
      background: none;
      border: 1px solid #007bff;
      color: #007bff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      min-height: 36px;
    }

    .toggle-filters:hover {
      background: #007bff;
      color: white;
    }

    .filters-content {
      padding: 20px;
    }

    .filter-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 6px;
      font-size: 0.9375rem;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      min-height: 44px;
      transition: border-color 0.2s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .active-filters {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }

    .filters-label {
      font-weight: 600;
      color: #555;
    }

    .filter-tag {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .remove-filter {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .remove-filter:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .clear-all {
      background: #6c757d;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8125rem;
      min-height: 28px;
    }

    .clear-all:hover {
      background: #5a6268;
    }

    .results-section {
      margin-top: 24px;
    }

    .results-info {
      margin-bottom: 16px;
      color: #666;
      font-size: 0.9375rem;
    }

    .events-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }

    .empty-title {
      margin: 0 0 12px 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
    }

    .empty-description {
      margin: 0 0 24px 0;
      color: #666;
      line-height: 1.5;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      min-height: 44px;
      min-width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-large {
      padding: 12px 24px;
      font-size: 1.0625rem;
      min-width: 200px;
    }

    .storage-warning {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fff3cd;
      color: #856404;
      padding: 12px 16px;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      font-size: 0.875rem;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    :host ::ng-deep mark {
      background-color: #ffeb3b;
      padding: 0 2px;
      border-radius: 2px;
    }

    @media (max-width: 768px) {
      .list-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .filter-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .filters-section.collapsed .filters-header {
        border-bottom: none;
      }

      .active-filters {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .event-list-container {
        padding: 16px;
      }

      .empty-state {
        padding: 40px 16px;
      }

      .storage-warning {
        position: relative;
        bottom: auto;
        right: auto;
        margin-top: 20px;
        max-width: none;
      }
    }
  `]
})
export class EventListComponent implements OnInit, OnDestroy {
  allEvents: Event[] = [];
  filteredEvents: Event[] = [];
  searchTerm = '';
  selectedMonth = '';
  filtersCollapsed = false;

  // Dialog state
  showDeleteDialog = false;
  eventToDelete: Event | null = null;

  // Storage info
  storageInfo: { type: 'localStorage' | 'sessionStorage'; quotaExceeded: boolean } = {
    type: 'localStorage',
    quotaExceeded: false
  };

  // Available months for filtering
  availableMonths: { value: string; label: string }[] = [];

  // RxJS
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadEvents();
    this.setupDefaultMonth();
    this.storageInfo = this.eventService.getStorageInfo();

    // Responsive filter collapse on mobile
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get sortedEvents(): Event[] {
    return [...this.filteredEvents].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  private loadEvents(): void {
    this.eventService.getEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(events => {
        this.allEvents = events;
        this.generateAvailableMonths();
        this.applyFilters();
      });
  }

  private setupDefaultMonth(): void {
    const currentDate = new Date();
    const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    this.selectedMonth = currentMonthValue;
  }

  private generateAvailableMonths(): void {
    const monthsSet = new Set<string>();
    const currentDate = new Date();

    // Add current month and next 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthValue);
    }

    // Add months from existing events
    this.allEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const monthValue = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthValue);
    });

    this.availableMonths = Array.from(monthsSet)
      .sort()
      .map(value => {
        const [year, month] = value.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          value,
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        };
      });
  }

  private applyFilters(): void {
    let filtered = [...this.allEvents];

    // Apply search filter
    if (this.searchTerm.trim()) {
      filtered = this.eventService.searchEvents(this.searchTerm);
    }

    // Apply month filter
    if (this.selectedMonth) {
      const [year, month] = this.selectedMonth.split('-').map(Number);
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getFullYear() === year && eventDate.getMonth() === (month - 1);
      });
    }

    this.filteredEvents = filtered;
  }

  private checkMobileView(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !this.filtersCollapsed) {
      this.filtersCollapsed = true;
    }
  }

  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  onMonthChange(): void {
    this.applyFilters();
  }

  toggleFilters(): void {
    this.filtersCollapsed = !this.filtersCollapsed;
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm.trim() || this.selectedMonth);
  }

  getSelectedMonthLabel(): string {
    const selectedMonth = this.availableMonths.find(m => m.value === this.selectedMonth);
    return selectedMonth?.label || '';
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearMonthFilter(): void {
    this.selectedMonth = '';
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedMonth = '';
    this.applyFilters();
  }

  onDeleteEvent(event: Event): void {
    this.eventToDelete = event;
    this.showDeleteDialog = true;
  }

  confirmDelete(event: Event): void {
    const success = this.eventService.deleteEvent(event.id);
    if (success) {
      console.log('Event deleted successfully');
    } else {
      console.error('Failed to delete event');
    }
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }
}