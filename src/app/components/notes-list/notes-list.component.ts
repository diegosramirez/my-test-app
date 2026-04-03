import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, BehaviorSubject, takeUntil, debounceTime, distinctUntilChanged, switchMap, combineLatest, startWith } from 'rxjs';
import { NotesService } from '../../services/notes.service';
import { Note } from '../../models/note.interface';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="notes-container">
      <header class="notes-header">
        <h1 class="notes-title">My Notes</h1>

        <button
          class="create-btn"
          (click)="createNewNote()"
          type="button"
          aria-label="Create new note"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Note
        </button>
      </header>

      <div class="search-section" *ngIf="allNotes.length > 0">
        <div class="search-container">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="search"
            class="search-input"
            placeholder="Search notes..."
            [(ngModel)]="searchQuery"
            (input)="onSearchInput($event)"
          >
          <button
            *ngIf="searchQuery"
            class="clear-search-btn"
            (click)="clearSearch()"
            type="button"
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="notes-content">
        <app-empty-state *ngIf="allNotes.length === 0"></app-empty-state>

        <div *ngIf="allNotes.length > 0 && filteredNotes.length === 0 && searchQuery" class="no-results">
          <div class="no-results-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <h3 class="no-results-title">No notes found</h3>
          <p class="no-results-description">
            No notes match your search for "{{ searchQuery }}". Try different keywords or create a new note.
          </p>
          <button
            class="create-note-btn"
            (click)="createNewNote()"
            type="button"
          >
            Create New Note
          </button>
        </div>

        <div *ngIf="filteredNotes.length > 0" class="notes-grid">
          <article
            *ngFor="let note of filteredNotes; trackBy: trackByNoteId"
            class="note-card"
            (click)="editNote(note)"
            (keydown.enter)="editNote(note)"
            (keydown.space)="editNote(note)"
            tabindex="0"
            role="button"
            [attr.aria-label]="'Edit note: ' + note.title"
          >
            <div class="note-header">
              <h2 class="note-title" [title]="note.title">
                {{ note.title || 'Untitled' }}
              </h2>
              <button
                class="delete-btn"
                (click)="openDeleteConfirmation(note, $event)"
                type="button"
                [attr.aria-label]="'Delete note: ' + note.title"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                </svg>
              </button>
            </div>

            <div class="note-content" [title]="note.content">
              {{ getPreviewContent(note.content) }}
            </div>

            <div class="note-footer">
              <time class="note-date" [attr.datetime]="note.updatedAt.toISOString()">
                {{ formatDate(note.updatedAt) }}
              </time>
            </div>
          </article>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        *ngIf="deleteConfirmation"
        class="modal-overlay"
        (click)="cancelDelete()"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Note</h3>
          <p class="modal-message">
            Are you sure you want to delete "{{ deleteConfirmation.title || 'Untitled' }}"?
            This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button
              class="btn-cancel"
              (click)="cancelDelete()"
              type="button"
            >
              Cancel
            </button>
            <button
              class="btn-delete"
              (click)="confirmDelete()"
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="errorMessage" class="error-toast">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .notes-container {
      max-width: 75rem;
      margin: 0 auto;
      padding: 1rem;
    }

    .notes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .notes-title {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .create-btn:hover {
      background-color: #2563eb;
    }

    .create-btn:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .search-section {
      margin-bottom: 2rem;
    }

    .search-container {
      position: relative;
      max-width: 32rem;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 3rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 1rem;
      background-color: white;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .clear-search-btn:hover {
      color: #6b7280;
    }

    .no-results {
      text-align: center;
      padding: 3rem 1rem;
    }

    .no-results-icon {
      margin-bottom: 1rem;
      color: #9ca3af;
    }

    .no-results-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.5rem 0;
    }

    .no-results-description {
      color: #6b7280;
      margin: 0 0 2rem 0;
      max-width: 24rem;
      margin-left: auto;
      margin-right: auto;
    }

    .create-note-btn {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .create-note-btn:hover {
      background-color: #2563eb;
    }

    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
      gap: 1rem;
    }

    .note-card {
      background-color: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    }

    .note-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .note-card:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 0.5rem;
    }

    .note-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
      line-height: 1.5;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .delete-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease, background-color 0.2s ease;
      flex-shrink: 0;
    }

    .delete-btn:hover {
      color: #ef4444;
      background-color: #fef2f2;
    }

    .note-content {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 1rem;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      min-height: 3.75rem;
    }

    .note-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .note-date {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background-color: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 28rem;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 1rem 0;
    }

    .modal-message {
      color: #6b7280;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .btn-cancel {
      background-color: white;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .btn-cancel:hover {
      background-color: #f9fafb;
    }

    .btn-delete {
      background-color: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .btn-delete:hover {
      background-color: #dc2626;
    }

    .error-toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background-color: #fef2f2;
      color: #dc2626;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid #fecaca;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    @media (max-width: 640px) {
      .notes-container {
        padding: 0.75rem;
      }

      .notes-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
        margin-bottom: 1.5rem;
      }

      .notes-title {
        font-size: 1.75rem;
        text-align: center;
      }

      .create-btn {
        justify-content: center;
        padding: 1rem;
        font-size: 1rem;
      }

      .notes-grid {
        grid-template-columns: 1fr;
      }

      .modal-content {
        margin: 1rem;
      }

      .modal-actions {
        flex-direction: column;
        gap: 0.5rem;
      }

      .btn-cancel,
      .btn-delete {
        width: 100%;
        padding: 0.75rem 1rem;
      }
    }

    @media (max-width: 480px) {
      .note-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .delete-btn {
        align-self: flex-end;
        margin-top: -0.5rem;
      }
    }
  `]
})
export class NotesListComponent implements OnInit, OnDestroy {
  allNotes: Note[] = [];
  filteredNotes: Note[] = [];
  searchQuery = '';
  deleteConfirmation: Note | null = null;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');

  constructor(
    private router: Router,
    private notesService: NotesService
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    combineLatest([
      this.notesService.getAllNotes(),
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith('')
      )
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([notes, searchQuery]) => {
      this.allNotes = notes;
      if (!searchQuery.trim()) {
        this.filteredNotes = notes;
      } else {
        const searchTerm = searchQuery.toLowerCase().trim();
        this.filteredNotes = notes.filter(note =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm)
        );
      }
    });
  }

  private loadNotes(): void {
    this.notesService.getAllNotes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (notes) => {
        this.allNotes = notes;
        if (!this.searchQuery.trim()) {
          this.filteredNotes = notes;
        }
      },
      error: (error) => {
        this.showError('Failed to load notes');
        console.error('Error loading notes:', error);
      }
    });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  createNewNote(): void {
    this.router.navigate(['/editor']);
  }

  editNote(note: Note): void {
    this.router.navigate(['/editor', note.id]);
  }

  openDeleteConfirmation(note: Note, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmation = note;
  }

  cancelDelete(): void {
    this.deleteConfirmation = null;
  }

  confirmDelete(): void {
    if (this.deleteConfirmation) {
      this.notesService.deleteNote(this.deleteConfirmation.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.deleteConfirmation = null;
        },
        error: (error) => {
          this.showError('Failed to delete note');
          console.error('Error deleting note:', error);
          this.deleteConfirmation = null;
        }
      });
    }
  }

  getPreviewContent(content: string): string {
    if (!content.trim()) {
      return 'No additional text';
    }
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  trackByNoteId(index: number, note: Note): string {
    return note.id;
  }

  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
}