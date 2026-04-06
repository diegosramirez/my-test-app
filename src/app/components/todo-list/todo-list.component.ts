import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, combineLatest } from 'rxjs';

import { TodoService } from '../../services/todo.service';
import { Todo, TodoFilter } from '../../models/todo.model';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css']
})
export class TodoListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  currentFilter: TodoFilter = 'all';
  newTodoText = '';
  characterCount = 0;
  maxCharacters = 500;
  isStorageUnavailable = false;

  filterOptions: { value: TodoFilter; label: string; ariaLabel: string }[] = [
    { value: 'all', label: 'All', ariaLabel: 'Show all todos' },
    { value: 'active', label: 'Active', ariaLabel: 'Show only active todos' },
    { value: 'completed', label: 'Completed', ariaLabel: 'Show only completed todos' }
  ];

  constructor(private todoService: TodoService) {
    this.maxCharacters = this.todoService.getCharacterLimit();
    this.isStorageUnavailable = !this.todoService.isStorageAvailable();
  }

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSubscriptions(): void {
    // Combine todos and filter to get filtered todos
    combineLatest([
      this.todoService.todos$,
      this.todoService.filter$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([todos, filter]) => {
      this.todos = todos;
      this.currentFilter = filter;
      this.filteredTodos = this.todoService.getFilteredTodos(todos, filter);
    });
  }

  onTextChange(): void {
    this.characterCount = this.newTodoText.length;
  }

  addTodo(): void {
    if (!this.canAddTodo()) {
      return;
    }

    const success = this.todoService.addTodo(this.newTodoText);
    if (success) {
      this.newTodoText = '';
      this.characterCount = 0;
    } else {
      // Show error feedback - in a real app this might be a toast/snackbar
      console.error('Failed to add todo');
    }
  }

  toggleTodo(id: string): void {
    const success = this.todoService.toggleTodo(id);
    if (!success) {
      console.error('Failed to toggle todo');
    }
  }

  deleteTodo(id: string): void {
    const success = this.todoService.deleteTodo(id);
    if (!success) {
      console.error('Failed to delete todo');
    }
  }

  setFilter(filter: TodoFilter): void {
    this.todoService.setFilter(filter);
  }

  canAddTodo(): boolean {
    return this.todoService.validateTodoText(this.newTodoText);
  }

  getActiveCount(): number {
    return this.todos.filter(todo => !todo.completed).length;
  }

  getCompletedCount(): number {
    return this.todos.filter(todo => todo.completed).length;
  }

  isCharacterLimitExceeded(): boolean {
    return this.characterCount > this.maxCharacters;
  }

  isCharacterLimitWarning(): boolean {
    return this.characterCount > this.maxCharacters * 0.8;
  }

  getCharacterCountClass(): string {
    if (this.isCharacterLimitExceeded()) {
      return 'character-count error';
    }
    if (this.isCharacterLimitWarning()) {
      return 'character-count warning';
    }
    return 'character-count';
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Ctrl+Enter to add todo
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      if (this.newTodoText.trim()) {
        this.addTodo();
      }
    }
  }

  onKeydown(event: KeyboardEvent, todo: Todo): void {
    // Delete key to remove todo (when focused on todo item)
    if (event.key === 'Delete' && event.target instanceof HTMLElement) {
      event.preventDefault();
      this.deleteTodo(todo.id);
    }
    // Space or Enter to toggle completion
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleTodo(todo.id);
    }
  }

  onDeleteButtonKeydown(event: KeyboardEvent, todoId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.deleteTodo(todoId);
    }
  }

  trackByTodo(index: number, todo: Todo): string {
    return todo.id;
  }
}