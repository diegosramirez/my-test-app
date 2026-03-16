import { Routes } from '@angular/router';
import { NotesListComponent } from './notes/notes-list.component';
import { NoteEditorComponent } from './notes/note-editor.component';

export const routes: Routes = [
  { path: 'notes', component: NotesListComponent },
  { path: 'notes/new', component: NoteEditorComponent },
  { path: 'notes/:id/edit', component: NoteEditorComponent },
  { path: '', redirectTo: 'notes', pathMatch: 'full' },
];
