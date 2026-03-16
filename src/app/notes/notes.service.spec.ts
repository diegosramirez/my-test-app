import { TestBed } from '@angular/core/testing';
import { NotesService } from './notes.service';
import { NOTES_STORAGE_KEY, NotesEnvelope } from './note.model';

function createMockStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    _store: store,
  };
}

describe('NotesService', () => {
  let service: NotesService;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect storage availability', () => {
    expect(service.storageAvailable()).toBe(true);
  });

  it('should create a note', () => {
    const note = service.create('Test Title', 'Test Body');
    expect(note).toBeTruthy();
    expect(note!.title).toBe('Test Title');
    expect(note!.body).toBe('Test Body');
    expect(note!.id).toBeTruthy();
    expect(note!.createdAt).toBeTruthy();
    expect(service.getAll().length).toBe(1);
  });

  it('should reject empty title', () => {
    const note = service.create('   ', 'body');
    expect(note).toBeNull();
    expect(service.getAll().length).toBe(0);
  });

  it('should trim title on create', () => {
    const note = service.create('  Trimmed  ', 'body');
    expect(note!.title).toBe('Trimmed');
  });

  it('should persist to localStorage', () => {
    service.create('Persisted', 'body');
    const raw = mockStorage.getItem(NOTES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const envelope: NotesEnvelope = JSON.parse(raw!);
    expect(envelope.version).toBe(1);
    expect(envelope.notes.length).toBe(1);
    expect(envelope.notes[0].title).toBe('Persisted');
  });

  it('should get note by id', () => {
    const created = service.create('Find Me', 'body')!;
    const found = service.getById(created.id);
    expect(found).toBeTruthy();
    expect(found!.title).toBe('Find Me');
  });

  it('should return null for unknown id', () => {
    expect(service.getById('nonexistent')).toBeNull();
  });

  it('should update a note', async () => {
    const created = service.create('Original', 'body')!;
    // Ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));
    const updated = service.update(created.id, 'Updated', 'new body');
    expect(updated).toBeTruthy();
    expect(updated!.title).toBe('Updated');
    expect(updated!.body).toBe('new body');
    expect(updated!.updatedAt >= created.updatedAt).toBe(true);
  });

  it('should return null when updating nonexistent note', () => {
    expect(service.update('bad-id', 'Title', 'body')).toBeNull();
  });

  it('should delete a note', () => {
    const created = service.create('Delete Me', 'body')!;
    expect(service.delete(created.id)).toBe(true);
    expect(service.getAll().length).toBe(0);
  });

  it('should return false when deleting nonexistent note', () => {
    expect(service.delete('bad-id')).toBe(false);
  });

  it('should sort notes by updatedAt descending', async () => {
    service.create('First', 'body');
    await new Promise((r) => setTimeout(r, 10));
    service.create('Second', 'body');
    const notes = service.getAll();
    expect(notes[0].title).toBe('Second');
    expect(notes[1].title).toBe('First');
  });

  it('should handle corrupted localStorage gracefully', () => {
    mockStorage.setItem(NOTES_STORAGE_KEY, 'not valid json!!!');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Re-create service to trigger load
    const newService = new NotesService();
    expect(newService.getAll().length).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle QuotaExceededError', () => {
    const originalSetItem = mockStorage.setItem;
    let callCount = 0;
    mockStorage.setItem = (key: string, value: string) => {
      callCount++;
      // Allow the probe write but fail on actual storage
      if (key === NOTES_STORAGE_KEY) {
        const err = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw err;
      }
      originalSetItem.call(mockStorage, key, value);
    };
    const result = service.create('Overflow', 'big body');
    expect(result).toBeNull();
    expect(service.storageFull()).toBe(true);
  });

  it('should return storage size in bytes', () => {
    service.create('Size test', 'body');
    const size = service.getStorageSizeBytes();
    expect(size).toBeGreaterThan(0);
  });

  it('should increment notesCreatedThisSession', () => {
    expect(service.notesCreatedThisSession).toBe(0);
    service.create('One', 'body');
    expect(service.notesCreatedThisSession).toBe(1);
    service.create('Two', 'body');
    expect(service.notesCreatedThisSession).toBe(2);
  });

  it('should load existing notes from localStorage on init', () => {
    const envelope: NotesEnvelope = {
      version: 1,
      notes: [{
        id: 'existing-id',
        title: 'Pre-existing',
        body: 'body',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }],
    };
    mockStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(envelope));
    const newService = new NotesService();
    expect(newService.getAll().length).toBe(1);
    expect(newService.getAll()[0].title).toBe('Pre-existing');
  });
});
