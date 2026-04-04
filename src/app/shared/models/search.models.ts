export interface SearchResult {
  id: string;
  title: string;
  description: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface ApiError {
  error: string;
  code: number;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;
}

export interface DeviceInfo {
  isMobile: boolean;
  debounceTime: number;
}

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';