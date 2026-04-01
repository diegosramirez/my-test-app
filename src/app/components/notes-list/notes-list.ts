import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NotesService } from '../../services/notes.service';
import { Note, ViewState } from '../../models/note.model';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ErrorMessageComponent } from '../../shared/error-message/error-message';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, ErrorMessageComponent, RelativeTimePipe],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css'
})
export class NotesListComponent implements OnInit, OnDestroy {
  notes: Note[] = [];
  state: ViewState = 'idle';
  errorMessage = '';
  selectedNoteId: string | null = null;
  showSidebar = true;

  private routerSub?: Subscription;

  constructor(
    private notesService: NotesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadNotes();
    this.updateSelectedNoteId();
    // Re-track selected note and refresh list on every navigation
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSelectedNoteId();
      this.loadNotes();
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateSelectedNoteId(): void {
    this.selectedNoteId = this.route.firstChild?.snapshot.paramMap.get('id') ?? null;
  }

  loadNotes(): void {
    this.state = 'loading';
    this.notesService.list().subscribe({
      next: (notes) => {
        this.notes = notes;
        this.state = 'success';
      },
      error: (err) => {
        this.state = 'error';
        if (err.status === 0) {
          this.errorMessage = 'Unable to reach the server. Check your connection.';
        } else {
          this.errorMessage = 'Something went wrong on our end. Try again.';
        }
      }
    });
  }

  truncate(text: string, max = 80): string {
    if (text.length <= max) return text;
    return text.substring(0, max) + '...';
  }

  onSelectNote(id: string): void {
    if (this.selectedNoteId === id) return;
    this.selectedNoteId = id;
    this.router.navigate(['/notes', id]);
    this.showSidebar = false;
  }

  onNewNote(): void {
    this.router.navigate(['/notes', 'new']);
    this.showSidebar = false;
  }

  onBackToList(): void {
    this.showSidebar = true;
    this.loadNotes();
  }

  get hasChildRoute(): boolean {
    return !!this.route.firstChild;
  }
}
