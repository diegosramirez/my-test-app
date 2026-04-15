import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event } from '../../models/event.interface';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="isVisible" (click)="onCancel()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">Confirm Delete</h2>
          <button
            type="button"
            class="close-button"
            (click)="onCancel()"
            aria-label="Close dialog">
            ×
          </button>
        </div>

        <div class="dialog-body">
          <p class="confirm-message">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>

          <div class="event-preview" *ngIf="event">
            <div class="preview-field">
              <span class="field-label">Event:</span>
              <span class="field-value">{{ event.title }}</span>
            </div>
            <div class="preview-field">
              <span class="field-label">Date:</span>
              <span class="field-value">{{ event.date | date:'fullDate' }} at {{ event.date | date:'shortTime' }}</span>
            </div>
            <div class="preview-field" *ngIf="event.location">
              <span class="field-label">Location:</span>
              <span class="field-value">{{ event.location }}</span>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="btn btn-cancel"
            (click)="onCancel()">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-delete"
            (click)="onConfirm()">
            Delete Event
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .dialog-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 0 24px;
      border-bottom: 1px solid #eee;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 600;
      color: #333;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #666;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .close-button:hover {
      background: #f5f5f5;
    }

    .dialog-body {
      padding: 0 24px;
      margin-bottom: 24px;
    }

    .confirm-message {
      margin: 0 0 20px 0;
      color: #555;
      line-height: 1.5;
    }

    .event-preview {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 16px;
    }

    .preview-field {
      display: flex;
      margin-bottom: 8px;
    }

    .preview-field:last-child {
      margin-bottom: 0;
    }

    .field-label {
      font-weight: 600;
      color: #555;
      min-width: 80px;
      margin-right: 12px;
    }

    .field-value {
      color: #333;
      flex: 1;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px 24px 24px;
      border-top: 1px solid #eee;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
      min-width: 88px;
      transition: background-color 0.2s ease;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
    }

    .btn-cancel:hover {
      background: #5a6268;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    @media (max-width: 480px) {
      .dialog-overlay {
        padding: 16px;
      }

      .dialog-header,
      .dialog-body,
      .dialog-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .dialog-footer {
        flex-direction: column;
        gap: 8px;
      }

      .btn {
        width: 100%;
      }

      .preview-field {
        flex-direction: column;
        gap: 4px;
      }

      .field-label {
        min-width: auto;
        margin-right: 0;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() isVisible = false;
  @Input() event: Event | null = null;
  @Output() confirm = new EventEmitter<Event>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    if (this.event) {
      this.confirm.emit(this.event);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}