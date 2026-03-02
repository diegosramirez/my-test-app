import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TodoItem {
  id: number;
  description: string;
  completed: boolean;
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h1>To-Do List</h1>

      <div>
        <input
          type="text"
          [(ngModel)]="newTaskDescription"
          (keyup.enter)="addTask()"
          placeholder="Enter a new task..."
          aria-label="New task description"
        />
        <button (click)="addTask()">Add</button>
      </div>

      <ul>
        <li *ngFor="let task of tasks">
          <input
            type="checkbox"
            [checked]="task.completed"
            (change)="toggleTask(task)"
            [attr.aria-label]="'Mark task complete: ' + task.description"
          />
          <span [style.text-decoration]="task.completed ? 'line-through' : 'none'">
            {{ task.description }}
          </span>
          <button (click)="removeTask(task.id)" aria-label="Remove task">Remove</button>
        </li>
      </ul>

      <p *ngIf="tasks.length === 0">No tasks yet. Add one above!</p>
    </div>
  `,
})
export class TodoComponent {
  newTaskDescription: string = '';
  tasks: TodoItem[] = [];
  private nextId: number = 1;

  addTask(): void {
    const trimmed = this.newTaskDescription.trim();
    if (!trimmed) {
      return;
    }

    this.tasks.push({
      id: this.nextId++,
      description: trimmed,
      completed: false,
    });

    this.newTaskDescription = '';
  }

  toggleTask(task: TodoItem): void {
    task.completed = !task.completed;
  }

  removeTask(id: number): void {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }
}
