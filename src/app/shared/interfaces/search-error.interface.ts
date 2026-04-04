export enum SearchErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  INVALID_QUERY = 'invalid_query',
  RATE_LIMITED = 'rate_limited',
  UNKNOWN = 'unknown'
}

export interface SearchError {
  type: SearchErrorType;
  message: string;
  retryCount: number;
  canRetry: boolean;
  originalError?: any;
  timestamp: Date;
}

export interface SearchState {
  isLoading: boolean;
  isDebouncing: boolean;
  error: SearchError | null;
  lastQuery: string;
  cacheHit: boolean;
}