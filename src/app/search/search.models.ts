export interface SearchResult {
  id: string;
  title: string;
  description: string;
}

export interface SearchQuery {
  query: string;
  timestamp: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface CacheEntry {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

export interface SearchState {
  query: string;
  isLoading: boolean;
  results: SearchResult[];
  error: string | null;
}

export interface SearchEvent {
  query: string;
  timestamp: number;
  source: 'api' | 'cache';
  duration: number;
  result_count: number;
}