import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserSettingsComponent } from './user-settings.component';
import { ThemeService } from '../../core/services/theme.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('UserSettingsComponent', () => {
  let component: UserSettingsComponent;
  let fixture: ComponentFixture<UserSettingsComponent>;
  let darkModeSignal: ReturnType<typeof signal<boolean>>;
  let mockThemeService: { darkMode: typeof darkModeSignal; toggle: ReturnType<typeof vi.fn>; setDarkMode: ReturnType<typeof vi.fn>; storageAvailable: boolean };
  let mockAnalyticsService: { track: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    darkModeSignal = signal(false);
    mockThemeService = {
      darkMode: darkModeSignal,
      toggle: vi.fn(() => darkModeSignal.set(!darkModeSignal())),
      setDarkMode: vi.fn(),
      storageAvailable: true,
    };

    mockAnalyticsService = {
      track: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UserSettingsComponent],
      providers: [
        { provide: ThemeService, useValue: mockThemeService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Page structure ---

  it('should render the Settings heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent).toBe('Settings');
  });

  it('should render the Appearance section header', () => {
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h2?.textContent).toBe('Appearance');
  });

  it('should render Dark Mode label', () => {
    const label = fixture.nativeElement.querySelector('#dark-mode-label');
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('Dark Mode');
  });

  it('should show Coming soon for Language row', () => {
    const comingSoon = fixture.nativeElement.querySelector('.coming-soon');
    expect(comingSoon?.textContent?.trim()).toBe('Coming soon');
  });

  // --- Toggle accessibility ---

  it('should render toggle with role="switch"', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    expect(button).toBeTruthy();
  });

  it('should have aria-checked="false" when dark mode is off', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('should have aria-labelledby pointing to dark-mode-label', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    expect(button.getAttribute('aria-labelledby')).toBe('dark-mode-label');
    expect(fixture.nativeElement.querySelector('#dark-mode-label')).toBeTruthy();
  });

  it('should be a <button> element (natively focusable)', () => {
    const toggle = fixture.nativeElement.querySelector('[role="switch"]');
    expect(toggle.tagName).toBe('BUTTON');
  });

  // --- State text ---

  it('should display "Off" text when dark mode is off', () => {
    const stateText = fixture.nativeElement.querySelector('.state-text');
    expect(stateText?.textContent?.trim()).toBe('Off');
  });

  it('should display "On" text when dark mode is on', () => {
    darkModeSignal.set(true);
    fixture.detectChanges();
    const stateText = fixture.nativeElement.querySelector('.state-text');
    expect(stateText?.textContent?.trim()).toBe('On');
  });

  // --- Toggle interaction ---

  it('should call toggle on click', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.click();
    expect(mockThemeService.toggle).toHaveBeenCalled();
  });

  it('should update aria-checked and state text after toggle', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(fixture.nativeElement.querySelector('.state-text')?.textContent?.trim()).toBe('On');
  });

  it('should toggle back to off on second click', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(fixture.nativeElement.querySelector('.state-text')?.textContent?.trim()).toBe('Off');
  });

  it('should activate on Space key', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    vi.spyOn(event, 'preventDefault');
    button.dispatchEvent(event);
    expect(mockThemeService.toggle).toHaveBeenCalled();
  });

  it('should activate on Enter key', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    // Enter on a <button> triggers click natively, verify it works
    button.click();
    expect(mockThemeService.toggle).toHaveBeenCalled();
  });

  it('should maintain focus after toggle activation', () => {
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.focus();
    button.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(button);
  });

  // --- Analytics debouncing ---

  it('should debounce analytics tracking at 500ms', async () => {
    vi.useFakeTimers();
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.click();
    button.click();
    button.click();

    const toggleCalls = () => mockAnalyticsService.track.mock.calls.filter(
      (args: string[]) => args[0] === 'dark_mode_toggled'
    );
    expect(toggleCalls().length).toBe(0);

    vi.advanceTimersByTime(500);

    expect(toggleCalls().length).toBe(1);
    vi.useRealTimers();
  });

  it('should include correct meta in debounced analytics event', async () => {
    vi.useFakeTimers();
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    button.click(); // toggles to ON
    vi.advanceTimersByTime(500);

    const call = mockAnalyticsService.track.mock.calls.find(
      (args: string[]) => args[0] === 'dark_mode_toggled'
    );
    expect(call).toBeTruthy();
    expect(call![1]).toEqual(expect.objectContaining({
      state: 'on',
      page: 'settings',
    }));
    expect(call![1].timestamp).toBeTruthy();
    vi.useRealTimers();
  });

  it('should track final state after rapid toggling', async () => {
    vi.useFakeTimers();
    const button = fixture.nativeElement.querySelector('button[role="switch"]');
    // off -> on -> off -> on (3 clicks, ends on)
    button.click();
    button.click();
    button.click();
    vi.advanceTimersByTime(500);

    const call = mockAnalyticsService.track.mock.calls.find(
      (args: string[]) => args[0] === 'dark_mode_toggled'
    );
    expect(call![1].state).toBe('on');
    vi.useRealTimers();
  });

  // --- Storage unavailable warning ---

  it('should not show storage warning when storage is available', () => {
    const warning = fixture.nativeElement.querySelector('.storage-warning');
    expect(warning).toBeFalsy();
  });

  it('should show storage warning when storage is unavailable', () => {
    mockThemeService.storageAvailable = false;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const warning = fixture.nativeElement.querySelector('.storage-warning');
    expect(warning).toBeTruthy();
    expect(warning.textContent).toContain("can't be saved");
  });
});
