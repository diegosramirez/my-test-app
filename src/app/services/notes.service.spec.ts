import { TestBed } from '@angular/core/testing';
import { NotesService } from './notes.service';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../models/note.interface';
import { firstValueFrom, take } from 'rxjs';
import { expect, vi } from 'vitest';

describe('NotesService', () => {
  let service: NotesService;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        }
      },
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(NotesService);
  });

  afterEach(() => {
    mockLocalStorage = {};
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with empty notes array when no localStorage data', () => {
      const notes = service.getAllNotes();
      firstValueFrom(notes).then(notesArray => {
        expect(notesArray).toEqual([]);
      });
    });

    it('should load notes from localStorage on initialization', () => {
      const testNotes: Note[] = [
        {
          id: '1',
          title: 'Test Note',
          content: 'Test content',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockLocalStorage['notes-app-data'] = JSON.stringify(testNotes);

      // Create new service to trigger initialization
      const newService = TestBed.inject(NotesService);

      firstValueFrom(newService.getAllNotes()).then(notes => {
        expect(notes).toHaveLength(1);
        expect(notes[0].title).toBe('Test Note');
        expect(notes[0].createdAt).toBeInstanceOf(Date);
        expect(notes[0].updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['notes-app-data'] = 'invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const newService = TestBed.inject(NotesService);

      firstValueFrom(newService.getAllNotes()).then(notes => {
        expect(notes).toEqual([]);
        expect(mockLocalStorage['notes-app-data']).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load notes from localStorage:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Create Note', () => {
    it('should create a new note successfully', async () => {
      const request: CreateNoteRequest = {
        title: 'New Note',
        content: 'New content'
      };

      const result = await firstValueFrom(service.createNote(request));

      expect(result).toBeDefined();
      expect(result.title).toBe('New Note');
      expect(result.content).toBe('New content');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      // Verify it was added to the notes array
      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes).toHaveLength(1);
      expect(notes[0]).toEqual(result);
    });

    it('should save to localStorage after creating note', async () => {
      const request: CreateNoteRequest = {
        title: 'Test Title',
        content: 'Test Content'
      };

      await firstValueFrom(service.createNote(request));

      expect(mockLocalStorage['notes-app-data']).toBeDefined();
      const saved = JSON.parse(mockLocalStorage['notes-app-data']);
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Test Title');
    });

    it('should add new notes at the beginning of the array', async () => {
      const request1: CreateNoteRequest = { title: 'First', content: 'First content' };
      const request2: CreateNoteRequest = { title: 'Second', content: 'Second content' };

      const note1 = await firstValueFrom(service.createNote(request1));
      const note2 = await firstValueFrom(service.createNote(request2));

      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes[0].id).toBe(note2.id); // Most recent first
      expect(notes[1].id).toBe(note1.id);
    });

    it('should handle localStorage quota exceeded error', async () => {
      // Mock quota exceeded error
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          setItem: () => {
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
          }
        },
        writable: true
      });

      const request: CreateNoteRequest = { title: 'Test', content: 'Test' };

      try {
        await firstValueFrom(service.createNote(request));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Storage quota exceeded. Please delete some notes to free up space.');
      }
    });

    it('should handle generic localStorage errors', async () => {
      // Mock generic storage error
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          setItem: () => {
            throw new Error('Generic storage error');
          }
        },
        writable: true
      });

      const request: CreateNoteRequest = { title: 'Test', content: 'Test' };

      try {
        await firstValueFrom(service.createNote(request));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Failed to save notes to storage.');
      }
    });

    it('should generate unique IDs for notes', async () => {
      const request1: CreateNoteRequest = { title: 'Note 1', content: 'Content 1' };
      const request2: CreateNoteRequest = { title: 'Note 2', content: 'Content 2' };

      const note1 = await firstValueFrom(service.createNote(request1));
      const note2 = await firstValueFrom(service.createNote(request2));

      expect(note1.id).not.toBe(note2.id);
    });
  });

  describe('Get Note', () => {
    let testNote: Note;

    beforeEach(async () => {
      const request: CreateNoteRequest = { title: 'Test Note', content: 'Test content' };
      testNote = await firstValueFrom(service.createNote(request));
    });

    it('should return existing note by ID', async () => {
      const result = await firstValueFrom(service.getNote(testNote.id));

      expect(result).toBeDefined();
      expect(result!.id).toBe(testNote.id);
      expect(result!.title).toBe('Test Note');
    });

    it('should return undefined for non-existent note ID', async () => {
      const result = await firstValueFrom(service.getNote('non-existent-id'));

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string ID', async () => {
      const result = await firstValueFrom(service.getNote(''));

      expect(result).toBeUndefined();
    });
  });

  describe('Update Note', () => {
    let testNote: Note;

    beforeEach(async () => {
      const request: CreateNoteRequest = { title: 'Original Title', content: 'Original content' };
      testNote = await firstValueFrom(service.createNote(request));
    });

    it('should update existing note successfully', async () => {
      const updates: UpdateNoteRequest = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const result = await firstValueFrom(service.updateNote(testNote.id, updates));

      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe('Updated content');
      expect(result.id).toBe(testNote.id);
      expect(result.createdAt).toEqual(testNote.createdAt);
      expect(result.updatedAt).not.toEqual(testNote.updatedAt);
    });

    it('should update only title when provided', async () => {
      const updates: UpdateNoteRequest = { title: 'New Title Only' };

      const result = await firstValueFrom(service.updateNote(testNote.id, updates));

      expect(result.title).toBe('New Title Only');
      expect(result.content).toBe('Original content'); // Unchanged
    });

    it('should update only content when provided', async () => {
      const updates: UpdateNoteRequest = { content: 'New content only' };

      const result = await firstValueFrom(service.updateNote(testNote.id, updates));

      expect(result.title).toBe('Original Title'); // Unchanged
      expect(result.content).toBe('New content only');
    });

    it('should save updated note to localStorage', async () => {
      const updates: UpdateNoteRequest = { title: 'Saved Title' };

      await firstValueFrom(service.updateNote(testNote.id, updates));

      const saved = JSON.parse(mockLocalStorage['notes-app-data']);
      expect(saved[0].title).toBe('Saved Title');
    });

    it('should throw error for non-existent note ID', async () => {
      const updates: UpdateNoteRequest = { title: 'Updated' };

      try {
        await firstValueFrom(service.updateNote('non-existent-id', updates));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Note with id non-existent-id not found');
      }
    });

    it('should update the notes observable', async () => {
      const updates: UpdateNoteRequest = { title: 'Observable Test' };

      await firstValueFrom(service.updateNote(testNote.id, updates));

      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes[0].title).toBe('Observable Test');
    });

    it('should handle localStorage errors during update', async () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          setItem: () => {
            throw new Error('Storage error');
          }
        },
        writable: true
      });

      const updates: UpdateNoteRequest = { title: 'Failed Update' };

      try {
        await firstValueFrom(service.updateNote(testNote.id, updates));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Failed to save notes to storage.');
      }
    });
  });

  describe('Delete Note', () => {
    let testNote: Note;

    beforeEach(async () => {
      const request: CreateNoteRequest = { title: 'To Delete', content: 'Delete me' };
      testNote = await firstValueFrom(service.createNote(request));
    });

    it('should delete existing note successfully', async () => {
      const result = await firstValueFrom(service.deleteNote(testNote.id));

      expect(result).toBe(true);

      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes).toHaveLength(0);
    });

    it('should save changes to localStorage after deletion', async () => {
      await firstValueFrom(service.deleteNote(testNote.id));

      const saved = JSON.parse(mockLocalStorage['notes-app-data']);
      expect(saved).toHaveLength(0);
    });

    it('should throw error for non-existent note ID', async () => {
      try {
        await firstValueFrom(service.deleteNote('non-existent-id'));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Note with id non-existent-id not found');
      }
    });

    it('should only delete the specified note when multiple exist', async () => {
      const request2: CreateNoteRequest = { title: 'Keep Me', content: 'Keep this note' };
      const note2 = await firstValueFrom(service.createNote(request2));

      await firstValueFrom(service.deleteNote(testNote.id));

      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(note2.id);
    });

    it('should handle localStorage errors during deletion', async () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          setItem: () => {
            throw new Error('Storage error');
          }
        },
        writable: true
      });

      try {
        await firstValueFrom(service.deleteNote(testNote.id));
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Failed to save notes to storage.');
      }
    });
  });

  describe('Search Notes', () => {
    beforeEach(async () => {
      // Create test notes with different titles and content
      await firstValueFrom(service.createNote({ title: 'JavaScript Tutorial', content: 'Learn about variables and functions' }));
      await firstValueFrom(service.createNote({ title: 'Python Basics', content: 'Understanding Python syntax and data types' }));
      await firstValueFrom(service.createNote({ title: 'Web Development', content: 'HTML, CSS, and JavaScript fundamentals' }));
      await firstValueFrom(service.createNote({ title: 'Database Design', content: 'SQL queries and relational database concepts' }));
      await firstValueFrom(service.createNote({ title: 'Advanced Topics', content: 'Deep dive into Python programming patterns' }));
    });

    it('should return all notes when search query is empty', async () => {
      const results = await firstValueFrom(service.searchNotes(''));

      expect(results).toHaveLength(5);
    });

    it('should return all notes when search query is only whitespace', async () => {
      const results = await firstValueFrom(service.searchNotes('   '));

      expect(results).toHaveLength(5);
    });

    it('should search by title case-insensitively', async () => {
      const results = await firstValueFrom(service.searchNotes('javascript'));

      expect(results).toHaveLength(2); // "JavaScript Tutorial" and "Web Development" (content contains JavaScript)
      expect(results.some(note => note.title === 'JavaScript Tutorial')).toBe(true);
    });

    it('should search by content case-insensitively', async () => {
      const results = await firstValueFrom(service.searchNotes('python'));

      expect(results).toHaveLength(2); // "Python Basics" title and content
      expect(results.some(note => note.title === 'Python Basics')).toBe(true);
    });

    it('should search both title and content', async () => {
      const results = await firstValueFrom(service.searchNotes('database'));

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Database Design');
    });

    it('should return empty array when no matches found', async () => {
      const results = await firstValueFrom(service.searchNotes('nonexistent'));

      expect(results).toHaveLength(0);
    });

    it('should trim whitespace from search query', async () => {
      const results = await firstValueFrom(service.searchNotes('  python  '));

      expect(results).toHaveLength(2);
    });

    it('should search with partial matches', async () => {
      const results = await firstValueFrom(service.searchNotes('dev'));

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Web Development');
    });

    it('should be reactive to notes changes', async () => {
      // Initial search
      let results = await firstValueFrom(service.searchNotes('react'));
      expect(results).toHaveLength(0);

      // Add a note with 'react' in title
      await firstValueFrom(service.createNote({ title: 'React Components', content: 'Learn about React components' }));

      // Search again
      results = await firstValueFrom(service.searchNotes('react'));
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('React Components');
    });

    it('should handle special characters in search query', async () => {
      await firstValueFrom(service.createNote({ title: 'C++ Programming', content: 'Object-oriented programming in C++' }));

      const results = await firstValueFrom(service.searchNotes('c++'));

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('C++ Programming');
    });
  });

  describe('Performance Requirements', () => {
    it('should handle large number of notes efficiently', async () => {
      // Create 1000 notes
      const promises = Array.from({ length: 1000 }, (_, i) =>
        firstValueFrom(service.createNote({
          title: `Note ${i}`,
          content: `Content for note ${i}`
        }))
      );

      await Promise.all(promises);

      const startTime = performance.now();
      const results = await firstValueFrom(service.searchNotes('note'));
      const endTime = performance.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(200); // Sub-200ms requirement
    });

    it('should search large notes efficiently', async () => {
      // Create note with large content
      const largeContent = 'word '.repeat(10000); // 50,000 characters
      await firstValueFrom(service.createNote({
        title: 'Large Note',
        content: largeContent
      }));

      const startTime = performance.now();
      const results = await firstValueFrom(service.searchNotes('word'));
      const endTime = performance.now();

      expect(results).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(200); // Sub-200ms requirement
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted note data gracefully', async () => {
      // Manually inject corrupted data
      mockLocalStorage['notes-app-data'] = JSON.stringify([
        { id: '1' }, // Missing required fields
        { title: 'Valid', content: 'Valid', createdAt: 'invalid-date', updatedAt: 'invalid-date' }
      ]);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create new service to trigger loading
      const newService = TestBed.inject(NotesService);

      const notes = await firstValueFrom(newService.getAllNotes());
      expect(notes).toEqual([]); // Should start fresh on corruption
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle concurrent operations gracefully', async () => {
      // Test concurrent creates
      const promises = Array.from({ length: 10 }, (_, i) =>
        firstValueFrom(service.createNote({
          title: `Concurrent Note ${i}`,
          content: `Content ${i}`
        }))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);

      const notes = await firstValueFrom(service.getAllNotes());
      expect(notes).toHaveLength(10);

      // All notes should have unique IDs
      const ids = notes.map(note => note.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });
  });

  describe('Data Persistence', () => {
    it('should maintain data consistency after multiple operations', async () => {
      // Create, update, delete operations
      const note1 = await firstValueFrom(service.createNote({ title: 'Note 1', content: 'Content 1' }));
      const note2 = await firstValueFrom(service.createNote({ title: 'Note 2', content: 'Content 2' }));

      await firstValueFrom(service.updateNote(note1.id, { title: 'Updated Note 1' }));
      await firstValueFrom(service.deleteNote(note2.id));

      // Verify localStorage matches current state
      const notes = await firstValueFrom(service.getAllNotes());
      const saved = JSON.parse(mockLocalStorage['notes-app-data']);

      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Updated Note 1');
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Updated Note 1');
    });

    it('should preserve date objects correctly in localStorage', async () => {
      const note = await firstValueFrom(service.createNote({ title: 'Date Test', content: 'Testing dates' }));

      // Create new service to simulate page refresh
      const newService = TestBed.inject(NotesService);
      const loadedNotes = await firstValueFrom(newService.getAllNotes());

      expect(loadedNotes[0].createdAt).toBeInstanceOf(Date);
      expect(loadedNotes[0].updatedAt).toBeInstanceOf(Date);
      expect(loadedNotes[0].createdAt.getTime()).toBe(note.createdAt.getTime());
    });
  });
});