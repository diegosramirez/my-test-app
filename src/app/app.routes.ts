import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'todo',
    loadComponent: () =>
      import('./features/todo/todo-list.component').then(m => m.TodoListComponent),
  },
];
