export interface CachedData<T = any> {
  id: string;
  data: T;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
  version: number;
  dataType: string;
  isStale: boolean;
  lastAccessedAt: number;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  staleThreshold: number; // Time in milliseconds before data is considered stale
}

export interface CacheStats {
  totalEntries: number;
  staleEntries: number;
  hitRatio: number;
  totalHits: number;
  totalMisses: number;
  storageSize: number;
  lastCleanup: number;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'clear' | 'cleanup';
  key: string;
  timestamp: number;
  success: boolean;
  dataSize?: number;
  error?: string;
}