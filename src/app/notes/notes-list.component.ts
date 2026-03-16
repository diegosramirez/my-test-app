import { Component, OnInit, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NotesService } from './notes.service';
import { Note } from './note.model';
import { RelativeTimePipe } from './relative-time.pipe';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, RelativeTimePipe],
  template: `
    <!-- Storage unavailable banner -->
    <div class="banner banner-warning" *ngIf="!notesService.storageAvailable()">
      Your browser doesn't support local storage. Notes will not be saved between sessions.
    </div>

    <!-- Storage full banner -->
    <div class="banner banner-error" *ngIf="notesService.storageFull()">
      Storage is full. Please delete some notes to save new ones.
    </div>

    <!-- Toast -->
    <div class="toast" *ngIf="showToast()" role="status" aria-live="polite">
      Note saved
    </div>

    <header class="toolbar">
      <h1 #pageHeading tabindex="-1">Notes</h1>
      <button class="btn-primary new-note-desktop" routerLink="/notes/new">+ New Note</button>
    </header>

    <!-- Empty state -->
    <div class="empty-state" *ngIf="notesService.notes().length === 0">
      <svg class="empty-icon" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="28" x2="44" y2="28" stroke="currentColor" stroke-width="2"/>
        <line x1="20" y1="36" x2="36" y2="36" stroke="currentColor" stroke-width="2"/>
        <circle cx="48" cy="48" r="12" fill="currentColor" opacity="0.1"/>
        <line x1="44" y1="48" x2="52" y2="48" stroke="currentColor" stroke-width="2"/>
        <line x1="48" y1="44" x2="48" y2="52" stroke="currentColor" stroke-width="2"/>
      </svg>
      <p class="empty-message">No notes yet</p>
      <button class="btn-primary" routerLink="/notes/new">Create your first note</button>
    </div>

    <!-- Notes list -->
    <ng-container *ngIf="notesService.notes().length > 0">
      <p class="sort-label">Recently updated</p>
      <div class="notes-grid">
        <article class="note-card" *ngFor="let note of notesService.notes()">
          <a class="note-link" [routerLink]="['/notes', note.id, 'edit']">
            <h2 class="note-title">{{ note.title }}</h2>
            <p class="note-body">{{ note.body }}</p>
            <time class="note-time" [attr.title]="note.updatedAt">
              {{ note.updatedAt | relativeTime }}
            </time>
          </a>
          <button
            class="btn-delete"
            [attr.aria-label]="'Delete note: ' + note.title"
            (click)="confirmDelete(note, $event)"
            #deleteBtn
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14M10 11v6M14 11v6"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </article>
      </div>

      <footer class="list-footer">
        {{ notesService.notes().length }} note{{ notesService.notes().length === 1 ? '' : 's' }}
        &middot; {{ formatBytes(notesService.getStorageSizeBytes()) }} used
      </footer>
    </ng-container>

    <!-- FAB for mobile -->
    <button class="fab" routerLink="/notes/new" aria-label="New Note">+</button>

    <!-- Delete confirmation dialog -->
    <dialog #deleteDialog class="delete-dialog" aria-labelledby="delete-dialog-title" aria-modal="true" role="dialog">
      <h2 id="delete-dialog-title">Delete this note?</h2>
      <p class="dialog-note-title" *ngIf="noteToDelete()">{{ noteToDelete()!.title }}</p>
      <div class="dialog-actions">
        <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
        <button class="btn-destructive" (click)="executeDelete()">Delete</button>
      </div>
    </dialog>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 720px;
      margin: 0 auto;
      padding: 16px;
      padding-bottom: 80px;
    }

    .banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .banner-warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffc107;
    }
    .banner-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .toast {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #323232;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .toolbar h1 {
      font-size: 24px;
      margin: 0;
    }

    .btn-primary {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .btn-primary:hover { background: #4338ca; }

    .new-note-desktop { display: none; }
    @media (min-width: 600px) {
      .new-note-desktop { display: inline-flex; }
      .fab { display: none !important; }
    }

    .empty-state {
      text-align: center;
      padding: 64px 16px;
      color: #6b7280;
    }
    .empty-icon { color: #9ca3af; margin-bottom: 16px; }
    .empty-message { font-size: 18px; margin: 0 0 24px; }

    .sort-label {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notes-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .note-card {
      position: relative;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.15s;
    }
    .note-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

    .note-link {
      display: block;
      padding: 16px;
      padding-right: 56px;
      text-decoration: none;
      color: inherit;
      min-height: 44px;
    }

    .note-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .note-body {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .note-time {
      font-size: 12px;
      color: #9ca3af;
    }

    .btn-delete {
      position: absolute;
      top: 12px;
      right: 8px;
      background: none;
      border: none;
      padding: 12px;
      cursor: pointer;
      color: #9ca3af;
      border-radius: 8px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-delete:hover { color: #ef4444; background: #fef2f2; }

    .list-footer {
      text-align: center;
      padding: 16px;
      font-size: 13px;
      color: #9ca3af;
    }

    .fab {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: #fff;
      border: none;
      font-size: 28px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79,70,229,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      min-width: 44px;
      min-height: 44px;
    }
    .fab:hover { background: #4338ca; }

    .delete-dialog {
      border: none;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .delete-dialog::backdrop {
      background: rgba(0,0,0,0.5);
    }
    .delete-dialog h2 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .dialog-note-title {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px;
      font-style: italic;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn-secondary {
      background: none;
      border: 1px solid #d1d5db;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
    }
    .btn-secondary:hover { background: #f9fafb; }
    .btn-destructive {
      background: #ef4444;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
    }
    .btn-destructive:hover { background: #dc2626; }
  `],
})
export class NotesListComponent implements OnInit {
  @ViewChild('deleteDialog') deleteDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('pageHeading') pageHeading!: ElementRef<HTMLHeadingElement>;

  noteToDelete = signal<Note | null>(null);
  showToast = signal(false);

  private deleteTriggeredBy: HTMLElement | null = null;

  constructor(
    public notesService: NotesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[track] notes_list_viewed', { noteCount: this.notesService.notes().length });

    // Check for toast query param
    if (this.route.snapshot.queryParamMap.get('saved') === 'true') {
      this.showToast.set(true);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
      setTimeout(() => this.showToast.set(false), 2500);
    }
  }

  confirmDelete(note: Note, event: Event): void {
    this.noteToDelete.set(note);
    this.deleteTriggeredBy = event.currentTarget as HTMLElement;
    this.deleteDialog.nativeElement.showModal();
  }

  cancelDelete(): void {
    this.deleteDialog.nativeElement.close();
    this.noteToDelete.set(null);
    this.deleteTriggeredBy?.focus();
    this.deleteTriggeredBy = null;
  }

  executeDelete(): void {
    const note = this.noteToDelete();
    if (note) {
      this.notesService.delete(note.id);
    }
    this.deleteDialog.nativeElement.close();
    this.noteToDelete.set(null);
    this.deleteTriggeredBy = null;
    this.pageHeading?.nativeElement?.focus();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    return `${Math.round(bytes / 1024)}KB`;
  }
}
