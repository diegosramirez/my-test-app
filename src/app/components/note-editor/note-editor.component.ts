import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { NotesService } from '../../services/notes.service';
import { Note } from '../../models/note.interface';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-container">
      <header class="editor-header">
        <button
          class="back-btn"
          (click)="goBack()"
          type="button"
          aria-label="Go back to notes list"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          Back
        </button>

        <div class="save-status" [class.saving]="isSaving" [class.error]="hasError">
          <span class="save-indicator">
            <svg *ngIf="isSaving" class="save-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <svg *ngIf="!isSaving && !hasError" class="save-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            <svg *ngIf="hasError" class="save-error" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </span>
          <span class="save-text">
            {{ getSaveStatusText() }}
          </span>
        </div>
      </header>

      <div class="editor-form">
        <input
          #titleInput
          type="text"
          class="title-input"
          placeholder="Note title..."
          [(ngModel)]="title"
          (blur)="onTitleBlur()"
          (keydown.escape)="handleEscape()"
          maxlength="200"
        >

        <textarea
          class="content-textarea"
          placeholder="Start writing your note..."
          [(ngModel)]="content"
          (blur)="onContentBlur()"
          (keydown.escape)="handleEscape()"
          rows="20"
        ></textarea>
      </div>

      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      max-width: 48rem;
      margin: 0 auto;
      padding: 1rem;
      min-height: 100vh;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: color 0.2s ease, background-color 0.2s ease;
    }

    .back-btn:hover {
      color: #374151;
      background-color: #f9fafb;
    }

    .save-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .save-indicator {
      display: flex;
      align-items: center;
    }

    .save-spinner {
      animation: spin 1s linear infinite;
      color: #3b82f6;
    }

    .save-check {
      color: #10b981;
    }

    .save-error {
      color: #ef4444;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .save-status.saving .save-text {
      color: #3b82f6;
    }

    .save-status.error .save-text {
      color: #ef4444;
    }

    .editor-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .title-input {
      font-size: 1.5rem;
      font-weight: 600;
      border: none;
      outline: none;
      padding: 0.75rem 0;
      background: transparent;
      color: #111827;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s ease;
    }

    .title-input::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }

    .title-input:focus {
      border-bottom-color: #3b82f6;
    }

    .content-textarea {
      font-size: 1rem;
      line-height: 1.6;
      border: none;
      outline: none;
      resize: vertical;
      padding: 1rem 0;
      background: transparent;
      color: #374151;
      font-family: inherit;
      min-height: 20rem;
    }

    .content-textarea::placeholder {
      color: #9ca3af;
    }

    .error-message {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      color: #dc2626;
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .editor-container {
        padding: 0.5rem;
      }

      .editor-header {
        margin-bottom: 1rem;
      }

      .title-input {
        font-size: 1.25rem;
        padding: 0.5rem 0;
      }

      .content-textarea {
        font-size: 1rem;
        min-height: 15rem;
      }

      .back-btn {
        font-size: 0.8rem;
        padding: 0.375rem;
      }

      .save-status {
        font-size: 0.8rem;
      }
    }

    @media (max-height: 600px) {
      .content-textarea {
        min-height: 10rem;
      }
    }
  `]
})
export class NoteEditorComponent implements OnInit, OnDestroy {
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  title = '';
  content = '';
  noteId: string | null = null;
  isNewNote = true;
  isSaving = false;
  hasError = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notesService: NotesService
  ) {
    this.setupAutoSave();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.noteId = id;
        this.isNewNote = false;
        this.loadNote(id);
      } else {
        this.isNewNote = true;
        // Focus title input after view init
        setTimeout(() => this.focusTitleInput(), 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAutoSave(): void {
    this.autoSaveSubject.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(() => this.saveNote())
    ).subscribe({
      next: () => {
        this.isSaving = false;
        this.hasError = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.isSaving = false;
        this.hasError = true;
        this.errorMessage = error.message || 'Failed to save note';
      }
    });
  }

  private loadNote(id: string): void {
    this.notesService.getNote(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (note) => {
        if (note) {
          this.title = note.title;
          this.content = note.content;
        } else {
          this.errorMessage = 'Note not found';
          setTimeout(() => this.goBack(), 2000);
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load note';
        console.error('Error loading note:', error);
      }
    });
  }

  private saveNote() {
    if (!this.title.trim() && !this.content.trim()) {
      return of(null);
    }

    this.isSaving = true;

    if (this.isNewNote) {
      return this.notesService.createNote({
        title: this.title.trim() || 'Untitled',
        content: this.content.trim()
      }).pipe(
        takeUntil(this.destroy$),
        switchMap((note) => {
          this.noteId = note.id;
          this.isNewNote = false;
          // Update URL without triggering navigation
          this.router.navigate(['/editor', note.id], { replaceUrl: true });
          return of(note);
        })
      );
    } else if (this.noteId) {
      return this.notesService.updateNote(this.noteId, {
        title: this.title.trim() || 'Untitled',
        content: this.content.trim()
      }).pipe(
        takeUntil(this.destroy$)
      );
    }

    return of(null);
  }

  onTitleBlur(): void {
    this.triggerAutoSave();
  }

  onContentBlur(): void {
    this.triggerAutoSave();
  }

  private triggerAutoSave(): void {
    this.autoSaveSubject.next();
  }

  handleEscape(): void {
    this.goBack();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getSaveStatusText(): string {
    if (this.hasError) {
      return 'Failed to save';
    }
    if (this.isSaving) {
      return 'Saving...';
    }
    return 'Saved';
  }

  private focusTitleInput(): void {
    if (this.titleInput) {
      this.titleInput.nativeElement.focus();
    }
  }
}