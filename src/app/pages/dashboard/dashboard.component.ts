import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Dashboard</h1>
      <p>Welcome to the Dashboard page.</p>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 2rem;
      }

      h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #333;
      }

      p {
        font-size: 1rem;
        color: #666;
      }
    `,
  ],
})
export class DashboardComponent {}
