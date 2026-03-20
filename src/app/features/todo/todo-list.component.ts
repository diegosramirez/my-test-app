import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';
import { TodoItem } from './todo.model';
import { AnalyticsService, ConsoleAnalyticsService } from './analytics.service';

interface PendingDelete {
  item: TodoItem;
  index: number;
  timerId: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: AnalyticsService, useClass: ConsoleAnalyticsService }],
  template: `
    <div class="todo-container">
      <h1>To-Do List</h1>

      @if (!todoService.storageAvailable()) {
        <div class="storage-notice" role="alert">
          Tasks won't persist after closing the tab (localStorage unavailable).
        </div>
      }

      <form class="todo-form" (ngSubmit)="onAdd()" novalidate>
        <div class="input-group">
          <input
            #titleInput
            type="text"
            [(ngModel)]="newTitle"
            name="title"
            placeholder="What needs to be done?"
            maxlength="200"
            [attr.aria-describedby]="validationHint() ? 'validation-hint' : null"
            (input)="onInputChange()"
            class="todo-input"
          />
          <button
            type="submit"
            class="add-btn"
            [disabled]="addDisabled()"
          >Add</button>
        </div>
        @if (validationHint()) {
          <p
            id="validation-hint"
            class="validation-hint"
            aria-live="assertive"
          >{{ validationHint() }}</p>
        }
      </form>

      @if (todoService.items().length === 0 && !pendingDelete()) {
        <div role="status" class="empty-state">
          <span class="empty-icon" aria-hidden="true">&#128203;</span>
          <p>No to-dos yet. Add one above!</p>
        </div>
      } @else {
        <ul class="todo-list">
          @for (item of todoService.items(); track item.id; let i = $index) {
            <li
              class="todo-item"
              [class.completed]="item.completed"
              [class.new-item]="item.id === lastAddedId()"
              [attr.data-id]="item.id"
            >
              <input
                type="checkbox"
                [checked]="item.completed"
                (change)="onToggle(item)"
                [attr.aria-label]="'Mark \\'' + item.title + '\\' as complete'"
                class="todo-checkbox"
              />
              <span class="todo-title">{{ item.title }}</span>
              <button
                type="button"
                (click)="onDelete(item, i)"
                [attr.aria-label]="'Delete \\'' + item.title + '\\''"
                class="delete-btn"
              >&times;</button>
            </li>
          }
        </ul>
      }

      @if (pendingDelete()) {
        <div class="undo-toast" role="status">
          <span>Deleted "{{ pendingDelete()!.item.title }}"</span>
          <button type="button" (click)="onUndo()" class="undo-btn">Undo</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .todo-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    h1 { text-align: center; margin-bottom: 1.5rem; }
    .storage-notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #856404;
    }
    .todo-form { margin-bottom: 1.5rem; }
    .input-group { display: flex; gap: 0.5rem; }
    .todo-input {
      flex: 1;
      padding: 0.75rem;
      font-size: 1rem;
      border: 2px solid #ccc;
      border-radius: 6px;
      min-height: 44px;
      box-sizing: border-box;
    }
    .todo-input:focus { border-color: #4a90d9; outline: none; }
    .add-btn {
      padding: 0 1.25rem;
      font-size: 1rem;
      min-width: 44px;
      min-height: 44px;
      border: none;
      border-radius: 6px;
      background: #4a90d9;
      color: white;
      cursor: pointer;
      font-weight: 600;
    }
    .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .add-btn:hover:not(:disabled) { background: #357abd; }
    .validation-hint {
      color: #c0392b;
      font-size: 0.875rem;
      margin: 0.25rem 0 0;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #888;
    }
    .empty-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-bottom: 1px solid #eee;
    }
    .todo-item.completed .todo-title {
      text-decoration: line-through;
      opacity: 0.55;
    }
    .todo-checkbox {
      min-width: 44px;
      min-height: 44px;
      width: 22px;
      height: 22px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .todo-title {
      flex: 1;
      word-break: break-word;
      font-size: 1rem;
    }
    .delete-btn {
      background: none;
      border: 1px solid #ddd;
      border-radius: 6px;
      min-width: 44px;
      min-height: 44px;
      font-size: 1.25rem;
      cursor: pointer;
      color: #c0392b;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .delete-btn:hover { background: #fdecea; }
    .undo-toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #333;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }
    .undo-btn {
      background: transparent;
      border: 1px solid white;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      font-size: 0.875rem;
    }
    .undo-btn:hover { background: rgba(255,255,255,0.15); }

    @media (prefers-reduced-motion: no-preference) {
      @keyframes fadeIn {
        from { background-color: #e8f4fd; }
        to { background-color: transparent; }
      }
      .new-item {
        animation: fadeIn 400ms ease-out;
      }
    }
  `],
})
export class TodoListComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly todoService = inject(TodoService);
  private readonly analytics = inject(AnalyticsService);

  @ViewChild('titleInput') titleInputRef!: ElementRef<HTMLInputElement>;

  newTitle = '';
  readonly validationHint = signal('');
  readonly addDisabled = signal(false);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly lastAddedId = signal<string | null>(null);

  private lastAddedTimer: ReturnType<typeof setTimeout> | null = null;
  private addDisabledTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  ngOnInit(): void {
    this.analytics.trackPageViewed(this.todoService.items().length);
  }

  ngAfterViewInit(): void {
    this.titleInputRef?.nativeElement?.focus();
  }

  ngOnDestroy(): void {
    // Finalize any pending delete
    const pending = this.pendingDelete();
    if (pending) {
      clearTimeout(pending.timerId);
      this.todoService.finalizeDelete();
      this.analytics.trackItemDeleted(pending.item.id);
    }
    if (this.lastAddedTimer) clearTimeout(this.lastAddedTimer);
    if (this.addDisabledTimer) clearTimeout(this.addDisabledTimer);
    this.destroyed = true;
  }

  onInputChange(): void {
    if (this.validationHint()) {
      this.validationHint.set('');
    }
  }

  onAdd(): void {
    const title = this.newTitle.trim();
    if (!title) {
      this.validationHint.set('Give your task a name first.');
      return;
    }

    const item = this.todoService.add(title);
    this.analytics.trackItemAdded(title, item.createdAt);
    this.newTitle = '';
    this.validationHint.set('');

    // Show new-item animation
    this.lastAddedId.set(item.id);
    if (this.lastAddedTimer) clearTimeout(this.lastAddedTimer);
    this.lastAddedTimer = setTimeout(() => this.lastAddedId.set(null), 500);

    // Debounce add button
    this.addDisabled.set(true);
    if (this.addDisabledTimer) clearTimeout(this.addDisabledTimer);
    this.addDisabledTimer = setTimeout(() => {
      if (!this.destroyed) this.addDisabled.set(false);
      this.addDisabledTimer = null;
    }, 200);

    // Return focus to input
    requestAnimationFrame(() => {
      if (!this.destroyed) this.titleInputRef?.nativeElement?.focus();
    });
  }

  onToggle(item: TodoItem): void {
    this.todoService.toggle(item.id);
    const toggled = this.todoService.items().find(i => i.id === item.id);
    this.analytics.trackItemToggled(item.id, toggled?.completed ?? !item.completed);
  }

  onDelete(item: TodoItem, index: number): void {
    // Finalize any previous pending delete
    const prev = this.pendingDelete();
    if (prev) {
      clearTimeout(prev.timerId);
      this.todoService.finalizeDelete();
      this.analytics.trackItemDeleted(prev.item.id);
    }

    const deleted = this.todoService.delete(item.id);
    if (!deleted) return;

    const timerId = setTimeout(() => {
      this.todoService.finalizeDelete();
      this.analytics.trackItemDeleted(deleted.id);
      this.pendingDelete.set(null);
    }, 4000);

    this.pendingDelete.set({ item: deleted, index, timerId });

    // Focus management: next item, previous item, or input
    // Use requestAnimationFrame to wait for Angular's DOM update cycle
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      const items = this.todoService.items();
      if (items.length > 0) {
        const targetIndex = index < items.length ? index : items.length - 1;
        const targetId = items[targetIndex].id;
        const el = document.querySelector<HTMLElement>(`.todo-item[data-id="${targetId}"] .todo-checkbox`);
        if (el) { el.focus(); return; }
      }
      this.titleInputRef?.nativeElement?.focus();
    });
  }

  onUndo(): void {
    const pending = this.pendingDelete();
    if (!pending) return;
    clearTimeout(pending.timerId);
    this.todoService.restoreDeleted(pending.item, pending.index);
    this.pendingDelete.set(null);
  }
}
