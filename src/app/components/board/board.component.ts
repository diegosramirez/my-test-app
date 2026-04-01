import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanService } from '../../services/kanban.service';
import { ColumnComponent } from '../column/column.component';
import { Board } from '../../models/kanban.models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, ColumnComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardComponent {
  private kanbanService = inject(KanbanService);

  board$: Observable<Board> = this.kanbanService.board$;
  activeAddFormColumnId: string | null = null;

  get allColumnIds(): string[] {
    return this.kanbanService.currentBoard.columns.map(c => c.id);
  }

  get allColumnTitles(): { [id: string]: string } {
    const titles: { [id: string]: string } = {};
    for (const col of this.kanbanService.currentBoard.columns) {
      titles[col.id] = col.title;
    }
    return titles;
  }

  get deleteBuffer() {
    return this.kanbanService.deleteBuffer;
  }

  onAddFormToggled(columnId: string | null): void {
    this.activeAddFormColumnId = columnId;
  }

  undoDelete(): void {
    this.kanbanService.undoDelete();
  }

  get totalTasks(): number {
    return this.kanbanService.currentBoard.columns.reduce((sum, c) => sum + c.tasks.length, 0);
  }

  get isBoardEmpty(): boolean {
    return this.totalTasks === 0;
  }
}
