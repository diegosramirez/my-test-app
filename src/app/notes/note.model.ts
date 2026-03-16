export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesEnvelope {
  version: 1;
  notes: Note[];
}

export const NOTES_STORAGE_KEY = 'my-test-app-notes';
