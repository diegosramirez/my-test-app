import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'todos', pathMatch: 'full' },
  {
    path: 'todos',
    loadComponent: () =>
      import('./features/todo/todo-list.component').then(m => m.TodoListComponent),
  },
];
