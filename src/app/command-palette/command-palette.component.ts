import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { Command } from './command.model';
import { CommandRegistryService } from './command-registry.service';
import { FuzzySearchService } from './fuzzy-search.service';
import { RecentCommandsService } from './recent-commands.service';
import { AnalyticsService } from '../shared/analytics.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="palette-backdrop"
        [class.palette-closing]="isClosing"
        (click)="dismissViaClickOutside()"
        aria-hidden="true"
      ></div>
      <div
        class="palette-container"
        [class.palette-closing]="isClosing"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        (animationend)="onAnimationEnd()"
      >
        <div class="palette-content" (click)="$event.stopPropagation()">
          <input
            #searchInput
            class="palette-input"
            type="text"
            role="combobox"
            [attr.aria-expanded]="displayedItems.length > 0"
            aria-controls="palette-listbox"
            [attr.aria-activedescendant]="displayedItems.length > 0 ? 'palette-item-' + selectedIndex : null"
            aria-autocomplete="list"
            placeholder="Type a command or search\u2026"
            [maxLength]="120"
            [value]="query"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)"
          />
          <div aria-live="polite" class="sr-only">
            {{ resultCountAnnouncement }}
          </div>
          <div
            id="palette-listbox"
            role="listbox"
            class="palette-results"
            aria-label="Command results"
          >
            @if (showRecentHeader && !query && recentItems.length > 0) {
              <div class="palette-section-header">Recent</div>
            }
            @if (displayedItems.length === 0 && !query && allCommands.length === 0) {
              <div class="palette-empty">No commands available</div>
            }
            @if (displayedItems.length === 0 && query) {
              <div class="palette-empty">No results for '{{ query }}' &mdash; Try a different keyword</div>
            }
            @for (item of displayedItems; track item.id; let i = $index) {
              <div
                [id]="'palette-item-' + i"
                role="option"
                class="palette-item"
                [class.palette-item-selected]="i === selectedIndex"
                [attr.aria-selected]="i === selectedIndex"
                (mouseenter)="onMouseEnter(i)"
                (click)="executeCommand(item)"
              >
                @if (item.icon) {
                  <span class="palette-item-icon" aria-hidden="true">{{ item.icon }}</span>
                }
                <span class="palette-item-label">{{ item.label }}</span>
                <span
                  class="palette-item-category"
                  [class.category-navigation]="item.category === 'navigation'"
                  [class.category-action]="item.category === 'action'"
                >{{ item.category === 'navigation' ? 'Navigation' : 'Action' }}</span>
                @if (item.shortcutHint) {
                  <span class="palette-item-shortcut">{{ item.shortcutHint }}</span>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 9998;
      animation: fadeIn 150ms ease-out forwards;
    }
    .palette-backdrop.palette-closing {
      animation: fadeOut 150ms ease-out forwards;
    }

    .palette-container {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15vh;
      pointer-events: none;
      animation: paletteOpen 150ms ease-out forwards;
      will-change: transform, opacity;
    }
    .palette-container.palette-closing {
      animation: paletteClose 150ms ease-out forwards;
    }

    .palette-content {
      pointer-events: auto;
      width: 100%;
      max-width: 640px;
      margin: 0 16px;
      background: var(--palette-bg, #ffffff);
      border: 1px solid var(--palette-border, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .palette-input {
      width: 100%;
      padding: 16px 20px;
      border: none;
      outline: none;
      font-size: 16px;
      background: transparent;
      color: var(--palette-text, #1a202c);
      border-bottom: 1px solid var(--palette-border, #e2e8f0);
      box-sizing: border-box;
    }
    .palette-input::placeholder {
      color: var(--palette-muted, #a0aec0);
    }

    .palette-results {
      max-height: 360px;
      overflow-y: auto;
      padding: 8px 0;
    }

    .palette-section-header {
      padding: 8px 20px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--palette-muted, #a0aec0);
    }

    .palette-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      cursor: pointer;
      min-height: 44px;
      box-sizing: border-box;
      color: var(--palette-text, #1a202c);
    }
    .palette-item:hover,
    .palette-item-selected {
      background: var(--palette-highlight, #edf2f7);
    }

    .palette-item-icon {
      flex-shrink: 0;
      width: 20px;
      text-align: center;
    }

    .palette-item-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }

    .palette-item-category {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .category-navigation {
      background: var(--badge-nav-bg, #ebf8ff);
      color: var(--badge-nav-text, #2b6cb0);
    }
    .category-action {
      background: var(--badge-action-bg, #fffbeb);
      color: var(--badge-action-text, #b7791f);
    }

    .palette-item-shortcut {
      flex-shrink: 0;
      font-size: 12px;
      font-family: monospace;
      color: var(--palette-muted, #a0aec0);
      padding: 2px 6px;
      background: var(--palette-shortcut-bg, #f7fafc);
      border-radius: 4px;
      border: 1px solid var(--palette-border, #e2e8f0);
    }

    .palette-empty {
      padding: 24px 20px;
      text-align: center;
      font-size: 14px;
      color: var(--palette-muted, #a0aec0);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes paletteOpen {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes paletteClose {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    @media screen and (max-width: 640px) {
      .palette-container {
        padding-top: 0;
        align-items: flex-start;
      }
      .palette-content {
        max-width: 100%;
        margin: 0;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-top: none;
      }
      .palette-item {
        min-height: 44px;
        padding: 12px 20px;
      }
    }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private registry = inject(CommandRegistryService);
  private fuzzySearch = inject(FuzzySearchService);
  private recentService = inject(RecentCommandsService);
  private analytics = inject(AnalyticsService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  isClosing = false;
  query = '';
  selectedIndex = 0;
  displayedItems: Command[] = [];
  recentItems: Command[] = [];
  allCommands: Command[] = [];
  showRecentHeader = true;
  resultCountAnnouncement = '';

  private querySubject = new Subject<string>();
  private querySequence = 0;
  private subscriptions: Subscription[] = [];
  private openTimestamp = 0;
  private previousActiveElement: Element | null = null;
  private pendingClose = false;

  ngOnInit(): void {
    const querySub = this.querySubject.pipe(
      debounceTime(100)
    ).subscribe(query => {
      // Discard stale debounced results if query was cleared in the meantime
      if (this.query === query) {
        this.performSearch(query);
      }
    });
    this.subscriptions.push(querySub);

    const routerSub = this.router.events.pipe(
      filter((event): event is NavigationStart => event instanceof NavigationStart)
    ).subscribe(() => {
      if (this.isOpen && !this.isClosing) {
        this.analytics.track('command_palette_dismissed', {
          had_query: this.query.length > 0,
          dismiss_method: 'route_change',
        });
        this.closeWithAnimation();
      }
    });
    this.subscriptions.push(routerSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (this.isOpen) {
        // Idempotent: clear query and refocus
        this.query = '';
        this.loadRecentItems();
        this.displayedItems = this.recentItems;
        this.selectedIndex = this.displayedItems.length > 0 ? 0 : -1;
        this.announceResultCount();
        setTimeout(() => {
          this.searchInput?.nativeElement?.focus();
        });
      } else {
        this.open('keyboard');
      }
    }
  }

  open(triggerMethod: 'keyboard' | 'ui'): void {
    if (this.isOpen || this.isClosing) {
      return; // Guard against rapid toggling
    }
    // TODO: SSR guard
    this.previousActiveElement = document.activeElement;
    this.openTimestamp = Date.now();
    this.isOpen = true;
    this.isClosing = false;
    this.query = '';
    this.allCommands = this.registry.getAll();
    this.loadRecentItems();
    this.displayedItems = this.recentItems;
    this.selectedIndex = this.displayedItems.length > 0 ? 0 : -1;
    this.announceResultCount();

    this.analytics.track('command_palette_opened', { trigger_method: triggerMethod });

    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query = value;
    // Increment sequence to invalidate any pending debounced search
    this.querySequence++;
    if (!value.trim()) {
      this.displayedItems = this.recentItems;
      this.selectedIndex = this.displayedItems.length > 0 ? 0 : -1;
      this.showRecentHeader = true;
      this.announceResultCount();
    } else {
      this.showRecentHeader = false;
      this.querySubject.next(value);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.displayedItems.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.displayedItems.length;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.displayedItems.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + this.displayedItems.length) % this.displayedItems.length;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedIndex >= 0 && this.selectedIndex < this.displayedItems.length) {
        this.executeCommand(this.displayedItems[this.selectedIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss('escape');
    } else if (event.key === 'Tab') {
      // Focus trap: prevent Tab and Shift+Tab from leaving the palette
      event.preventDefault();
    }
  }

  onMouseEnter(index: number): void {
    this.selectedIndex = index;
  }

  executeCommand(command: Command): void {
    const durationMs = Date.now() - this.openTimestamp;
    try {
      // Apply theme change before closing animation to prevent visual flash
      command.execute();
    } catch (error) {
      console.error(`Command execution failed for '${command.id}':`, error);
    }

    this.recentService.pushRecent(command.id);

    this.analytics.track('command_palette_executed', {
      command_id: command.id,
      command_category: command.category,
      query_text: this.query,
      duration_ms: durationMs,
    });

    this.closeWithAnimation();
  }

  dismissViaClickOutside(): void {
    this.dismiss('click_outside');
  }

  private dismiss(method: 'escape' | 'click_outside'): void {
    this.analytics.track('command_palette_dismissed', {
      had_query: this.query.length > 0,
      dismiss_method: method,
    });
    this.closeWithAnimation();
  }

  private closeWithAnimation(): void {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;
    this.pendingClose = true;
  }

  onAnimationEnd(): void {
    if (this.pendingClose) {
      this.isOpen = false;
      this.isClosing = false;
      this.pendingClose = false;
      this.restoreFocus();
    }
  }

  private restoreFocus(): void {
    // TODO: SSR guard
    if (this.previousActiveElement && this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  private loadRecentItems(): void {
    if (this.recentService.isStorageAvailable()) {
      this.recentItems = this.recentService.getRecent();
      this.showRecentHeader = true;
    } else {
      this.recentItems = [];
      this.showRecentHeader = false;
    }
  }

  private performSearch(query: string): void {
    this.allCommands = this.registry.getAll();
    const results = this.fuzzySearch.search(query, this.allCommands);

    this.displayedItems = results.map(r => r.command);
    this.selectedIndex = this.displayedItems.length > 0 ? 0 : -1;
    this.announceResultCount();

    if (this.displayedItems.length === 0 && query.trim()) {
      this.analytics.track('command_palette_no_results', { query_text: query });
    }
  }

  private announceResultCount(): void {
    if (this.query) {
      this.resultCountAnnouncement =
        this.displayedItems.length === 0
          ? 'No results found'
          : `${this.displayedItems.length} result${this.displayedItems.length === 1 ? '' : 's'} available`;
    } else {
      this.resultCountAnnouncement =
        this.recentItems.length > 0
          ? `${this.recentItems.length} recent item${this.recentItems.length === 1 ? '' : 's'}`
          : '';
    }
  }
}
