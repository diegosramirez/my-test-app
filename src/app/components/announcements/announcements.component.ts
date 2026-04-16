import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="announcements-container">
      <h2>Announcements</h2>
      <p>Announcements functionality will be implemented here.</p>
    </div>
  `,
  styles: [`
    .announcements-container {
      padding: 2rem;
    }

    h2 {
      margin-bottom: 1rem;
    }
  `]
})
export class AnnouncementsComponent {}