import { Component } from '@angular/core';
import { TodoComponent } from './todo/todo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoComponent],
  template: `
    <main>
      <h1>My Test App</h1>
      <app-todo></app-todo>
    </main>
  `,
})
export class AppComponent {}
