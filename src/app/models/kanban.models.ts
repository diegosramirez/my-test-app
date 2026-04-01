export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Board {
  columns: Column[];
}
