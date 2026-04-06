import { Routes } from '@angular/router';
import { TodoListComponent } from './components/todo-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/todos', pathMatch: 'full' },
  { path: 'todos', component: TodoListComponent },
  { path: '**', redirectTo: '/todos' }
];
