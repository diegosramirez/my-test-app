import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountriesComponent } from './countries.component';
import { SOUTH_AMERICAN_COUNTRIES } from './country.model';

describe('CountriesComponent', () => {
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
      expect(h2?.textContent).toContain('Capitales de Sudam\u00e9rica');
    });

    it('should show toggle button with correct label and aria-expanded', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      expect(btn.textContent?.trim()).toBe('Ver todas las capitales');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should show placeholder text', () => {
      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.textContent).toContain('Selecciona un pa\u00eds para ver su capital');
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
    it('should reveal capital when a country is clicked', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();

      expect(component.selectedCountry()).toBe('Argentina');
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Capital: Buenos Aires');
    });

    it('should hide placeholder when a country is selected', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.classList.contains('placeholder--hidden')).toBe(true);
      expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should highlight the selected row', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();

      expect(row.classList.contains('country-row--selected')).toBe(true);
      expect(row.getAttribute('aria-selected')).toBe('true');
      expect(row.getAttribute('aria-expanded')).toBe('true');
    });
  });

  // ===== Toggle deselect =====
  describe('toggle deselect', () => {
    it('should collapse capital when same country is clicked again', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      row.click();
      fixture.detectChanges();

      expect(component.selectedCountry()).toBeNull();
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent?.trim()).toBe('');
    });

    it('should restore placeholder on deselect', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      row.click();
      fixture.detectChanges();

      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.classList.contains('placeholder--hidden')).toBe(false);
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  // ===== Switch selection =====
  describe('switch selection', () => {
    it('should switch from one country to another', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();
      rows[1].click();
      fixture.detectChanges();

      expect(component.selectedCountry()).toBe('Bolivia');
      expect(rows[0].classList.contains('country-row--selected')).toBe(false);
      expect(rows[1].classList.contains('country-row--selected')).toBe(true);

      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Capital: Sucre');
    });
  });

  // ===== Show all toggle =====
  describe('show all toggle', () => {
    it('should switch to table mode', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      expect(component.showAll()).toBe(true);
      const table = el.querySelector('table');
      expect(table).toBeTruthy();
      const tableRows = el.querySelectorAll('.capitals-table__row');
      expect(tableRows.length).toBe(12);
    });

    it('should have proper table semantics', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      const caption = el.querySelector('caption');
      expect(caption?.textContent).toContain('Pa\u00edses y capitales de Sudam\u00e9rica');

      const ths = el.querySelectorAll('th[scope="col"]');
      expect(ths.length).toBe(2);
    });

    it('should update button label and aria-expanded', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      expect(btn.textContent?.trim()).toBe('Explorar una por una');
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should display flag emojis in table mode', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      const firstRowText = el.querySelector('.capitals-table__row td')?.textContent;
      // Should contain flag emoji for Argentina
      expect(firstRowText).toContain('Argentina');
    });

    it('should clear selection when toggling to show-all', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

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
      // After tick, announcement should clear
      expect(liveRegion?.textContent?.trim()).toBe('');
      vi.useRealTimers();
    });
  });

  // ===== Return to explore =====
  describe('return to explore mode', () => {
    it('should return to list view', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      btn.click();
      fixture.detectChanges();

      expect(component.showAll()).toBe(false);
      const list = el.querySelector('.country-list');
      expect(list).toBeTruthy();
      expect(el.querySelector('table')).toBeNull();
    });

    it('should announce return to explore mode', async () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 0));

      btn.click();
      fixture.detectChanges();

      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Modo exploraci\u00f3n');

      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();
      expect(liveRegion?.textContent?.trim()).toBe('');
    });
  });

  // ===== Keyboard navigation =====
  describe('keyboard navigation', () => {
    it('should select country on Enter', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      row.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.selectedCountry()).toBe('Argentina');
    });

    it('should select country on Space and call preventDefault', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      row.dispatchEvent(event);
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
      expect(component.selectedCountry()).toBe('Argentina');
    });

    it('should move focusedIndex on ArrowDown (clamped)', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[0].dispatchEvent(downEvent);
      fixture.detectChanges();

      expect(component.focusedIndex()).toBe(1);
    });

    it('should clamp focusedIndex at boundaries', () => {
      // Set to last index
      component.focusedIndex.set(11);
      fixture.detectChanges();

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      rows[11].dispatchEvent(downEvent);
      fixture.detectChanges();

      expect(component.focusedIndex()).toBe(11);

      // Test upper boundary
      component.focusedIndex.set(0);
      fixture.detectChanges();
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      rows[0].dispatchEvent(upEvent);
      fixture.detectChanges();

      expect(component.focusedIndex()).toBe(0);
    });
  });

  // ===== aria-live safety =====
  describe('aria-live safety', () => {
    it('should never contain "Capital: undefined" or "Capital: null"', () => {
      // Initially no selection
      const liveRegion = el.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).not.toContain('Capital: undefined');
      expect(liveRegion?.textContent).not.toContain('Capital: null');
      expect(liveRegion?.textContent?.trim()).toBe('');

      // Select and deselect
      const row = el.querySelector('.country-row') as HTMLElement;
      row.click();
      fixture.detectChanges();
      row.click();
      fixture.detectChanges();

      expect(liveRegion?.textContent).not.toContain('Capital: undefined');
      expect(liveRegion?.textContent).not.toContain('Capital: null');
      expect(liveRegion?.textContent?.trim()).toBe('');
    });
  });

  // ===== Rapid clicks =====
  describe('rapid sequential clicks', () => {
    it('should resolve to the last selection', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      rows[1].click();
      rows[2].click();
      fixture.detectChanges();

      expect(component.selectedCountry()).toBe('Brasil');
      expect(rows[0].classList.contains('country-row--selected')).toBe(false);
      expect(rows[1].classList.contains('country-row--selected')).toBe(false);
      expect(rows[2].classList.contains('country-row--selected')).toBe(true);
    });
  });
});
