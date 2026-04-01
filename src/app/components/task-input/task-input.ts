import { Component, output, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="task-input-form" (ngSubmit)="onSubmit()">
      <input
        #inputEl
        type="text"
        data-testid="task-input"
        class="task-input"
        [(ngModel)]="title"
        name="title"
        placeholder="What needs to be done?"
        autocomplete="off"
      />
      <button type="submit" data-testid="add-button" class="add-btn">
        <span class="add-btn-text">Add</span>
        <span class="add-btn-icon">+</span>
      </button>
    </form>
  `,
  styles: [`
    .task-input-form {
      display: flex;
      gap: 0.5rem;
    }

    .task-input {
      flex: 1;
      padding: 0.875rem 1rem;
      font-size: 1rem;
      border: 2px solid #e6e6e6;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s ease;
      font-family: inherit;
    }

    .task-input:focus {
      border-color: #5dc2af;
    }

    .task-input::placeholder {
      color: #b3b3b3;
      font-style: italic;
    }

    .add-btn {
      padding: 0.875rem 1.25rem;
      background: #5dc2af;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 600;
      min-width: 44px;
      min-height: 44px;
      transition: background 0.2s ease;
    }

    .add-btn:hover {
      background: #4aa897;
    }

    .add-btn:focus-visible {
      outline: 2px solid #4d90fe;
      outline-offset: 2px;
    }

    .add-btn-icon {
      display: none;
      font-size: 1.5rem;
      line-height: 1;
    }

    @media (max-width: 479px) {
      .add-btn-text {
        display: none;
      }
      .add-btn-icon {
        display: inline;
      }
    }
  `]
})
export class TaskInput {
  title = '';
  addTask = output<string>();
  private inputEl = viewChild.required<ElementRef<HTMLInputElement>>('inputEl');

  onSubmit(): void {
    const trimmed = this.title.trim();
    if (trimmed) {
      this.addTask.emit(trimmed);
    }
    this.title = '';
    this.inputEl().nativeElement.focus();
  }
}
