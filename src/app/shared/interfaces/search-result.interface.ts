export interface SearchResult {
  id: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface TypeaheadState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  hasMinimumLength: boolean;
  selectedIndex: number;
}

export interface SearchError {
  message: string;
  code: string;
}