import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Board, Task } from '../models/kanban.models';

export interface DeleteBuffer {
  task: Task;
  columnId: string;
  index: number;
}

@Injectable({ providedIn: 'root' })
export class KanbanService {
  private readonly _board = new BehaviorSubject<Board>(this.createInitialBoard());
  readonly board$: Observable<Board> = this._board.asObservable();

  private _deleteBuffer: DeleteBuffer | null = null;
  private _deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  get deleteBuffer(): DeleteBuffer | null {
    return this._deleteBuffer;
  }

  get currentBoard(): Board {
    return this._board.value;
  }

  private createInitialBoard(): Board {
    return {
      columns: [
        {
          id: 'todo',
          title: 'Todo',
          tasks: [
            {
              id: crypto.randomUUID(),
              title: 'Research project requirements',
              description: 'Gather and document all functional and non-functional requirements for the new project.',
              createdAt: Date.now() - 3600000,
            },
            {
              id: crypto.randomUUID(),
              title: 'Set up development environment',
              description: 'Install dependencies, configure linters, and verify build pipeline.',
              createdAt: Date.now() - 1800000,
            },
          ],
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          tasks: [
            {
              id: crypto.randomUUID(),
              title: 'Design database schema',
              description: 'Create entity-relationship diagrams and define table structures.',
              createdAt: Date.now() - 7200000,
            },
          ],
        },
        {
          id: 'done',
          title: 'Done',
          tasks: [
            {
              id: crypto.randomUUID(),
              title: 'Create project repository',
              description: 'Initialize Git repository with README and license.',
              createdAt: Date.now() - 86400000,
            },
          ],
        },
      ],
    };
  }

  addTask(columnId: string, title: string, description: string): void {
    const board = structuredClone(this._board.value);
    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;
    column.tasks.push({
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: Date.now(),
    });
    this._board.next(board);
  }

  updateTask(taskId: string, changes: Partial<Pick<Task, 'title' | 'description'>>): void {
    const board = structuredClone(this._board.value);
    for (const column of board.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) {
        if (changes.title !== undefined) task.title = changes.title;
        if (changes.description !== undefined) task.description = changes.description;
        this._board.next(board);
        return;
      }
    }
  }

  deleteTask(columnId: string, taskId: string): void {
    // Commit any existing pending delete (permanently discard it) before starting a new one
    if (this._deleteTimeout) {
      clearTimeout(this._deleteTimeout);
      this._deleteTimeout = null;
    }
    this._deleteBuffer = null;

    const board = structuredClone(this._board.value);
    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;

    const index = column.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const [task] = column.tasks.splice(index, 1);
    this._deleteBuffer = { task, columnId, index };
    this._board.next(board);

    this._deleteTimeout = setTimeout(() => {
      this._deleteBuffer = null;
      this._deleteTimeout = null;
    }, 5000);
  }

  undoDelete(): void {
    if (!this._deleteBuffer) return;

    if (this._deleteTimeout) {
      clearTimeout(this._deleteTimeout);
      this._deleteTimeout = null;
    }

    const { task, columnId, index } = this._deleteBuffer;
    this._deleteBuffer = null;

    const board = structuredClone(this._board.value);
    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;

    const insertIndex = Math.min(index, column.tasks.length);
    column.tasks.splice(insertIndex, 0, task);
    this._board.next(board);
  }

  moveTask(
    sourceColumnId: string,
    targetColumnId: string,
    previousIndex: number,
    currentIndex: number
  ): void {
    if (sourceColumnId === targetColumnId && previousIndex === currentIndex) {
      return;
    }

    const board = structuredClone(this._board.value);
    const source = board.columns.find(c => c.id === sourceColumnId);
    const target = board.columns.find(c => c.id === targetColumnId);
    if (!source || !target) return;

    const [moved] = source.tasks.splice(previousIndex, 1);
    if (!moved) return;
    target.tasks.splice(currentIndex, 0, moved);
    this._board.next(board);
  }
}
