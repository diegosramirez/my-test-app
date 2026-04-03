import { Routes } from '@angular/router';
import { NotesListComponent } from './components/notes-list/notes-list.component';
import { NoteEditorComponent } from './components/note-editor/note-editor.component';

export const routes: Routes = [
  {
    path: '',
    component: NotesListComponent,
    title: 'My Notes'
  },
  {
    path: 'editor',
    component: NoteEditorComponent,
    title: 'New Note'
  },
  {
    path: 'editor/:id',
    component: NoteEditorComponent,
    title: 'Edit Note'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
