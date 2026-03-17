import {
  Component,
  signal,
  inject,
  ElementRef,
  ViewChild,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { NotificationStateService } from '../../services/notification-state.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ANALYTICS_EVENTS } from '../../models/notification.model';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NotificationDropdownComponent],
  template: `
    <div class="notification-bell-container">
      <button
        #bellButton
        class="bell-button"
        (click)="toggleDropdown($event)"
        [attr.aria-label]="state.unreadCount() > 0
          ? 'Notifications, ' + state.unreadCount() + ' unread'
          : 'Notifications'"
        aria-haspopup="true"
        [attr.aria-expanded]="isOpen()"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        @if (state.unreadCount() > 0) {
          <span class="badge" aria-hidden="true">
            {{ state.unreadCount() > 99 ? '99+' : state.unreadCount() }}
          </span>
        }
      </button>
      @if (isOpen()) {
        <app-notification-dropdown (close)="closeDropdown()" />
      }
    </div>
  `,
  styles: `
    .notification-bell-container {
      position: relative;
      display: inline-flex;
    }

    .bell-button {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      color: #374151;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      transition: background-color 0.15s ease;
    }

    .bell-button:hover {
      background-color: #f3f4f6;
    }

    .bell-button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background-color: #dc2626;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 10px;
      min-width: 18px;
      max-width: 36px;
      text-align: center;
      pointer-events: none;
    }
  `,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @ViewChild('bellButton') bellButton!: ElementRef<HTMLButtonElement>;

  readonly state = inject(NotificationStateService);
  private readonly analytics = inject(AnalyticsService);
  private readonly elementRef = inject(ElementRef);

  isOpen = signal(false);

  private outsideClickListener: ((e: MouseEvent) => void) | null = null;
  private escapeListener: ((e: KeyboardEvent) => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryListener: (() => void) | null = null;

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(max-width: 480px)');
      this.mediaQueryListener = () => {
        if (this.isOpen()) {
          this.closeDropdown();
        }
      };
      this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    }
  }

  ngOnDestroy(): void {
    this.removeGlobalListeners();
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.removeGlobalListeners();
    this.analytics.track(ANALYTICS_EVENTS.NOTIFICATION_CENTER_CLOSED, {
      timestamp: new Date().toISOString(),
    });
    // Return focus to bell button
    setTimeout(() => this.bellButton?.nativeElement?.focus());
  }

  private openDropdown(): void {
    this.isOpen.set(true);
    this.addGlobalListeners();
    this.analytics.track(ANALYTICS_EVENTS.NOTIFICATION_CENTER_OPENED, {
      timestamp: new Date().toISOString(),
      unread_count: this.state.unreadCount(),
    });
  }

  private addGlobalListeners(): void {
    this.outsideClickListener = (e: MouseEvent) => {
      if (!this.elementRef.nativeElement.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    this.escapeListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    };
    // Delay to avoid the current click event triggering the outside click handler
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickListener!);
      document.addEventListener('keydown', this.escapeListener!);
    });
  }

  private removeGlobalListeners(): void {
    if (this.outsideClickListener) {
      document.removeEventListener('click', this.outsideClickListener);
      this.outsideClickListener = null;
    }
    if (this.escapeListener) {
      document.removeEventListener('keydown', this.escapeListener);
      this.escapeListener = null;
    }
  }
}
