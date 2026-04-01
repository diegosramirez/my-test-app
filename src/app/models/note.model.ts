/**
 * Shared Note interface — keep in sync with server/src/models/note.model.ts
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  errors: string[];
}

export type ViewState = 'idle' | 'loading' | 'success' | 'error';
