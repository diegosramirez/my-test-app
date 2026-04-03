import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      </div>

      <h2 class="empty-state-title">No notes yet</h2>

      <p class="empty-state-description">
        Start capturing your thoughts and ideas. Create your first note to get started.
      </p>

      <button
        class="create-note-btn"
        (click)="createFirstNote()"
        type="button"
      >
        Create Your First Note
      </button>

      <div class="keyboard-shortcut">
        <span class="shortcut-text">
          Or press <kbd class="shortcut-key">Ctrl</kbd> + <kbd class="shortcut-key">N</kbd>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      min-height: 50vh;
    }

    .empty-state-icon {
      margin-bottom: 1.5rem;
      color: #9ca3af;
    }

    .empty-state-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.75rem 0;
    }

    .empty-state-description {
      font-size: 1rem;
      color: #6b7280;
      margin: 0 0 2rem 0;
      max-width: 24rem;
      line-height: 1.5;
    }

    .create-note-btn {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .create-note-btn:hover {
      background-color: #2563eb;
    }

    .create-note-btn:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .keyboard-shortcut {
      margin-top: 1.5rem;
    }

    .shortcut-text {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .shortcut-key {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      font-family: inherit;
    }

    @media (max-width: 640px) {
      .empty-state {
        padding: 2rem 1rem;
      }

      .empty-state-title {
        font-size: 1.25rem;
      }

      .create-note-btn {
        padding: 0.875rem 2rem;
        font-size: 1.125rem;
      }
    }
  `]
})
export class EmptyStateComponent {
  constructor(private router: Router) {}

  createFirstNote(): void {
    this.router.navigate(['/editor']);
  }
}