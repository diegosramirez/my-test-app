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

    it('should be sorted alphabetically by name', () => {
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
  });

  // ===== Initial render =====
  describe('initial render', () => {
    it('should display all 12 countries', () => {
      const rows = el.querySelectorAll('.country-row');
      expect(rows.length).toBe(12);
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

    it('should show placeholder text', () => {
      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.textContent).toContain('Selecciona un país para ver su capital');
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
    });

    it('should display flag emojis', () => {
      const flags = el.querySelectorAll('.country-row__flag');
      expect(flags.length).toBe(12);
      flags.forEach((flag) => {
        expect(flag.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should display chevron indicators', () => {
      const chevrons = el.querySelectorAll('.country-row__chevron');
      expect(chevrons.length).toBe(12);
    });
  });

  // ===== Selection =====
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

    it('should highlight the selected row', async () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(row.classList.contains('country-row--selected')).toBe(true);
      expect(row.getAttribute('aria-selected')).toBe('true');
      expect(row.getAttribute('aria-expanded')).toBe('true');
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
  });

  // ===== Switch selection =====
  describe('switch selection', () => {
    it('should switch from one country to another', async () => {
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
  });

  // ===== Show all toggle =====
  describe('show all toggle', () => {
    it('should switch to table mode', async () => {
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

      const caption = el.querySelector('caption');
      expect(caption?.textContent).toContain('Países y capitales de Sudamérica');

      const ths = el.querySelectorAll('th[scope="col"]');
      expect(ths.length).toBe(2);
    });

    it('should update button label and aria-expanded', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(btn.textContent?.trim()).toBe('Explorar una por una');
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should display flag emojis in table mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const firstRowText = el.querySelector('.capitals-table__row td')?.textContent;
      expect(firstRowText).toContain('Argentina');
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

    it('should announce mode switch', async () => {
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
  });

  // ===== Return to explore =====
  describe('return to explore mode', () => {
    it('should return to list view', async () => {
      vi.useFakeTimers();
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();
      btn.click();
      fixture.detectChanges();
      vi.runAllTimers();

      expect(component.showAll()).toBe(false);
      const list = el.querySelector('.country-list');
      expect(list).toBeTruthy();
      expect(el.querySelector('table')).toBeNull();
      vi.useRealTimers();
    });

    it('should announce return to explore mode', async () => {
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

    it('should move focusedIndex on ArrowDown (clamped)', async () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[0].dispatchEvent(downEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(1);
    });

    it('should clamp focusedIndex at boundaries', async () => {
      component.focusedIndex.set(11);
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[11].dispatchEvent(downEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(11);

      component.focusedIndex.set(0);
      fixture.detectChanges();
      await fixture.whenStable();
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      rows[0].dispatchEvent(upEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.focusedIndex()).toBe(0);
    });
  });

  // ===== aria-live safety =====
  describe('aria-live safety', () => {
    it('should never contain "Capital: undefined" or "Capital: null"', async () => {
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).not.toContain('Capital: undefined');
      expect(liveRegion?.textContent).not.toContain('Capital: null');
      expect(liveRegion?.textContent?.trim()).toBe('');

      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(liveRegion?.textContent).not.toContain('Capital: undefined');
      expect(liveRegion?.textContent).not.toContain('Capital: null');
      expect(liveRegion?.textContent?.trim()).toBe('');
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
  });
});
