export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchState {
  loading: boolean;
  error: SearchError | null;
  retryCount: number;
  results: SearchResult[];
  hasMore?: boolean;
}

export interface SearchConfig {
  debounceMs: number;
  maxRetries: number;
  endpoint: string;
  resultLimit: number;
  minQueryLength: number;
}

export interface TypeaheadState {
  query: string;
  selectedIndex: number;
  isDropdownVisible: boolean;
  ariaAttributes: {
    expanded: boolean;
    activedescendant: string | null;
  };
}

export class SearchError extends Error {
  constructor(
    message: string,
    public retryCount: number = 0,
    public originalError?: unknown,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  hasMore?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export type SearchFunction = (request: SearchRequest) => Observable<SearchResponse>;

import { Observable } from 'rxjs';