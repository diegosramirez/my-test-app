import { Routes } from '@angular/router';
import { TodoComponent } from './todos/todo.component';

export const routes: Routes = [
  { path: 'todos', component: TodoComponent },
  { path: '', redirectTo: 'todos', pathMatch: 'full' }
];
