import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header>
      <h1>Team Announcements</h1>
      <nav>
        <a routerLink="/login">Login</a>
        <a routerLink="/announcements">Announcements</a>
      </nav>
    </header>
  `,
  styles: [`
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background-color: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }

    nav {
      display: flex;
      gap: 1rem;
    }

    nav a {
      text-decoration: none;
      color: #333;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }

    nav a:hover {
      background-color: #e0e0e0;
    }
  `]
})
export class HeaderComponent {}