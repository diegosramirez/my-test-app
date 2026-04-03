export interface MarkdownPreviewState {
  rawContent: string;
  parsedHtml: string;
  isLoading: boolean;
  error?: string;
  lastUpdated: number;
  contentLength: number;
}

export interface MarkdownPreviewConfig {
  debounceMs: number;
  enableScrollSync: boolean;
  enableErrorIndicators: boolean;
  mobileStackThreshold: number; // px
  placeholder?: string;
  maxContentLength?: number;
}

export interface MarkdownContentChangeEvent {
  content: string;
  contentLength: number;
  timestamp: number;
}

export interface MarkdownParseCompleteEvent {
  html: string;
  parseTime: number;
  contentLength: number;
  timestamp: number;
}

export interface MarkdownErrorEvent {
  error: string;
  contentSnippet: string;
  lineNumber?: number;
  timestamp: number;
}

export interface MarkdownScrollSyncEvent {
  scrollPosition: number;
  scrollPercentage: number;
  panelType: 'input' | 'preview';
  timestamp: number;
}

// Event names for tracking
export const MARKDOWN_EVENTS = {
  INIT: 'markdown_preview_init',
  CONTENT_CHANGED: 'markdown_content_changed',
  PARSE_ERROR: 'markdown_parse_error',
  SCROLL_SYNC: 'markdown_scroll_sync'
} as const;