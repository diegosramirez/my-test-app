import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Task } from '../../models/kanban.models';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDragHandle],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) columnId!: string;
  @Input() allColumnIds: string[] = [];
  @Input() allColumnTitles: { [id: string]: string } = {};
  @Output() taskUpdated = new EventEmitter<Partial<Pick<Task, 'title' | 'description'>>>();
  @Output() taskDeleted = new EventEmitter<void>();
  @Output() taskMoved = new EventEmitter<string>();
  @Output() editStarted = new EventEmitter<void>();
  @Output() editEnded = new EventEmitter<void>();

  @ViewChild('editTitleInput') editTitleInput!: ElementRef<HTMLInputElement>;
  @ViewChild('editButton') editButton!: ElementRef<HTMLButtonElement>;

  editing = false;
  editTitle = '';
  editDescription = '';
  editTitleTouched = false;

  get isEditing(): boolean {
    return this.editing;
  }

  get otherColumns(): string[] {
    return this.allColumnIds.filter(id => id !== this.columnId);
  }

  get editTitleInvalid(): boolean {
    return this.editTitleTouched && !this.editTitle.trim();
  }

  startEdit(): void {
    this.editing = true;
    this.editTitle = this.task.title;
    this.editDescription = this.task.description;
    this.editTitleTouched = false;
    this.editStarted.emit();
    setTimeout(() => this.editTitleInput?.nativeElement?.focus());
  }

  saveEdit(): void {
    this.editTitleTouched = true;
    if (!this.editTitle.trim()) return;
    this.taskUpdated.emit({
      title: this.editTitle.trim(),
      description: this.editDescription.trim(),
    });
    this.editing = false;
    this.editEnded.emit();
    setTimeout(() => this.editButton?.nativeElement?.focus());
  }

  cancelEdit(): void {
    this.editing = false;
    this.editEnded.emit();
    setTimeout(() => this.editButton?.nativeElement?.focus());
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  moveToColumn(targetColumnId: string): void {
    this.taskMoved.emit(targetColumnId);
  }
}
