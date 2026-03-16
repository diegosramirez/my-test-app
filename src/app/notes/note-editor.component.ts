import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NotesService } from './notes.service';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="editor-container">
      <header class="editor-header">
        <h1>{{ isEditMode ? 'Edit Note' : 'New Note' }}</h1>
      </header>

      <div class="form-body">
        <div class="field">
          <label for="note-title" class="field-label">Title</label>
          <input
            id="note-title"
            type="text"
            class="input-title"
            placeholder="Note title"
            [(ngModel)]="title"
            (input)="onInput()"
            [attr.aria-describedby]="showTitleError ? 'title-error' : null"
            [class.input-error]="showTitleError"
          />
          <p id="title-error" class="error-text" *ngIf="showTitleError">
            Title is required
          </p>
        </div>

        <div class="field">
          <label for="note-body" class="field-label">Body</label>
          <textarea
            id="note-body"
            class="input-body"
            placeholder="Start writing…"
            [(ngModel)]="body"
            (input)="onInput()"
            rows="12"
          ></textarea>
        </div>
      </div>

      <div class="bottom-bar">
        <button class="btn-cancel" (click)="onCancel()">
          {{ isDirty ? 'Discard changes' : 'Back' }}
        </button>
        <button
          class="btn-save"
          [disabled]="!title.trim() || isSaving"
          (click)="onSave()"
        >
          Save
        </button>
      </div>

      <!-- Discard confirmation dialog -->
      <dialog #discardDialog class="discard-dialog" aria-labelledby="discard-dialog-title" aria-modal="true" role="dialog">
        <h2 id="discard-dialog-title">Unsaved changes</h2>
        <p>You have unsaved changes. Discard them?</p>
        <div class="dialog-actions">
          <button class="btn-secondary" (click)="discardDialog.close()">Keep editing</button>
          <button class="btn-destructive" (click)="discardAndNavigate()">Discard</button>
        </div>
      </dialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 720px;
      margin: 0 auto;
    }

    .editor-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .editor-header {
      padding: 16px;
    }
    .editor-header h1 {
      font-size: 20px;
      margin: 0;
    }

    .form-body {
      flex: 1;
      padding: 0 16px;
    }

    .field { margin-bottom: 16px; }
    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .input-title {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-sizing: border-box;
      min-height: 44px;
    }
    .input-title:focus { outline: 2px solid #4f46e5; outline-offset: -1px; border-color: #4f46e5; }
    .input-title.input-error { border-color: #ef4444; }

    .error-text {
      color: #ef4444;
      font-size: 13px;
      margin: 4px 0 0;
    }

    .input-body {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-sizing: border-box;
      resize: vertical;
      min-height: 200px;
      font-family: inherit;
    }
    .input-body:focus { outline: 2px solid #4f46e5; outline-offset: -1px; border-color: #4f46e5; }

    .bottom-bar {
      position: sticky;
      bottom: 0;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      padding: 12px 16px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .btn-cancel {
      background: none;
      border: 1px solid #d1d5db;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
    }
    .btn-cancel:hover { background: #f9fafb; }

    .btn-save {
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
    }
    .btn-save:hover:not(:disabled) { background: #4338ca; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    .discard-dialog {
      border: none;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .discard-dialog::backdrop { background: rgba(0,0,0,0.5); }
    .discard-dialog h2 { margin: 0 0 8px; font-size: 18px; }
    .discard-dialog p { margin: 0 0 24px; color: #6b7280; font-size: 14px; }
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
  `],
})
export class NoteEditorComponent implements OnInit {
  @ViewChild('discardDialog') discardDialog!: ElementRef<HTMLDialogElement>;

  title = '';
  body = '';
  isDirty = false;
  isSaving = false;
  showTitleError = false;
  isEditMode = false;

  private noteId: string | null = null;

  constructor(
    private notesService: NotesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.noteId = this.route.snapshot.paramMap.get('id');
    if (this.noteId) {
      this.isEditMode = true;
      const note = this.notesService.getById(this.noteId);
      if (!note) {
        this.router.navigate(['/notes']);
        return;
      }
      this.title = note.title;
      this.body = note.body;
    }
  }

  onInput(): void {
    this.isDirty = true;
    if (this.title.trim()) {
      this.showTitleError = false;
    }
  }

  onSave(): void {
    if (!this.title.trim()) {
      this.showTitleError = true;
      return;
    }
    this.isSaving = true;

    let result;
    if (this.isEditMode && this.noteId) {
      result = this.notesService.update(this.noteId, this.title, this.body);
    } else {
      result = this.notesService.create(this.title, this.body);
    }

    if (result) {
      this.isDirty = false;
      this.router.navigate(['/notes'], { queryParams: { saved: 'true' } });
    } else {
      // Save failed (quota exceeded or validation), allow retry
      this.isSaving = false;
    }
  }

  onCancel(): void {
    if (this.isDirty) {
      this.discardDialog.nativeElement.showModal();
    } else {
      this.router.navigate(['/notes']);
    }
  }

  discardAndNavigate(): void {
    this.discardDialog.nativeElement.close();
    this.isDirty = false;
    this.router.navigate(['/notes']);
  }
}
