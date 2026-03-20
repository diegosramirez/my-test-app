export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface TodoStorageEnvelope {
  version: number;
  tasks: TodoTask[];
}
