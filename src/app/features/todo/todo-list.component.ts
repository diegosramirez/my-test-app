import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoItemComponent } from './todo-item.component';
import { TodoService } from './todo.service';
import { StorageAdapter } from '../../core/storage-adapter.service';
import { AnalyticsService } from '../../core/analytics.service';
import { TodoFilter } from './todo.model';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  protected readonly todoService = inject(TodoService);
  protected readonly storage = inject(StorageAdapter);
  private readonly analytics = inject(AnalyticsService);

  protected readonly filter = signal<TodoFilter>('all');
  protected readonly inputValue = signal('');

  protected readonly filteredTodos = computed(() => {
    const todos = this.todoService.todos();
    const f = this.filter();
    if (f === 'active') return todos.filter(t => !t.completed);
    if (f === 'completed') return todos.filter(t => t.completed);
    return todos;
  });

  protected readonly emptyStateMessage = computed(() => {
    if (this.filteredTodos().length > 0) return '';
    if (!this.todoService.hasEverHadTodos()) return 'Add your first task above to get started';
    const f = this.filter();
    if (f === 'completed') return 'No completed tasks yet';
    if (f === 'active') return 'Everything is done! \u{1F389}';
    return '';
  });

  protected readonly itemsLeftText = computed(() => {
    const count = this.todoService.activeCount();
    return count === 1 ? '1 item left' : `${count} items left`;
  });

  onSubmit(): void {
    const value = this.inputValue();
    this.inputValue.set('');
    this.todoService.add(value);
  }

  setFilter(f: TodoFilter): void {
    this.filter.set(f);
    this.analytics.track('todo_filter_changed', { filter: f });
  }

  onToggle(id: string): void {
    this.todoService.toggle(id);
  }

  onDelete(id: string): void {
    this.todoService.remove(id);
  }
}
