import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CommandPaletteComponent } from './command-palette.component';
import { CommandRegistryService } from './command-registry.service';
import { AnalyticsService } from '../shared/analytics.service';
import { RecentCommandsService } from './recent-commands.service';
import { Command } from './command.model';

describe('CommandPaletteComponent', () => {
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let component: CommandPaletteComponent;
  let registry: CommandRegistryService;
  let analytics: AnalyticsService;
  let analyticsSpy: ReturnType<typeof vi.spyOn>;

  const makeCommand = (id: string, label: string, keywords: string[] = [], category: 'navigation' | 'action' = 'navigation'): Command => ({
    id,
    label,
    category,
    keywords,
    execute: vi.fn(),
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    registry = TestBed.inject(CommandRegistryService);
    analytics = TestBed.inject(AnalyticsService);
    analyticsSpy = vi.spyOn(analytics, 'track');

    fixture = TestBed.createComponent(CommandPaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function openPalette(method: 'keyboard' | 'ui' = 'keyboard') {
    component.open(method);
    // Double detectChanges to satisfy Angular dev-mode ExpressionChanged check
    // after imperatively toggling isOpen from false to true
    fixture.detectChanges();
    vi.advanceTimersByTime(1); // flush setTimeout for focus
    fixture.detectChanges();
  }

  function getElement(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function simulateInput(value: string) {
    const input = getElement('.palette-input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  // --- Palette Opens ---

  it('should not render palette initially', () => {
    expect(getElement('[role="dialog"]')).toBeNull();
  });

  it('should open via open() method and fire analytics', () => {
    openPalette('ui');
    expect(getElement('[role="dialog"]')).toBeTruthy();
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_opened', { trigger_method: 'ui' });
  });

  it('should open via keyboard shortcut (Ctrl+K)', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    fixture.detectChanges();
    expect(component.isOpen).toBe(true);
    expect(preventSpy).toHaveBeenCalled();
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_opened', { trigger_method: 'keyboard' });
  });

  it('should open via Meta+K (macOS)', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    fixture.detectChanges();
    expect(component.isOpen).toBe(true);
  });

  it('should not open when already closing (rapid toggle guard)', () => {
    openPalette();
    component.isClosing = true;
    component.open('ui');
    // Should still be in closing state, not reopened
    expect(component.isClosing).toBe(true);
  });

  // --- Idempotent Cmd+K when open ---

  it('should clear query and refocus when Cmd+K pressed while open', () => {
    registry.register(makeCommand('a', 'Test'));
    openPalette();
    simulateInput('hello');
    vi.advanceTimersByTime(100);
    expect(component.query).toBe('hello');

    // Press Ctrl+K again
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    fixture.detectChanges();
    vi.advanceTimersByTime(1);
    expect(component.query).toBe('');
    expect(component.isOpen).toBe(true);
  });

  // --- Fuzzy Search ---

  it('should filter commands via fuzzy search after debounce', () => {
    registry.register(makeCommand('nav:dashboard', 'Go to Dashboard', ['home']));
    registry.register(makeCommand('nav:profile', 'Go to Profile', ['account']));
    openPalette();

    simulateInput('Dashboard');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    expect(component.displayedItems.length).toBe(1);
    expect(component.displayedItems[0].id).toBe('nav:dashboard');
  });

  it('should show no results message when search has no matches', () => {
    registry.register(makeCommand('a', 'Test'));
    openPalette();

    simulateInput('xyznonexistent');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    expect(component.displayedItems.length).toBe(0);
    const empty = getElement('.palette-empty');
    expect(empty?.textContent).toContain('No results for');
    expect(empty?.textContent).toContain('xyznonexistent');
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_no_results', { query_text: 'xyznonexistent' });
  });

  it('should show "No commands available" when registry is empty and no query', () => {
    openPalette();
    expect(getElement('.palette-empty')?.textContent).toContain('No commands available');
  });

  it('should restore recent items when query cleared', () => {
    registry.register(makeCommand('a', 'Alpha'));
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('a');
    openPalette();
    expect(component.displayedItems.length).toBe(1);

    simulateInput('something');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    simulateInput('');
    fixture.detectChanges();
    expect(component.displayedItems.length).toBe(1);
    expect(component.displayedItems[0].id).toBe('a');
  });

  // --- Keyboard Navigation ---

  it('should move selection with arrow keys and wrap', () => {
    registry.register(makeCommand('a', 'Alpha'));
    registry.register(makeCommand('b', 'Beta'));
    registry.register(makeCommand('c', 'Gamma'));
    // Push all to recents so they show
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('c');
    recentService.pushRecent('b');
    recentService.pushRecent('a');
    openPalette();

    expect(component.selectedIndex).toBe(0);

    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.selectedIndex).toBe(1);

    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.selectedIndex).toBe(2);

    // Wrap to beginning
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.selectedIndex).toBe(0);

    // Wrap to end (ArrowUp from 0)
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.selectedIndex).toBe(2);
  });

  it('should update selection on mouse enter', () => {
    component.onMouseEnter(3);
    expect(component.selectedIndex).toBe(3);
  });

  // --- Command Execution ---

  it('should execute command on Enter and fire analytics with duration_ms', () => {
    const cmd = makeCommand('a', 'Alpha');
    registry.register(cmd);
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('a');
    openPalette();

    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(cmd.execute).toHaveBeenCalled();
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_executed', expect.objectContaining({
      command_id: 'a',
      command_category: 'navigation',
      duration_ms: expect.any(Number),
    }));
  });

  it('should add executed command to recent items', () => {
    const cmd = makeCommand('a', 'Alpha');
    registry.register(cmd);
    const recentService = TestBed.inject(RecentCommandsService);
    const pushSpy = vi.spyOn(recentService, 'pushRecent');
    openPalette();
    component.displayedItems = [cmd];
    component.selectedIndex = 0;

    component.executeCommand(cmd);
    expect(pushSpy).toHaveBeenCalledWith('a');
  });

  it('should handle command execution failure gracefully', () => {
    const cmd: Command = {
      id: 'fail',
      label: 'Fail',
      category: 'action',
      keywords: [],
      execute: () => { throw new Error('boom'); },
    };
    registry.register(cmd);
    openPalette();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    component.executeCommand(cmd);
    expect(consoleSpy).toHaveBeenCalled();
    expect(component.isClosing).toBe(true);
    consoleSpy.mockRestore();
  });

  // --- Dismissal ---

  it('should dismiss on Escape and fire analytics', () => {
    openPalette();
    component.query = 'test';
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isClosing).toBe(true);
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_dismissed', {
      had_query: true,
      dismiss_method: 'escape',
    });
  });

  it('should dismiss on click outside and fire analytics', () => {
    openPalette();
    component.dismissViaClickOutside();
    expect(component.isClosing).toBe(true);
    expect(analyticsSpy).toHaveBeenCalledWith('command_palette_dismissed', {
      had_query: false,
      dismiss_method: 'click_outside',
    });
  });

  it('should complete close on animation end', () => {
    openPalette();
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpen).toBe(true); // still open during animation
    component.onAnimationEnd();
    expect(component.isOpen).toBe(false);
    expect(component.isClosing).toBe(false);
  });

  it('should auto-close on route navigation', () => {
    openPalette();
    const router = TestBed.inject(Router);
    router.navigateByUrl('/somewhere');
    fixture.detectChanges();
    expect(component.isClosing).toBe(true);
  });

  // --- Focus Trap ---

  it('should prevent Tab from leaving the palette', () => {
    openPalette();
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    component.onKeydown(event);
    expect(preventSpy).toHaveBeenCalled();
  });

  // --- Accessibility ---

  it('should have correct ARIA attributes when open', () => {
    registry.register(makeCommand('a', 'Test'));
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('a');
    openPalette();

    const dialog = getElement('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Command palette');

    const input = getElement('[role="combobox"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('aria-controls')).toBe('palette-listbox');
    expect(input?.getAttribute('aria-autocomplete')).toBe('list');

    const listbox = getElement('[role="listbox"]');
    expect(listbox).toBeTruthy();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);

    const liveRegion = getElement('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('should have aria-activedescendant pointing to selected item', () => {
    registry.register(makeCommand('a', 'Test'));
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('a');
    openPalette();

    const input = getElement('[role="combobox"]');
    expect(input?.getAttribute('aria-activedescendant')).toBe('palette-item-0');
  });

  it('should set aria-expanded based on displayed items', () => {
    openPalette(); // no commands
    const input = getElement('[role="combobox"]');
    expect(input?.getAttribute('aria-expanded')).toBe('false');
  });

  it('should have maxlength 120 on input', () => {
    openPalette();
    const input = getElement('.palette-input') as HTMLInputElement;
    expect(input.maxLength).toBe(120);
  });

  // --- Result count announcement ---

  it('should announce result count in aria-live region', () => {
    registry.register(makeCommand('a', 'Alpha'));
    registry.register(makeCommand('b', 'Beta'));
    openPalette();

    simulateInput('Alpha');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    expect(component.resultCountAnnouncement).toContain('1 result');
  });

  it('should announce "No results found" for zero results', () => {
    registry.register(makeCommand('a', 'Alpha'));
    openPalette();

    simulateInput('zzzzz');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    expect(component.resultCountAnnouncement).toBe('No results found');
  });

  // --- Recent items header ---

  it('should show Recent header when displaying recent items', () => {
    registry.register(makeCommand('a', 'Alpha'));
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('a');
    openPalette();

    expect(getElement('.palette-section-header')?.textContent).toContain('Recent');
  });

  // --- Category badges ---

  it('should display category badges', () => {
    registry.register(makeCommand('a', 'Alpha', [], 'navigation'));
    registry.register(makeCommand('b', 'Beta', [], 'action'));
    const recentService = TestBed.inject(RecentCommandsService);
    recentService.pushRecent('b');
    recentService.pushRecent('a');
    openPalette();

    const categories = fixture.nativeElement.querySelectorAll('.palette-item-category');
    expect(categories.length).toBe(2);
    const texts = Array.from(categories).map((el: any) => el.textContent.trim());
    expect(texts).toContain('Navigation');
    expect(texts).toContain('Action');
  });
});
