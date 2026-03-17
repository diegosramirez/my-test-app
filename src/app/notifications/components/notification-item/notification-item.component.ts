import { Component, input, output } from '@angular/core';
import { AppNotification } from '../../models/notification.model';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [RelativeTimePipe],
  template: `
    <div
      class="notification-item"
      [class.read]="isRead()"
      (click)="onItemClick()"
      (keydown.enter)="onItemClick()"
      (keydown.space)="onItemClick(); $event.preventDefault()"
      tabindex="0"
      role="button"
      [attr.aria-label]="notification().title + '. ' + notification().description"
    >
      <div class="icon-container" [class]="'icon-' + notification().type" aria-hidden="true">
        @switch (notification().type) {
          @case ('info') {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-4h2v4zm0-6H9V5h2v2z"/></svg>
          }
          @case ('success') {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1.5 11.5l-3-3 1.41-1.41L8.5 10.67l4.59-4.58L14.5 7.5l-6 6z"/></svg>
          }
          @case ('warning') {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L1 18h18L10 2zm1 13H9v-2h2v2zm0-4H9V7h2v4z"/></svg>
          }
          @case ('error') {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
          }
        }
      </div>
      <div class="content">
        <div class="title-row">
          <span class="title">{{ notification().title }}</span>
          <span class="timestamp">{{ notification().timestamp | relativeTime }}</span>
        </div>
        <p class="description">{{ notification().description }}</p>
      </div>
      @if (!isRead()) {
        <div class="unread-dot" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: `
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      cursor: default;
      transition: background-color 0.15s ease;
      position: relative;
      border-left: 3px solid transparent;
    }

    .notification-item:not(.read) {
      border-left-color: #3b82f6;
      background-color: #eff6ff;
    }

    .notification-item:hover {
      background-color: #f3f4f6;
    }

    .notification-item:not(.read):hover {
      background-color: #dbeafe;
    }

    .notification-item:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: -2px;
    }

    .notification-item.read {
      border-left-color: transparent;
    }

    .icon-container {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-info { background-color: #dbeafe; color: #2563eb; }
    .icon-success { background-color: #dcfce7; color: #16a34a; }
    .icon-warning { background-color: #fef3c7; color: #d97706; }
    .icon-error { background-color: #fee2e2; color: #dc2626; }

    .content {
      flex: 1;
      min-width: 0;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .read .title {
      font-weight: 400;
      color: #4b5563;
    }

    .timestamp {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .description {
      font-size: 13px;
      color: #374151;
      margin: 4px 0 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: break-word;
      word-break: break-word;
      line-height: 1.4;
    }

    .read .description {
      color: #6b7280;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #3b82f6;
      flex-shrink: 0;
      margin-top: 6px;
    }
  `,
})
export class NotificationItemComponent {
  notification = input.required<AppNotification>();
  isRead = input.required<boolean>();
  markRead = output<string>();

  onItemClick(): void {
    if (!this.isRead()) {
      this.markRead.emit(this.notification().id);
    }
  }
}
