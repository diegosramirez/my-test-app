import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      @if (auth.currentUser$ | async; as user) {
        <h1>Welcome, {{ user.name }}</h1>
        <button (click)="auth.logout()" class="logout-btn">Log out</button>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 2rem;
      text-align: center;
    }
    h1 {
      margin-bottom: 1rem;
    }
    .logout-btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
    }
    .logout-btn:hover {
      background: #f5f5f5;
    }
  `]
})
export class DashboardComponent {
  constructor(readonly auth: AuthService) {}
}
