import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService, User } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="profile-container">
      <header class="profile-header">
        <div class="header-content">
          <h1>Welcome to Your Profile</h1>
          <button
            type="button"
            class="btn btn-outline"
            (click)="logout()"
            aria-label="Sign out of your account"
          >
            Sign Out
          </button>
        </div>
      </header>

      <!-- Welcome message for new registrations -->
      <div class="welcome-message" *ngIf="showWelcomeMessage" role="alert">
        <div class="welcome-content">
          <h2>🎉 Welcome to the User Profile App!</h2>
          <p>Your account has been created successfully. You can now access all profile features.</p>
          <button
            type="button"
            class="btn btn-primary"
            (click)="dismissWelcomeMessage()"
          >
            Get Started
          </button>
        </div>
      </div>

      <main class="profile-main">
        <div class="profile-card">
          <h2>Profile Information</h2>

          <div class="user-info" *ngIf="user">
            <div class="info-item">
              <label>Email Address</label>
              <span>{{ user.email }}</span>
            </div>
            <div class="info-item">
              <label>User ID</label>
              <span class="user-id">{{ user.id }}</span>
            </div>
          </div>

          <div class="placeholder-content">
            <h3>Coming Soon</h3>
            <p>Profile editing, avatar upload, and other features will be available in future updates.</p>
          </div>
        </div>

        <div class="activity-card">
          <h2>Recent Activity</h2>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon">🔐</div>
              <div class="activity-details">
                <span class="activity-title">Account Created</span>
                <span class="activity-time">Just now</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon">✨</div>
              <div class="activity-details">
                <span class="activity-title">Profile Accessed</span>
                <span class="activity-time">Now</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  showWelcomeMessage = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Subscribe to user data
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.user = user;
      });

    // Check for welcome message
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.showWelcomeMessage = params['welcome'] === 'true';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  dismissWelcomeMessage(): void {
    this.showWelcomeMessage = false;
    // Remove welcome parameter from URL
    this.router.navigate([], {
      queryParams: { welcome: null },
      queryParamsHandling: 'merge'
    });
  }
}