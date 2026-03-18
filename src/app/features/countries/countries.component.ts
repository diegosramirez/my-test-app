import {
  Component,
  computed,
  signal,
  viewChildren,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { SOUTH_AMERICAN_COUNTRIES, Country } from './country.model';

@Component({
  selector: 'app-countries',
  standalone: true,
  templateUrl: './countries.component.html',
  styleUrl: './countries.component.css',
})
export class CountriesComponent implements AfterViewInit {
  protected readonly countries = SOUTH_AMERICAN_COUNTRIES;

  /** Currently selected country name, or null if none selected. */
  readonly selectedCountry = signal<string | null>(null);

  /** Whether we're in show-all table mode. */
  readonly showAll = signal(false);

  /** Index of the currently focused row for roving tabindex. */
  readonly focusedIndex = signal(0);

  /** Transient mode-switch announcement, cleared after a tick. */
  readonly modeAnnouncement = signal('');

  /** Row element refs for programmatic focus management. */
  readonly countryRows = viewChildren<ElementRef<HTMLElement>>('countryRow');

  /** Capital announcement derived from selection. Guards against null/undefined leaking. */
  protected readonly announcementText = computed(() => {
    const selected = this.selectedCountry();
    if (selected === null || selected === undefined) {
      return '';
    }
    const country = this.countries.find((c) => c.name === selected);
    if (!country) {
      return '';
    }
    return `Capital: ${country.capital}`;
  });

  /**
   * Single aria-live region text. Mode announcements take priority,
   * falling back to capital announcement.
   */
  protected readonly liveRegionText = computed(() => {
    return this.modeAnnouncement() || this.announcementText();
  });

  /** Whether the placeholder should be visible (no selection in explore mode). */
  protected readonly showPlaceholder = computed(() => {
    return this.selectedCountry() === null && !this.showAll();
  });

  // TODO: emit analytics event — countries_view_loaded { timestamp: number }
  ngAfterViewInit(): void {
    // Component rendered — analytics hook point
  }

  selectCountry(name: string): void {
    // No-op in show-all mode
    if (this.showAll()) {
      return;
    }

    if (this.selectedCountry() === name) {
      // Toggle off (deselect)
      this.selectedCountry.set(null);
      // TODO: emit analytics event — country_deselected { country_name: string }
    } else {
      // Select new country — single synchronous update ensures no blank flash
      this.selectedCountry.set(name);
      // TODO: emit analytics event — country_selected { country_name: string, capital_name: string }
    }
  }

  toggleShowAll(): void {
    const previousMode = this.showAll() ? 'show_all' : 'explore';

    // Clear selection synchronously before mode switch
    this.selectedCountry.set(null);

    const newShowAll = !this.showAll();
    this.showAll.set(newShowAll);

    const announcement = newShowAll
      ? 'Mostrando todas las capitales'
      : 'Modo exploraci\u00f3n';
    this.modeAnnouncement.set(announcement);

    // Clear after a tick so screen readers pick it up
    setTimeout(() => this.modeAnnouncement.set(''), 0);

    // TODO: emit analytics event — show_all_toggled { mode: string, previous_mode: string }
    void previousMode; // used for future analytics
  }

  /**
   * Keyboard handler for country rows. Uses roving tabindex with clamping.
   * ARIA APG recommends no wrapping for short lists so users have a clear
   * sense of list boundaries.
   */
  onCountryKeydown(event: KeyboardEvent, index: number): void {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = Math.min(index + 1, this.countries.length - 1);
        this.focusedIndex.set(next);
        this.focusRow(next);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = Math.max(index - 1, 0);
        this.focusedIndex.set(prev);
        this.focusRow(prev);
        break;
      }
      case 'Enter':
        this.selectCountry(this.countries[index].name);
        break;
      case ' ':
        // Prevent page scroll on Space
        event.preventDefault();
        this.selectCountry(this.countries[index].name);
        break;
    }
  }

  protected isSelected(name: string): boolean {
    return this.selectedCountry() === name;
  }

  protected getCapital(name: string): string {
    return this.countries.find((c) => c.name === name)?.capital ?? '';
  }

  private focusRow(index: number): void {
    const rows = this.countryRows();
    if (rows[index]) {
      rows[index].nativeElement.focus();
    }
  }
}
