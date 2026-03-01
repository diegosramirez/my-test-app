import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Settings</h1>
      <p>Manage your application settings here.</p>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 2rem;
      }

      h1 {
        font-size: 2rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1a202c;
      }

      p {
        font-size: 1rem;
        color: #4a5568;
      }
    `,
  ],
})
export class SettingsComponent {}
