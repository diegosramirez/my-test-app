import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  template: `
    <nav class="nav-bar">
      <a routerLink="/" class="app-name">Notifications App</a>
      @if (user$ | async; as user) {
        <div class="nav-right">
          <span class="username">{{ user.username }}</span>
          <button type="button" class="btn-logout" (click)="onLogout()">Logout</button>
        </div>
      }
    </nav>
  `,
  styles: [`
    .nav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      height: 56px;
      background: #1976d2;
      color: #fff;
    }
    .app-name {
      font-weight: 600;
      font-size: 1.125rem;
      color: #fff;
      text-decoration: none;
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .username {
      font-size: 0.875rem;
    }
    .btn-logout {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.6);
      color: #fff;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-logout:hover {
      background: rgba(255,255,255,0.15);
    }
    .btn-logout:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  `]
})
export class NavBarComponent {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  readonly user$ = this.authService.user$;

  onLogout(): void {
    let userId: string | undefined;
    this.authService.user$.subscribe(user => userId = user?.id ?? undefined).unsubscribe();
    this.analytics.track('auth_logout', { userId });
    this.authService.logout();
  }
}
