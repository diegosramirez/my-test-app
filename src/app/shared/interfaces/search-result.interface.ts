export interface SearchResult<T = any> {
  id: string | number;
  displayValue: string;
  data: T;
  metadata?: Record<string, any>;
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  totalCount: number;
  query: string;
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface SearchOptions {
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
  cacheTimeout?: number;
}