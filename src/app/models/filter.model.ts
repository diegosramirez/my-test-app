export type WatchedFilter = 'all' | 'watched' | 'unwatched';

export interface FilterState {
  watchedFilter: WatchedFilter;
  searchQuery: string;
}

export interface SearchState {
  query: string;
  debounceTimer: number | null;
}