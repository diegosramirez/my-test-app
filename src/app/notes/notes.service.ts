import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { Note, NotesEnvelope, NOTES_STORAGE_KEY } from './note.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly _notes = signal<Note[]>([]);
  private readonly _storageAvailable = signal(false);
  private readonly _storageFull = signal(false);

  readonly notes = computed(() =>
    [...this._notes()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  );
  readonly storageAvailable = this._storageAvailable.asReadonly();
  readonly storageFull = this._storageFull.asReadonly();

  notesCreatedThisSession = 0;

  constructor() {
    this._storageAvailable.set(this.probeStorage());
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === NOTES_STORAGE_KEY) {
          this.loadFromStorage();
        }
      });
    }
  }

  private probeStorage(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return val === 'test';
    } catch {
      return false;
    }
  }

  private loadFromStorage(): void {
    if (!this._storageAvailable()) return;
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (!raw) {
        this._notes.set([]);
        return;
      }
      const envelope: NotesEnvelope = JSON.parse(raw);
      if (envelope && envelope.version === 1 && Array.isArray(envelope.notes)) {
        this._notes.set(envelope.notes);
      } else {
        console.warn('Invalid notes envelope structure, resetting to empty');
        this._notes.set([]);
      }
    } catch (e) {
      console.warn('Failed to parse notes from localStorage', e);
      this._notes.set([]);
    }
  }

  private persist(): boolean {
    if (!this._storageAvailable()) return true;
    try {
      const envelope: NotesEnvelope = { version: 1, notes: this._notes() };
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(envelope));
      this._storageFull.set(false);
      return true;
    } catch (e: unknown) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        this._storageFull.set(true);
      }
      return false;
    }
  }

  getAll(): Note[] {
    return this.notes();
  }

  getById(id: string): Note | null {
    return this._notes().find((n) => n.id === id) ?? null;
  }

  create(title: string, body: string): Note | null {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      body: body,
      createdAt: now,
      updatedAt: now,
    };

    this._notes.update((notes) => [...notes, note]);
    if (!this.persist()) {
      // Rollback
      this._notes.update((notes) => notes.filter((n) => n.id !== note.id));
      return null;
    }
    this.notesCreatedThisSession++;
    console.log('[track] note_created', {
      noteId: note.id,
      titleLength: note.title.length,
      bodyLength: note.body.length,
    });
    return note;
  }

  update(id: string, title: string, body: string): Note | null {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    const existing = this.getById(id);
    if (!existing) return null;

    const updated: Note = {
      ...existing,
      title: trimmedTitle,
      body: body,
      updatedAt: new Date().toISOString(),
    };

    const oldNotes = this._notes();
    this._notes.update((notes) => notes.map((n) => (n.id === id ? updated : n)));
    if (!this.persist()) {
      this._notes.set(oldNotes);
      return null;
    }
    console.log('[track] note_updated', { noteId: id });
    return updated;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const oldNotes = this._notes();
    this._notes.update((notes) => notes.filter((n) => n.id !== id));
    if (!this.persist()) {
      this._notes.set(oldNotes);
      return false;
    }
    console.log('[track] note_deleted', { noteId: id });
    return true;
  }

  getStorageSizeBytes(): number {
    if (!this._storageAvailable()) return 0;
    return new Blob([localStorage.getItem(NOTES_STORAGE_KEY) ?? '']).size;
  }
}
