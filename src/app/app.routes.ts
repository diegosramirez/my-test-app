import { Routes } from '@angular/router';
import { NotesListComponent } from './components/notes-list/notes-list';
import { NoteDetailComponent } from './components/note-detail/note-detail';
import { NoteFormComponent } from './components/note-form/note-form';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'notes', pathMatch: 'full' },
  {
    path: 'notes',
    component: NotesListComponent,
    children: [
      { path: 'new', component: NoteFormComponent, canDeactivate: [unsavedChangesGuard] },
      { path: ':id', component: NoteDetailComponent },
      { path: ':id/edit', component: NoteFormComponent, canDeactivate: [unsavedChangesGuard] }
    ]
  }
];
