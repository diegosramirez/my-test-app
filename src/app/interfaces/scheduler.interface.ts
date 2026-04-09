export interface SchedulerConfig {
  pollingInterval: number; // 30 minutes in milliseconds
  maxRetries: number;
  baseBackoffDelay: number;
  maxBackoffDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
}

export interface WorkerMessage {
  type: 'FETCH_DATA' | 'HEARTBEAT' | 'STATUS' | 'STOP';
  payload?: any;
  timestamp: number;
}

export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'HEARTBEAT' | 'STATUS_UPDATE';
  payload?: any;
  timestamp: number;
  executionTime?: number;
  error?: string;
}

export interface PollResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
  responseTime: number;
  retryCount: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure: number;
  nextRetryAt: number;
}