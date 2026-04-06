/**
 * Task interface representing a todo item with strongly typed properties
 */
export interface Task {
  /** Unique identifier for the task (UUID) */
  id: string;
  /** Text content of the task */
  text: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Timestamp when the task was created */
  createdAt: Date;
}

/**
 * Task status enumeration for type safety
 */
export type TaskStatus = 'active' | 'completed';

/**
 * Filter options for displaying different task subsets
 */
export type TaskFilter = 'all' | 'active' | 'completed';

/**
 * Result type for localStorage operations with error handling
 */
export interface TaskOperationResult {
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Configuration for task persistence operations
 */
export interface TaskPersistenceConfig {
  readonly storageKey: string;
  readonly fallbackToMemory: boolean;
  readonly validateData: boolean;
}