import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../models/note.interface';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly STORAGE_KEY = 'notes-app-data';
  private notesSubject = new BehaviorSubject<Note[]>([]);
  public readonly notes$ = this.notesSubject.asObservable();

  constructor() {
    this.loadNotesFromStorage();
  }

  getAllNotes(): Observable<Note[]> {
    return this.notes$;
  }

  getNote(id: string): Observable<Note | undefined> {
    return this.notes$.pipe(
      map(notes => notes.find(note => note.id === id))
    );
  }

  createNote(request: CreateNoteRequest): Observable<Note> {
    try {
      const note: Note = {
        id: this.generateId(),
        title: request.title,
        content: request.content,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const currentNotes = this.notesSubject.value;
      const updatedNotes = [note, ...currentNotes];

      return this.saveNotesToStorage(updatedNotes).pipe(
        map(() => {
          this.notesSubject.next(updatedNotes);
          return note;
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  updateNote(id: string, updates: UpdateNoteRequest): Observable<Note> {
    try {
      const currentNotes = this.notesSubject.value;
      const noteIndex = currentNotes.findIndex(note => note.id === id);

      if (noteIndex === -1) {
        return throwError(() => new Error(`Note with id ${id} not found`));
      }

      const existingNote = currentNotes[noteIndex];
      const updatedNote: Note = {
        ...existingNote,
        ...updates,
        updatedAt: new Date()
      };

      const updatedNotes = [...currentNotes];
      updatedNotes[noteIndex] = updatedNote;

      return this.saveNotesToStorage(updatedNotes).pipe(
        map(() => {
          this.notesSubject.next(updatedNotes);
          return updatedNote;
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  deleteNote(id: string): Observable<boolean> {
    try {
      const currentNotes = this.notesSubject.value;
      const noteExists = currentNotes.some(note => note.id === id);

      if (!noteExists) {
        return throwError(() => new Error(`Note with id ${id} not found`));
      }

      const updatedNotes = currentNotes.filter(note => note.id !== id);

      return this.saveNotesToStorage(updatedNotes).pipe(
        map(() => {
          this.notesSubject.next(updatedNotes);
          return true;
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  searchNotes(query: string): Observable<Note[]> {
    return this.notes$.pipe(
      map(notes => {
        if (!query.trim()) {
          return notes;
        }

        const searchTerm = query.toLowerCase().trim();
        return notes.filter(note =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  private loadNotesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const notes: Note[] = JSON.parse(stored);
        // Convert date strings back to Date objects
        const parsedNotes = notes.map(note => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }));
        this.notesSubject.next(parsedNotes);
      }
    } catch (error) {
      console.error('Failed to load notes from localStorage:', error);
      // Clear corrupted data and start fresh
      localStorage.removeItem(this.STORAGE_KEY);
      this.notesSubject.next([]);
    }
  }

  private saveNotesToStorage(notes: Note[]): Observable<void> {
    try {
      const serialized = JSON.stringify(notes);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      return of(void 0);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return throwError(() => new Error('Storage quota exceeded. Please delete some notes to free up space.'));
      }
      return throwError(() => new Error('Failed to save notes to storage.'));
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}