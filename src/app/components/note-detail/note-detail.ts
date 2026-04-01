import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NotesService } from '../../services/notes.service';
import { Note, ViewState } from '../../models/note.model';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ErrorMessageComponent } from '../../shared/error-message/error-message';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-note-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, ErrorMessageComponent, RelativeTimePipe],
  templateUrl: './note-detail.html',
  styleUrl: './note-detail.css'
})
export class NoteDetailComponent implements OnInit {
  @ViewChild('confirmDeleteBtn') confirmDeleteBtn!: ElementRef<HTMLButtonElement>;

  note: Note | null = null;
  state: ViewState = 'idle';
  errorMessage = '';
  showDeleteConfirm = false;
  deleteState: ViewState = 'idle';

  private noteId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notesService: NotesService
  ) {}

  ngOnInit(): void {
    this.noteId = this.route.snapshot.paramMap.get('id')!;
    this.loadNote();
  }

  loadNote(): void {
    this.state = 'loading';
    this.notesService.get(this.noteId).subscribe({
      next: (note) => {
        this.note = note;
        this.state = 'success';
      },
      error: (err: HttpErrorResponse) => {
        this.state = 'error';
        if (err.status === 404) {
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

  get showUpdatedAt(): boolean {
    return !!this.note && this.note.updatedAt !== this.note.createdAt;
  }

  onEdit(): void {
    this.router.navigate(['/notes', this.noteId, 'edit']);
  }

  onDeleteClick(): void {
    this.showDeleteConfirm = true;
    setTimeout(() => this.confirmDeleteBtn?.nativeElement?.focus(), 0);
  }

  onCancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  onConfirmDelete(): void {
    this.deleteState = 'loading';
    this.notesService.delete(this.noteId).subscribe({
      next: () => {
        this.deleteState = 'success';
        this.router.navigate(['/notes']);
      },
      error: (err: HttpErrorResponse) => {
        this.deleteState = 'error';
        this.showDeleteConfirm = false;
        if (err.status === 404) {
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
}
