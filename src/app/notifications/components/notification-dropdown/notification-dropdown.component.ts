import { Component, output, inject, ElementRef, OnInit, OnDestroy, signal } from '@angular/core';
import { NotificationStateService } from '../../services/notification-state.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ANALYTICS_EVENTS } from '../../models/notification.model';
import { NotificationItemComponent } from '../notification-item/notification-item.component';
import { NotificationEmptyStateComponent } from '../notification-empty-state/notification-empty-state.component';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [NotificationItemComponent, NotificationEmptyStateComponent],
  template: `
    <div
      class="dropdown-panel"
      role="dialog"
      aria-label="Notification center"
      (keydown.escape)="onEscape($event)"
    >
      <div class="dropdown-header">
        <h2 class="dropdown-title">Notifications</h2>
        <div class="header-actions">
          @if (state.notifications().length > 0) {
            <button
              class="mark-all-btn"
              (click)="onMarkAllRead()"
              [disabled]="state.unreadCount() === 0"
              [attr.aria-disabled]="state.unreadCount() === 0"
            >
              Mark all as read
            </button>
          }
          <button
            class="close-btn mobile-only"
            (click)="close.emit()"
            aria-label="Close notifications"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="dropdown-body">
        @if (state.notifications().length === 0) {
          <app-notification-empty-state />
        } @else {
          <div class="notification-list">
            @if (state.groupedNotifications().today.length > 0) {
              <div class="group-header">Today</div>
              @for (n of state.groupedNotifications().today; track n.id) {
                <app-notification-item
                  [notification]="n"
                  [isRead]="state.isRead(n.id)"
                  (markRead)="onMarkRead($event)"
                />
              }
            }
            @if (state.groupedNotifications().yesterday.length > 0) {
              <div class="group-header">Yesterday</div>
              @for (n of state.groupedNotifications().yesterday; track n.id) {
                <app-notification-item
                  [notification]="n"
                  [isRead]="state.isRead(n.id)"
                  (markRead)="onMarkRead($event)"
                />
              }
            }
            @if (state.groupedNotifications().older.length > 0) {
              <div class="group-header">Older</div>
              @for (n of state.groupedNotifications().older; track n.id) {
                <app-notification-item
                  [notification]="n"
                  [isRead]="state.isRead(n.id)"
                  (markRead)="onMarkRead($event)"
                />
              }
            }
          </div>
        }
      </div>
      <div class="scroll-fade" aria-hidden="true"></div>
      <div
        class="sr-announcement"
        aria-live="polite"
        role="status"
      >
        {{ announcement() }}
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .dropdown-panel {
      position: absolute;
      top: 100%;
      right: 0;
      width: 360px;
      max-width: 100vw;
      max-height: 480px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      animation: dropdownOpen 180ms ease-out;
      overflow: hidden;
    }

    @keyframes dropdownOpen {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .dropdown-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mark-all-btn {
      background: none;
      border: none;
      color: #2563eb;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 6px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease;
    }

    .mark-all-btn:hover:not(:disabled) {
      background-color: #eff6ff;
    }

    .mark-all-btn:disabled {
      color: #9ca3af;
      cursor: default;
    }

    .mark-all-btn:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      min-width: 44px;
      min-height: 44px;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background-color: #f3f4f6;
    }

    .close-btn:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .dropdown-body {
      flex: 1;
      overflow-y: auto;
      position: relative;
    }

    .notification-list {
      display: flex;
      flex-direction: column;
    }

    .group-header {
      position: sticky;
      top: 0;
      background: #f9fafb;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
      z-index: 1;
    }

    .scroll-fade {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 24px;
      background: linear-gradient(transparent, rgba(255, 255, 255, 0.8));
      pointer-events: none;
    }

    .sr-announcement {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 480px) {
      .dropdown-panel {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 70vh;
        border-radius: 12px 12px 0 0;
      }

      .close-btn.mobile-only {
        display: flex;
      }
    }
  `,
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  close = output<void>();
  readonly state = inject(NotificationStateService);
  private readonly analytics = inject(AnalyticsService);
  private readonly elementRef = inject(ElementRef);

  announcement = signal('');

  private focusTrapListener: ((e: KeyboardEvent) => void) | null = null;

  ngOnInit(): void {
    // Focus the first focusable element in the dropdown
    setTimeout(() => {
      const focusable = this.getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    });

    // Set up focus trap
    this.focusTrapListener = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    this.elementRef.nativeElement.addEventListener('keydown', this.focusTrapListener);

    // Track empty state
    if (this.state.notifications().length === 0) {
      this.analytics.track(ANALYTICS_EVENTS.NOTIFICATION_EMPTY_STATE_SHOWN, {
        timestamp: new Date().toISOString(),
      });
    }
  }

  ngOnDestroy(): void {
    if (this.focusTrapListener) {
      this.elementRef.nativeElement.removeEventListener('keydown', this.focusTrapListener);
    }
  }

  onEscape(event: Event): void {
    event.stopPropagation();
    this.close.emit();
  }

  onMarkRead(id: string): void {
    const notification = this.state.notifications().find((n) => n.id === id);
    this.state.markAsRead(id);
    this.analytics.track(ANALYTICS_EVENTS.NOTIFICATION_MARKED_READ, {
      notification_id: id,
      notification_type: notification?.type,
      timestamp: new Date().toISOString(),
    });
  }

  onMarkAllRead(): void {
    const count = this.state.unreadCount();
    this.state.markAllAsRead();
    this.announcement.set('All notifications marked as read');
    this.analytics.track(ANALYTICS_EVENTS.NOTIFICATIONS_ALL_MARKED_READ, {
      count_marked: count,
      timestamp: new Date().toISOString(),
    });
    // Clear announcement after screen reader has time to read it
    setTimeout(() => this.announcement.set(''), 3000);
  }

  private getFocusableElements(): HTMLElement[] {
    const el = this.elementRef.nativeElement as HTMLElement;
    return Array.from(
      el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }
}
