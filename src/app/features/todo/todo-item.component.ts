import { Component, input, output } from '@angular/core';
import { Todo } from './todo.model';

@Component({
  selector: 'app-todo-item',
  standalone: true,
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.css',
})
export class TodoItemComponent {
  readonly todo = input.required<Todo>();
  readonly toggled = output<string>();
  readonly deleted = output<string>();
}
