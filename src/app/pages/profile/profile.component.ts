import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Profile</h1>
      <p>This is the Profile page. User profile details will appear here.</p>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 2rem;
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        color: #1a202c;
      }

      p {
        color: #4a5568;
        font-size: 1rem;
        line-height: 1.6;
      }
    `,
  ],
})
export class ProfileComponent {}
