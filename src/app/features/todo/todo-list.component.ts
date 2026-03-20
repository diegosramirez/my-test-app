import {
  Component,
  OnInit,
  signal,
  computed,
  ViewChildren,
  QueryList,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { TodoTask } from './todo.model';
import { TodoStorageService } from './todo-storage.service';
import { TodoAnalyticsService } from './todo-analytics.service';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

@Component({
  standalone: true,
  selector: 'app-todo-list',
  template: `
    <div class="todo-card">
      <h1>My To-Dos</h1>

      <form class="input-row" (submit)="onSubmit($event)">
        <input
          #taskInput
          type="text"
          [value]="inputValue()"
          (input)="onInputChange($event)"
          placeholder="What do you need to do?"
          maxlength="200"
          aria-label="Task description"
        />
        <button type="submit">Add</button>
      </form>

      @if (showHint()) {
        <p class="validation-hint">Enter a task description first.</p>
      }

      @if (tasks().length === 0) {
        <p class="empty-state" aria-live="polite">No tasks yet — add one above!</p>
      }

      <div role="list" class="task-list">
        @for (task of tasks(); track task.id; let i = $index) {
          <div role="listitem" class="task-row" [class.completed]="task.completed">
            <input
              type="checkbox"
              [checked]="task.completed"
              (change)="toggleComplete(task.id)"
              [attr.aria-label]="'Mark task: ' + task.text"
            />
            <span class="task-text">{{ task.text }}</span>
            <button
              #deleteBtn
              class="delete-btn"
              (click)="deleteTask(task.id, i)"
              [attr.aria-label]="'Delete task: ' + task.text"
            >Delete</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      padding: 1rem;
      box-sizing: border-box;
    }

    .todo-card {
      width: 100%;
      max-width: 600px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
    }

    h1 {
      margin: 0 0 1rem;
      font-size: 1.5rem;
    }

    .input-row {
      display: flex;
      gap: 0.5rem;
    }

    .input-row input[type="text"] {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      min-width: 0;
    }

    .input-row button {
      padding: 0.5rem 1.25rem;
      font-size: 1rem;
      border: none;
      border-radius: 4px;
      background: #4a90d9;
      color: #fff;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
    }

    .input-row button:hover {
      background: #357abd;
    }

    .validation-hint {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: #888;
    }

    .empty-state {
      text-align: center;
      color: #888;
      padding: 2rem 0;
    }

    .task-list {
      margin-top: 1rem;
    }

    .task-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .task-row input[type="checkbox"] {
      margin-top: 0.25rem;
      min-width: 20px;
      min-height: 20px;
      cursor: pointer;
    }

    .task-text {
      flex: 1;
      overflow-wrap: break-word;
      word-break: break-word;
      min-width: 0;
    }

    .task-row.completed .task-text {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .delete-btn {
      min-width: 44px;
      min-height: 44px;
      border: none;
      border-radius: 4px;
      background: #e74c3c;
      color: #fff;
      cursor: pointer;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .delete-btn:hover {
      background: #c0392b;
    }

    @media (max-width: 480px) {
      .input-row {
        flex-direction: column;
      }

      .input-row button {
        width: 100%;
      }
    }
  `],
})
export class TodoListComponent implements OnInit, AfterViewInit {
  tasks = signal<TodoTask[]>([]);
  inputValue = signal('');
  showHint = signal(false);
  completedCount = computed(() => this.tasks().filter(t => t.completed).length);

  @ViewChild('taskInput') taskInputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('deleteBtn') deleteBtns!: QueryList<ElementRef<HTMLButtonElement>>;

  constructor(
    private storage: TodoStorageService,
    private analytics: TodoAnalyticsService,
  ) {}

  ngOnInit(): void {
    this.tasks.set(this.storage.load());
    this.analytics.trackPageViewed();
  }

  ngAfterViewInit(): void {
    this.taskInputRef?.nativeElement.focus();
  }

  onInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    if (this.showHint()) {
      this.showHint.set(false);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const text = this.inputValue().trim();
    if (!text) {
      this.showHint.set(true);
      this.analytics.trackAddBlocked('empty_input');
      return;
    }

    const task: TodoTask = {
      id: generateId(),
      text,
      completed: false,
      createdAt: Date.now(),
    };

    this.tasks.update(tasks => [...tasks, task]);
    this.inputValue.set('');
    // Clear the actual input element value
    if (this.taskInputRef) {
      this.taskInputRef.nativeElement.value = '';
    }
    this.storage.save(this.tasks());
    this.analytics.trackTaskAdded(text, this.tasks().length);
    this.showHint.set(false);

    // Retain focus on input for rapid entry
    this.taskInputRef?.nativeElement.focus();
  }

  toggleComplete(id: string): void {
    this.tasks.update(tasks =>
      tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
    this.storage.save(this.tasks());
    const toggledTask = this.tasks().find(t => t.id === id);
    if (toggledTask?.completed) {
      this.analytics.trackTaskCompleted(id, this.completedCount());
    }
  }

  deleteTask(id: string, index: number): void {
    // TODO: undo toast — fast follow
    this.tasks.update(tasks => tasks.filter(t => t.id !== id));
    this.storage.save(this.tasks());
    this.analytics.trackTaskDeleted(id, this.tasks().length);

    // Focus management: move to next task's delete button, or input if empty
    setTimeout(() => {
      const btns = this.deleteBtns?.toArray();
      if (btns && btns.length > 0) {
        const nextIndex = Math.min(index, btns.length - 1);
        btns[nextIndex].nativeElement.focus();
      } else {
        this.taskInputRef?.nativeElement.focus();
      }
    });
  }
}
