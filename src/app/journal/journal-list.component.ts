import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { JournalService } from '../services/journal.service';
import { AuthService } from '../services/auth.service';
import { JournalEntry, Mood } from '../models/journal-entry.interface';

@Component({
  selector: 'app-journal-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="journal-container">
      <header class="journal-header">
        <h1>My Journal</h1>
        <div class="header-actions">
          <button routerLink="/journal/new" class="create-button">New Entry</button>
          <button (click)="logout()" class="logout-button">Logout</button>
        </div>
      </header>

      <div class="entries-container" *ngIf="!isLoading">
        <div *ngIf="entries.length === 0" class="empty-state">
          <p>No journal entries yet.</p>
          <button routerLink="/journal/new" class="create-button">Create your first entry</button>
        </div>

        <div *ngFor="let entry of entries" class="entry-card">
          <div class="entry-header">
            <div class="mood-indicator" [class]="'mood-' + entry.mood.toLowerCase()">
              {{ getMoodEmoji(entry.mood) }} {{ entry.mood }}
            </div>
            <div class="entry-date">{{ formatDate(entry.createdAt) }}</div>
          </div>

          <h3 class="entry-title">{{ entry.title }}</h3>
          <p class="entry-preview">{{ getPreview(entry.content) }}</p>

          <div class="entry-actions">
            <button [routerLink]="['/journal/edit', entry.id]" class="edit-button">Edit</button>
            <button (click)="deleteEntry(entry)" class="delete-button">Delete</button>
          </div>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading">
        Loading your entries...
      </div>
    </div>
  `,
  styles: [`
    .journal-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background-color: #f8f9fa;
      min-height: 100vh;
    }

    .journal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #dee2e6;
    }

    .journal-header h1 {
      color: #333;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .create-button {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .logout-button {
      background-color: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .entries-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .entry-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .mood-indicator {
      padding: 0.25rem 0.5rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .mood-happy { background-color: #fff3cd; color: #856404; }
    .mood-sad { background-color: #d1ecf1; color: #0c5460; }
    .mood-anxious { background-color: #f8d7da; color: #721c24; }
    .mood-calm { background-color: #d4edda; color: #155724; }
    .mood-excited { background-color: #fce4ec; color: #7b1fa2; }
    .mood-neutral { background-color: #e2e3e5; color: #383d41; }

    .entry-date {
      color: #6c757d;
      font-size: 0.875rem;
    }

    .entry-title {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .entry-preview {
      color: #666;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .entry-actions {
      display: flex;
      gap: 0.5rem;
    }

    .edit-button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .delete-button {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }

    .loading {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }
  `]
})
export class JournalListComponent implements OnInit {
  entries: JournalEntry[] = [];
  isLoading = true;

  constructor(
    private journalService: JournalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.journalService.getEntries().subscribe({
      next: (entries) => {
        this.entries = entries.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  deleteEntry(entry: JournalEntry): void {
    if (confirm(`Are you sure you want to delete "${entry.title}"?`)) {
      this.journalService.deleteEntry(entry.id).subscribe({
        next: () => {
          this.entries = this.entries.filter(e => e.id !== entry.id);
        },
        error: (error) => {
          alert('Failed to delete entry: ' + error.message);
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPreview(content: string): string {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }

  getMoodEmoji(mood: Mood): string {
    const moodEmojis = {
      [Mood.HAPPY]: '😊',
      [Mood.SAD]: '😢',
      [Mood.ANXIOUS]: '😰',
      [Mood.CALM]: '😌',
      [Mood.EXCITED]: '🤩',
      [Mood.NEUTRAL]: '😐'
    };
    return moodEmojis[mood] || '😐';
  }
}