import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { Column, Task } from '../../models/kanban.models';
import { KanbanService } from '../../services/kanban.service';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDragPlaceholder, CardComponent],
  templateUrl: './column.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnComponent {
  @Input({ required: true }) column!: Column;
  @Input() allColumnIds: string[] = [];
  @Input() allColumnTitles: { [id: string]: string } = {};
  @Input() isAddFormOpen = false;
  @Output() addFormToggled = new EventEmitter<string | null>();

  @ViewChild('newTitleInput') newTitleInput!: ElementRef<HTMLInputElement>;

  private kanbanService = inject(KanbanService);

  newTitle = '';
  newDescription = '';
  newTitleTouched = false;
  editingTaskId: string | null = null;

  get newTitleInvalid(): boolean {
    return this.newTitleTouched && !this.newTitle.trim();
  }

  get dropListLabel(): string {
    const count = this.column.tasks.length;
    return `${this.column.title} column, ${count} task${count !== 1 ? 's' : ''}`;
  }

  toggleAddForm(): void {
    if (this.isAddFormOpen) {
      this.addFormToggled.emit(null);
      this.resetForm();
    } else {
      this.addFormToggled.emit(this.column.id);
      setTimeout(() => this.newTitleInput?.nativeElement?.focus());
    }
  }

  submitTask(): void {
    this.newTitleTouched = true;
    if (!this.newTitle.trim()) return;
    this.kanbanService.addTask(this.column.id, this.newTitle.trim(), this.newDescription.trim());
    this.resetForm();
    this.addFormToggled.emit(null);
  }

  cancelAdd(): void {
    this.resetForm();
    this.addFormToggled.emit(null);
  }

  onAddKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitTask();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelAdd();
    }
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    const sourceColumnId = event.previousContainer.id;
    const targetColumnId = event.container.id;
    if (sourceColumnId === targetColumnId && event.previousIndex === event.currentIndex) {
      return;
    }
    this.kanbanService.moveTask(sourceColumnId, targetColumnId, event.previousIndex, event.currentIndex);
  }

  onTaskUpdated(taskId: string, changes: Partial<Pick<Task, 'title' | 'description'>>): void {
    this.kanbanService.updateTask(taskId, changes);
  }

  onTaskDeleted(taskId: string): void {
    this.kanbanService.deleteTask(this.column.id, taskId);
  }

  onTaskMoved(taskId: string, targetColumnId: string): void {
    const sourceIndex = this.column.tasks.findIndex(t => t.id === taskId);
    if (sourceIndex === -1) return;
    this.kanbanService.moveTask(this.column.id, targetColumnId, sourceIndex, 0);
  }

  private resetForm(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newTitleTouched = false;
  }
}
