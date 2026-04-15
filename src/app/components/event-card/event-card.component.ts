import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Event } from '../../models/event.interface';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="event-card" [class.past-event]="isPastEvent()">
      <div class="event-header">
        <h3 class="event-title">{{ event.title }}</h3>
        <div class="event-actions">
          <button
            type="button"
            class="btn btn-edit"
            [routerLink]="['/edit', event.id]"
            title="Edit event">
            Edit
          </button>
          <button
            type="button"
            class="btn btn-delete"
            (click)="onDelete()"
            title="Delete event">
            Delete
          </button>
        </div>
      </div>

      <div class="event-details">
        <div class="event-date">
          <span class="date-label">Date:</span>
          <span class="date-value">{{ event.date | date:'fullDate' }}</span>
          <span class="time-value">{{ event.date | date:'shortTime' }}</span>
        </div>

        <div class="event-location" *ngIf="event.location">
          <span class="location-label">Location:</span>
          <span class="location-value">{{ event.location }}</span>
        </div>

        <div class="event-description" *ngIf="event.description">
          <span class="description-label">Description:</span>
          <p class="description-value">{{ event.description }}</p>
        </div>
      </div>

      <div class="event-meta">
        <small class="created-date">Created: {{ event.createdAt | date:'short' }}</small>
        <small class="updated-date" *ngIf="event.updatedAt !== event.createdAt">
          Updated: {{ event.updatedAt | date:'short' }}
        </small>
      </div>
    </div>
  `,
  styles: [`
    .event-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s ease;
    }

    .event-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .event-card.past-event {
      opacity: 0.7;
      background: #f9f9f9;
      border-color: #d0d0d0;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .event-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
      flex: 1;
      margin-right: 12px;
    }

    .event-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      min-height: 44px;
      min-width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    }

    .btn-edit {
      background: #007bff;
      color: white;
    }

    .btn-edit:hover {
      background: #0056b3;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    .event-details {
      margin-bottom: 12px;
    }

    .event-date {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .date-label,
    .location-label,
    .description-label {
      font-weight: 600;
      color: #555;
    }

    .date-value {
      font-weight: 500;
      color: #333;
    }

    .time-value {
      color: #666;
      font-size: 0.875rem;
    }

    .event-location {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .location-value {
      color: #333;
    }

    .event-description {
      margin-top: 8px;
    }

    .description-value {
      margin: 4px 0 0 0;
      color: #555;
      line-height: 1.4;
    }

    .event-meta {
      display: flex;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid #eee;
    }

    .created-date,
    .updated-date {
      color: #888;
      font-size: 0.75rem;
    }

    @media (max-width: 480px) {
      .event-header {
        flex-direction: column;
        gap: 12px;
      }

      .event-actions {
        align-self: flex-end;
      }

      .event-date {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .event-meta {
        flex-direction: column;
        gap: 4px;
      }
    }
  `]
})
export class EventCardComponent {
  @Input() event!: Event;
  @Output() delete = new EventEmitter<Event>();

  isPastEvent(): boolean {
    return new Date(this.event.date) < new Date();
  }

  onDelete(): void {
    this.delete.emit(this.event);
  }
}