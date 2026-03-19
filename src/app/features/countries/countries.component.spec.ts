import { ComponentFixture, TestBed } from '@angular/core/testing';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { CountriesComponent } from './countries.component';
import { SOUTH_AMERICAN_COUNTRIES } from './country.model';

describe('CountriesComponent', () => {
  setupTestBed();

  let fixture: ComponentFixture<CountriesComponent>;
  let component: CountriesComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountriesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CountriesComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ===== Data integrity =====
  describe('data integrity', () => {
    it('should have exactly 12 countries', () => {
      expect(SOUTH_AMERICAN_COUNTRIES.length).toBe(12);
    });

    it('should be sorted alphabetically by name (Spanish locale)', () => {
      const names = SOUTH_AMERICAN_COUNTRIES.map((c) => c.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, 'es'));
      expect(names).toEqual(sorted);
    });

    it('should have no empty fields', () => {
      for (const country of SOUTH_AMERICAN_COUNTRIES) {
        expect(country.name.length).toBeGreaterThan(0);
        expect(country.capital.length).toBeGreaterThan(0);
        expect(country.flag.length).toBeGreaterThan(0);
      }
    });

    it('should not include French Guiana', () => {
      const names = SOUTH_AMERICAN_COUNTRIES.map((c) => c.name.toLowerCase());
      expect(names).not.toContain('guayana francesa');
      expect(names).not.toContain('french guiana');
    });

    it('should contain expected countries', () => {
      const names = SOUTH_AMERICAN_COUNTRIES.map((c) => c.name);
      const expected = [
        'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia',
        'Ecuador', 'Guyana', 'Paraguay', 'Perú', 'Surinam',
        'Uruguay', 'Venezuela',
      ];
      expect(names).toEqual(expected);
    });

    it('should map Bolivia capital to Sucre', () => {
      const bolivia = SOUTH_AMERICAN_COUNTRIES.find((c) => c.name === 'Bolivia');
      expect(bolivia?.capital).toBe('Sucre');
    });
  });

  // ===== Initial render =====
  describe('initial render', () => {
    it('should display all 12 countries', () => {
      const rows = el.querySelectorAll('.country-row');
      expect(rows.length).toBe(12);
    });

    it('should render countries inside a listbox', () => {
      const listbox = el.querySelector('[role="listbox"]');
      expect(listbox).toBeTruthy();
      const options = listbox!.querySelectorAll('[role="option"]');
      expect(options.length).toBe(12);
    });

    it('should show the heading', () => {
      const h2 = el.querySelector('h2');
      expect(h2?.textContent).toContain('Capitales de Sudamérica');
    });

    it('should show toggle button with correct label and aria-expanded', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      expect(btn.textContent?.trim()).toBe('Ver todas las capitales');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should show placeholder text with aria-hidden="false"', () => {
      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.textContent).toContain('Selecciona un país para ver su capital');
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
    });

    it('should display flag emojis in fixed-width containers', () => {
      const flags = el.querySelectorAll('.country-row__flag');
      expect(flags.length).toBe(12);
      flags.forEach((flag) => {
        expect(flag.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should display chevron indicators', () => {
      const chevrons = el.querySelectorAll('.country-row__chevron');
      expect(chevrons.length).toBe(12);
      chevrons.forEach((ch) => {
        expect(ch.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should have roving tabindex with first item at 0', () => {
      const rows = el.querySelectorAll('.country-row');
      expect(rows[0].getAttribute('tabindex')).toBe('0');
      expect(rows[1].getAttribute('tabindex')).toBe('-1');
      expect(rows[11].getAttribute('tabindex')).toBe('-1');
    });

    it('should have aria-live region in DOM', () => {
      const live = el.querySelector('[aria-live="polite"]');
      expect(live).toBeTruthy();
      expect(live!.textContent?.trim()).toBe('');
    });

    it('should not have toggle-btn--show-all class initially', () => {
      const btn = el.querySelector('.toggle-btn');
      expect(btn?.classList.contains('toggle-btn--show-all')).toBe(false);
    });
  });

  // ===== Country selection =====
  describe('country selection', () => {
    it('should reveal capital when a country is clicked', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBe('Argentina');
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Capital: Buenos Aires');
    });

    it('should hide placeholder when a country is selected', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.classList.contains('placeholder--hidden')).toBe(true);
      expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should highlight the selected row with aria attributes', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(row.classList.contains('country-row--selected')).toBe(true);
      expect(row.getAttribute('aria-selected')).toBe('true');
      expect(row.getAttribute('aria-expanded')).toBe('true');
    });

    it('should add open class to capital wrapper of selected row', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const wrapper = row.querySelector('.capital-wrapper');
      expect(wrapper?.classList.contains('open')).toBe(true);
      expect(wrapper?.getAttribute('aria-hidden')).toBe('false');
    });

    it('should rotate chevron on selected row', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const chevron = row.querySelector('.country-row__chevron');
      expect(chevron?.classList.contains('country-row__chevron--open')).toBe(true);
    });

    it('should show checkmark on selected row', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const check = row.querySelector('.country-row__check');
      expect(check).toBeTruthy();
      expect(check?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should not select rows that are not clicked', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(rows[1].classList.contains('country-row--selected')).toBe(false);
      expect(rows[1].getAttribute('aria-selected')).toBe('false');
      expect(rows[1].getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ===== Toggle deselect =====
  describe('toggle deselect', () => {
    it('should collapse capital when same country is clicked again', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBeNull();
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent?.trim()).toBe('');
    });

    it('should restore placeholder on deselect', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.classList.contains('placeholder--hidden')).toBe(false);
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
    });

    it('should remove selection styling on deselect', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(row.classList.contains('country-row--selected')).toBe(false);
      expect(row.getAttribute('aria-selected')).toBe('false');
      expect(row.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ===== Switch selection =====
  describe('switch selection', () => {
    it('should switch from one country to another in single update', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();
      await fixture.whenStable();
      rows[1].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBe('Bolivia');
      expect(rows[0].classList.contains('country-row--selected')).toBe(false);
      expect(rows[1].classList.contains('country-row--selected')).toBe(true);

      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Capital: Sucre');
    });

    it('should only have one selected row after switching', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();
      rows[3].click();
      fixture.detectChanges();
      await fixture.whenStable();

      const selected = el.querySelectorAll('.country-row--selected');
      expect(selected.length).toBe(1);
    });
  });

  // ===== Show all toggle =====
  describe('show all toggle', () => {
    it('should switch to table mode with 12 rows', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.showAll()).toBe(true);
      const table = el.querySelector('table');
      expect(table).toBeTruthy();
      const tableRows = el.querySelectorAll('.capitals-table__row');
      expect(tableRows.length).toBe(12);
    });

    it('should have proper table semantics', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(el.querySelector('caption')?.textContent).toContain('Países y capitales de Sudamérica');
      expect(el.querySelector('thead')).toBeTruthy();
      expect(el.querySelectorAll('th[scope="col"]').length).toBe(2);
    });

    it('should update button label, aria-expanded, and visual class', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(btn.textContent?.trim()).toBe('Explorar una por una');
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(btn.classList.contains('toggle-btn--show-all')).toBe(true);
    });

    it('should display flag emojis in table mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const flags = el.querySelectorAll('.table-flag');
      expect(flags.length).toBe(12);
    });

    it('should clear selection when toggling to show-all', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBeNull();
    });

    it('should hide placeholder in show-all mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
      expect(placeholder?.classList.contains('placeholder--hidden')).toBe(true);
    });

    it('should remove interactive list in show-all mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(el.querySelector('[role="listbox"]')).toBeNull();
      expect(el.querySelectorAll('.country-row').length).toBe(0);
    });

    it('should announce mode switch then clear', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Mostrando todas las capitales');

      vi.runAllTimers();
      fixture.detectChanges();
      expect(liveRegion?.textContent?.trim()).toBe('');
      vi.useRealTimers();
    });

    it('should not allow selection in show-all mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      component.selectCountry('Argentina');
      expect(component.selectedCountry()).toBeNull();
    });
  });

  // ===== Return to explore mode =====
  describe('return to explore mode', () => {
    it('should return to list view with no selection', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      expect(component.showAll()).toBe(false);
      expect(component.selectedCountry()).toBeNull();
      const list = el.querySelector('.country-list');
      expect(list).toBeTruthy();
      expect(el.querySelector('table')).toBeNull();
      vi.useRealTimers();
    });

    it('should announce "Modo exploración" then clear', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      btn.click();
      fixture.detectChanges();

      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Modo exploración');

      vi.runAllTimers();
      fixture.detectChanges();
      expect(liveRegion?.textContent?.trim()).toBe('');
      vi.useRealTimers();
    });

    it('should restore toggle button to explore state', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      expect(btn.textContent?.trim()).toBe('Ver todas las capitales');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.classList.contains('toggle-btn--show-all')).toBe(false);
      vi.useRealTimers();
    });

    it('should show placeholder again after returning to explore mode', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
      vi.useRealTimers();
    });
  });

  // ===== Keyboard navigation =====
  describe('keyboard navigation', () => {
    it('should select country on Enter', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      row.dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBe('Argentina');
    });

    it('should select country on Space and call preventDefault', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      row.dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalled();
      expect(component.selectedCountry()).toBe('Argentina');
    });

    it('should move focusedIndex down on ArrowDown', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[0].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(1);
    });

    it('should clamp focusedIndex at last item on ArrowDown', async () => {
      component.focusedIndex.set(11);
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[11].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(11);
    });

    it('should clamp focusedIndex at 0 on ArrowUp', async () => {
      component.focusedIndex.set(0);
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      rows[0].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(0);
    });

    it('should move focusedIndex up on ArrowUp', async () => {
      component.focusedIndex.set(5);
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      rows[5].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(4);
    });

    it('should update tabindex attributes after focus change', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[0].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(rows[0].getAttribute('tabindex')).toBe('-1');
      expect(rows[1].getAttribute('tabindex')).toBe('0');
    });

    it('should not respond to unrelated keys', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      row.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.selectedCountry()).toBeNull();
      expect(component.focusedIndex()).toBe(0);
    });
  });

  // ===== aria-live safety =====
  describe('aria-live safety', () => {
    it('should never contain "Capital: undefined" or "Capital: null"', async () => {
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).not.toContain('undefined');
      expect(liveRegion?.textContent).not.toContain('null');
      expect(liveRegion?.textContent?.trim()).toBe('');

      // Select and deselect
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(liveRegion?.textContent).not.toContain('undefined');
      expect(liveRegion?.textContent).not.toContain('null');

      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(liveRegion?.textContent).not.toContain('undefined');
      expect(liveRegion?.textContent).not.toContain('null');
      expect(liveRegion?.textContent?.trim()).toBe('');
    });

    it('should persist aria-live region across mode switches', async () => {
      vi.useFakeTimers();
      const liveBefore = el.querySelector('[aria-live="polite"]');
      expect(liveBefore).toBeTruthy();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      const liveShowAll = el.querySelector('[aria-live="polite"]');
      expect(liveShowAll).toBeTruthy();

      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      const liveExplore = el.querySelector('[aria-live="polite"]');
      expect(liveExplore).toBeTruthy();
      vi.useRealTimers();
    });

    it('should return correct capital for each country', () => {
      const expectedPairs: [string, string][] = [
        ['Argentina', 'Capital: Buenos Aires'],
        ['Bolivia', 'Capital: Sucre'],
        ['Brasil', 'Capital: Brasilia'],
        ['Chile', 'Capital: Santiago'],
        ['Colombia', 'Capital: Bogotá'],
        ['Ecuador', 'Capital: Quito'],
        ['Guyana', 'Capital: Georgetown'],
        ['Paraguay', 'Capital: Asunción'],
        ['Perú', 'Capital: Lima'],
        ['Surinam', 'Capital: Paramaribo'],
        ['Uruguay', 'Capital: Montevideo'],
        ['Venezuela', 'Capital: Caracas'],
      ];

      for (const [name, expected] of expectedPairs) {
        component.selectCountry(name);
        expect(component['announcementText']()).toBe(expected);
      }
    });
  });

  // ===== Rapid clicks =====
  describe('rapid sequential clicks', () => {
    it('should resolve to the last selection', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      rows[1].click();
      rows[2].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBe('Brasil');
      expect(rows[0].classList.contains('country-row--selected')).toBe(false);
      expect(rows[1].classList.contains('country-row--selected')).toBe(false);
      expect(rows[2].classList.contains('country-row--selected')).toBe(true);
    });

    it('should handle rapid select-deselect-select', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click(); // select Argentina
      rows[0].click(); // deselect Argentina
      rows[1].click(); // select Bolivia
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedCountry()).toBe('Bolivia');
    });

    it('should cleanly switch to show-all mid-selection', async () => {
      vi.useFakeTimers();
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();
      fixture.detectChanges();

      expect(component.showAll()).toBe(true);
      expect(component.selectedCountry()).toBeNull();
      const table = el.querySelector('table');
      expect(table).toBeTruthy();
      // No ghost expanded rows
      expect(el.querySelectorAll('.country-row--selected').length).toBe(0);
      vi.useRealTimers();
    });
  });

  // ===== Component signal state =====
  describe('signal state management', () => {
    it('showPlaceholder should be true initially', () => {
      expect(component['showPlaceholder']()).toBe(true);
    });

    it('showPlaceholder should be false when selected', () => {
      component.selectCountry('Chile');
      expect(component['showPlaceholder']()).toBe(false);
    });

    it('showPlaceholder should be false in show-all mode', () => {
      component.toggleShowAll();
      expect(component['showPlaceholder']()).toBe(false);
    });

    it('showPlaceholder should return to true after deselecting', () => {
      component.selectCountry('Chile');
      component.selectCountry('Chile');
      expect(component['showPlaceholder']()).toBe(true);
    });

    it('liveRegionText should prioritize modeAnnouncement over announcementText', () => {
      component.selectCountry('Argentina');
      expect(component['liveRegionText']()).toBe('Capital: Buenos Aires');

      // Simulate mode announcement taking priority
      component.modeAnnouncement.set('Mostrando todas las capitales');
      expect(component['liveRegionText']()).toBe('Mostrando todas las capitales');
    });

    it('announcementText should return empty string for unknown country', () => {
      component.selectedCountry.set('NonExistent');
      expect(component['announcementText']()).toBe('');
    });
  });
});
