export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  api: ApiHealthStatus;
  cache: CacheHealthStatus;
  worker: WorkerHealthStatus;
  lastUpdate: number;
}

export interface ApiHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  successRate: number;
  lastSuccessfulFetch: number;
  rateLimitRemaining: number;
  consecutiveFailures: number;
}

export interface CacheHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  hitRatio: number;
  storageUsage: number;
  staleDataPercentage: number;
  corruptedEntries: number;
  lastCleanup: number;
}

export interface WorkerHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  isActive: boolean;
  lastHeartbeat: number;
  totalPolls: number;
  failedPolls: number;
  averageExecutionTime: number;
}

export interface PerformanceMetrics {
  apiResponseTimes: number[];
  cacheOperationTimes: number[];
  workerExecutionTimes: number[];
  memoryUsage: number;
  timestamp: number;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  resolved: boolean;
  component: 'api' | 'cache' | 'worker' | 'system';
}