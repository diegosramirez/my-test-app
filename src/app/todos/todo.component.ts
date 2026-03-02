import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';
import { TodoItem } from './todo.model';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.css']
})
export class TodoComponent implements OnInit {
  todos: TodoItem[] = [];
  newTitle: string = '';

  constructor(private todoService: TodoService) {}

  ngOnInit(): void {
    this.todos = this.todoService.getTodos();
  }

  addTodo(): void {
    const trimmed = this.newTitle.trim();
    if (!trimmed) {
      return;
    }
    this.todoService.addTodo(trimmed);
    this.newTitle = '';
  }

  toggleComplete(id: number): void {
    this.todoService.toggleComplete(id);
  }

  deleteTodo(id: number): void {
    this.todoService.deleteTodo(id);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addTodo();
    }
  }
}
