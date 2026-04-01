import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { NotesService } from '../../services/notes.service';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ErrorMessageComponent } from '../../shared/error-message/error-message';
import { ViewState } from '../../models/note.model';
import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { HttpErrorResponse } from '@angular/common/http';

const TITLE_MAX = 255;
const CONTENT_MAX = 10000;

@Component({
  selector: 'app-note-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, ErrorMessageComponent],
  templateUrl: './note-form.html',
  styleUrl: './note-form.css'
})
export class NoteFormComponent implements OnInit, AfterViewInit, OnDestroy, HasUnsavedChanges {
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  form = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(TITLE_MAX)]),
    content: new FormControl('', [Validators.required, Validators.maxLength(CONTENT_MAX)])
  });

  isEditMode = false;
  noteId: string | null = null;
  state: ViewState = 'idle';
  submitState: ViewState = 'idle';
  errorMessage = '';
  serverErrors: string[] = [];

  showDiscardConfirmation = false;
  discardResult$ = new Subject<boolean>();

  readonly TITLE_MAX = TITLE_MAX;
  readonly CONTENT_MAX = CONTENT_MAX;

  private formDirty = false;
  private valueChangesSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private notesService: NotesService
  ) {}

  ngOnInit(): void {
    this.noteId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.noteId;

    if (this.isEditMode && this.noteId) {
      this.state = 'loading';
      this.notesService.get(this.noteId).subscribe({
        next: (note) => {
          this.form.patchValue({ title: note.title, content: note.content });
          this.state = 'success';
          this.subscribeToValueChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.state = 'error';
          if (err.status === 404) {
            this.errorMessage = 'This note no longer exists.';
            setTimeout(() => this.router.navigate(['/notes']), 2000);
          } else {
            this.errorMessage = 'Failed to load note.';
          }
        }
      });
    } else {
      this.subscribeToValueChanges();
    }
  }

  private subscribeToValueChanges(): void {
    this.valueChangesSub = this.form.valueChanges.subscribe(() => {
      this.formDirty = true;
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.titleInput?.nativeElement?.focus(), 0);
  }

  hasUnsavedChanges(): boolean {
    return this.formDirty && this.submitState !== 'success';
  }

  onDiscard(discard: boolean): void {
    this.showDiscardConfirmation = false;
    this.discardResult$.next(discard);
    this.discardResult$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState = 'loading';
    this.serverErrors = [];

    const body = {
      title: this.form.value.title!.trim(),
      content: this.form.value.content!.trim()
    };

    const request$ = this.isEditMode && this.noteId
      ? this.notesService.update(this.noteId, body)
      : this.notesService.create(body);

    request$.subscribe({
      next: (note) => {
        this.submitState = 'success';
        this.formDirty = false;
        this.router.navigate(['/notes', note.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.submitState = 'error';
        if (err.status === 400 && err.error?.errors) {
          this.serverErrors = err.error.errors;
        } else if (err.status === 404) {
          this.errorMessage = 'This note no longer exists.';
          setTimeout(() => this.router.navigate(['/notes']), 2000);
        } else if (err.status === 0) {
          this.errorMessage = 'Unable to reach the server. Check your connection.';
        } else {
          this.errorMessage = 'Something went wrong on our end. Try again.';
        }
      }
    });
  }

  get titleControl() { return this.form.get('title')!; }
  get contentControl() { return this.form.get('content')!; }
}
