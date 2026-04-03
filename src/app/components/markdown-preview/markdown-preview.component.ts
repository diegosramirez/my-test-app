import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil, throttleTime } from 'rxjs/operators';

import { MarkdownService } from '../../services/markdown.service';
import {
  MarkdownPreviewState,
  MarkdownPreviewConfig,
  MarkdownContentChangeEvent,
  MarkdownParseCompleteEvent,
  MarkdownErrorEvent,
  MarkdownScrollSyncEvent,
  MARKDOWN_EVENTS
} from './markdown-preview.interfaces';

@Component({
  selector: 'app-markdown-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './markdown-preview.component.html',
  styleUrls: ['./markdown-preview.component.css']
})
export class MarkdownPreviewComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() initialContent: string = '';
  @Input() config: Partial<MarkdownPreviewConfig> = {};
  @Input() disabled: boolean = false;

  @Output() contentChange = new EventEmitter<MarkdownContentChangeEvent>();
  @Output() parseComplete = new EventEmitter<MarkdownParseCompleteEvent>();
  @Output() parseError = new EventEmitter<MarkdownErrorEvent>();
  @Output() scrollSync = new EventEmitter<MarkdownScrollSyncEvent>();

  @ViewChild('textareaElement', { static: false }) textareaElement!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewElement', { static: false }) previewElement!: ElementRef<HTMLDivElement>;

  state: MarkdownPreviewState = {
    rawContent: '',
    parsedHtml: '',
    isLoading: false,
    lastUpdated: Date.now(),
    contentLength: 0
  };

  defaultConfig: MarkdownPreviewConfig = {
    debounceMs: 100,
    enableScrollSync: true,
    enableErrorIndicators: true,
    mobileStackThreshold: 768,
    placeholder: 'Enter your markdown here...',
    maxContentLength: 100000
  };

  componentConfig: MarkdownPreviewConfig;
  isMobileView: boolean = false;
  mobileShowPreview: boolean = false;
  componentId: string;

  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();
  private isScrollSyncing = false;

  constructor(
    private markdownService: MarkdownService,
    private cdr: ChangeDetectorRef
  ) {
    this.componentId = `markdown-preview-${Math.random().toString(36).substr(2, 9)}`;
    this.componentConfig = { ...this.defaultConfig };
  }

  ngOnInit(): void {
    // Merge user config with defaults
    this.componentConfig = { ...this.defaultConfig, ...this.config };

    // Set initial content
    this.state.rawContent = this.initialContent || '';
    this.state.contentLength = this.state.rawContent.length;

    // Setup debounced content processing
    this.contentChange$
      .pipe(
        debounceTime(this.componentConfig.debounceMs),
        takeUntil(this.destroy$)
      )
      .subscribe(content => {
        this.processMarkdown(content);
      });

    // Process initial content
    if (this.state.rawContent) {
      this.processMarkdown(this.state.rawContent);
    }

    // Check initial mobile view
    this.checkMobileView();

    // Emit initialization event
    this.emitTrackingEvent(MARKDOWN_EVENTS.INIT, {
      component_id: this.componentId,
      initial_content_length: this.state.contentLength
    });
  }

  ngAfterViewInit(): void {
    this.setupScrollSynchronization();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth < this.componentConfig.mobileStackThreshold;

    if (wasMobile !== this.isMobileView) {
      this.cdr.markForCheck();
    }
  }

  onContentChange(content: string): void {
    if (this.disabled) return;

    // Check content length limit
    if (this.componentConfig.maxContentLength &&
        content.length > this.componentConfig.maxContentLength) {
      this.state.error = `Content exceeds maximum length of ${this.componentConfig.maxContentLength} characters`;
      this.cdr.markForCheck();
      return;
    }

    this.state.rawContent = content;
    this.state.contentLength = content.length;
    this.state.error = undefined;
    this.state.lastUpdated = Date.now();

    // Emit content change event
    const changeEvent: MarkdownContentChangeEvent = {
      content,
      contentLength: content.length,
      timestamp: this.state.lastUpdated
    };
    this.contentChange.emit(changeEvent);

    // Trigger debounced processing
    this.contentChange$.next(content);

    this.cdr.markForCheck();
  }

  private processMarkdown(content: string): void {
    this.state.isLoading = true;
    this.cdr.markForCheck();

    // Use setTimeout to avoid blocking the UI thread
    setTimeout(async () => {
      const result = await this.markdownService.parseMarkdown(content);

      this.state.isLoading = false;
      this.state.parsedHtml = result.html;

      if (result.error) {
        this.state.error = result.error;

        // Emit error event
        const errorEvent: MarkdownErrorEvent = {
          error: result.error,
          contentSnippet: content.substring(0, 100),
          timestamp: Date.now()
        };
        this.parseError.emit(errorEvent);

        this.emitTrackingEvent(MARKDOWN_EVENTS.PARSE_ERROR, {
          error_type: 'parse',
          content_snippet: errorEvent.contentSnippet,
          line_number: null
        });
      } else {
        this.state.error = undefined;

        // Emit parse complete event
        const completeEvent: MarkdownParseCompleteEvent = {
          html: result.html,
          parseTime: result.parseTime,
          contentLength: content.length,
          timestamp: Date.now()
        };
        this.parseComplete.emit(completeEvent);

        this.emitTrackingEvent(MARKDOWN_EVENTS.CONTENT_CHANGED, {
          content_length: completeEvent.contentLength,
          parse_time_ms: completeEvent.parseTime,
          debounce_delay: this.componentConfig.debounceMs
        });
      }

      this.cdr.markForCheck();
    }, 0);
  }

  private setupScrollSynchronization(): void {
    if (!this.componentConfig.enableScrollSync) return;

    // Setup textarea scroll synchronization
    if (this.textareaElement?.nativeElement) {
      fromEvent(this.textareaElement.nativeElement, 'scroll')
        .pipe(
          throttleTime(16), // ~60fps
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.isScrollSyncing) {
            this.syncScroll('input');
          }
        });
    }

    // Setup preview scroll synchronization
    if (this.previewElement?.nativeElement) {
      fromEvent(this.previewElement.nativeElement, 'scroll')
        .pipe(
          throttleTime(16), // ~60fps
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.isScrollSyncing) {
            this.syncScroll('preview');
          }
        });
    }
  }

  private syncScroll(sourcePanel: 'input' | 'preview'): void {
    if (!this.textareaElement?.nativeElement || !this.previewElement?.nativeElement) {
      return;
    }

    this.isScrollSyncing = true;

    const sourceElement = sourcePanel === 'input'
      ? this.textareaElement.nativeElement
      : this.previewElement.nativeElement;

    const targetElement = sourcePanel === 'input'
      ? this.previewElement.nativeElement
      : this.textareaElement.nativeElement;

    const sourceScrollTop = sourceElement.scrollTop;
    const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
    const scrollPercentage = sourceScrollHeight > 0 ? sourceScrollTop / sourceScrollHeight : 0;

    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;
    const targetScrollTop = targetScrollHeight * scrollPercentage;

    targetElement.scrollTop = targetScrollTop;

    // Emit scroll sync event
    const syncEvent: MarkdownScrollSyncEvent = {
      scrollPosition: sourceScrollTop,
      scrollPercentage,
      panelType: sourcePanel,
      timestamp: Date.now()
    };
    this.scrollSync.emit(syncEvent);

    this.emitTrackingEvent(MARKDOWN_EVENTS.SCROLL_SYNC, {
      scroll_position: syncEvent.scrollPosition,
      panel_type: syncEvent.panelType
    });

    // Reset sync flag after a short delay
    setTimeout(() => {
      this.isScrollSyncing = false;
    }, 100);
  }

  // Public API methods
  updateContent(content: string): void {
    this.onContentChange(content);
  }

  clearContent(): void {
    this.updateContent('');
  }

  getHtml(): string {
    return this.state.parsedHtml;
  }

  getMarkdown(): string {
    return this.state.rawContent;
  }

  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  toggleMobileView(): void {
    this.mobileShowPreview = !this.mobileShowPreview;
    this.cdr.markForCheck();
  }

  private emitTrackingEvent(eventName: string, properties: Record<string, any>): void {
    // In a real application, this would integrate with your analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    } else {
      console.log(`Tracking Event: ${eventName}`, properties);
    }
  }
}