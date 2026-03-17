import { Component } from '@angular/core';

@Component({
  selector: 'app-notification-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M32 8C24.268 8 18 14.268 18 22v10.34L14.34 38H12v4h40v-4h-2.34L46 32.34V22c0-7.732-6.268-14-14-14z"
          fill="#d1d5db"
        />
        <path d="M26 46a6 6 0 0 0 12 0H26z" fill="#d1d5db" />
        <path
          d="M44 26l-8.5 8.5-5.5-5.5-8 8"
          stroke="#9ca3af"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <circle cx="44" cy="26" r="3" fill="#9ca3af" />
      </svg>
      <p class="empty-text">No notifications yet</p>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
    }

    .empty-text {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      font-weight: 500;
    }
  `,
})
export class NotificationEmptyStateComponent {}
