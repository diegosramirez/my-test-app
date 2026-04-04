export interface SearchResult {
  id: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface SearchState {
  query: string;
  loading: boolean;
  error: string | null;
  results: SearchResult[];
}