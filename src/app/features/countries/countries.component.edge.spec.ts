import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountriesComponent } from './countries.component';
import { SOUTH_AMERICAN_COUNTRIES } from './country.model';

describe('CountriesComponent — edge cases & failure modes', () => {
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

  // ===== Data model exclusions =====
  describe('data model', () => {
    it('should not include French Guiana', () => {
      const names = SOUTH_AMERICAN_COUNTRIES.map((c) => c.name.toLowerCase());
      expect(names).not.toContain('guayana francesa');
      expect(names).not.toContain('french guiana');
      expect(names).not.toContain('guyane');
    });

    it('should use Sucre as Bolivia capital', () => {
      const bolivia = SOUTH_AMERICAN_COUNTRIES.find((c) => c.name === 'Bolivia');
      expect(bolivia?.capital).toBe('Sucre');
    });

    it('should contain all expected countries', () => {
      const names = SOUTH_AMERICAN_COUNTRIES.map((c) => c.name);
      const expected = [
        'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia',
        'Ecuador', 'Guyana', 'Paraguay', 'Perú', 'Surinam',
        'Uruguay', 'Venezuela',
      ];
      expect(names).toEqual(expected);
    });
  });

  // ===== selectCountry is no-op in show-all mode =====
  describe('selectCountry in show-all mode', () => {
    it('should not select a country when showAll is true', () => {
      component.showAll.set(true);
      fixture.detectChanges();

      component.selectCountry('Argentina');
      expect(component.selectedCountry()).toBeNull();
    });
  });

  // ===== Capital wrapper always in DOM =====
  describe('capital wrapper DOM presence', () => {
    it('should have capital wrappers for all 12 countries in explore mode', () => {
      const wrappers = el.querySelectorAll('.capital-wrapper');
      expect(wrappers.length).toBe(12);
    });

    it('should have aria-hidden="true" on all capital wrappers initially', () => {
      const wrappers = el.querySelectorAll('.capital-wrapper');
      wrappers.forEach((w) => {
        expect(w.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should set aria-hidden="false" only on the selected capital wrapper', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[3].click(); // Chile
      fixture.detectChanges();

      const wrappers = el.querySelectorAll('.capital-wrapper');
      wrappers.forEach((w, i) => {
        expect(w.getAttribute('aria-hidden')).toBe(i === 3 ? 'false' : 'true');
      });
    });

    it('should add .open class only to the selected capital wrapper', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[5].click(); // Ecuador
      fixture.detectChanges();

      const wrappers = el.querySelectorAll('.capital-wrapper');
      wrappers.forEach((w, i) => {
        expect(w.classList.contains('open')).toBe(i === 5);
      });
    });
  });

  // ===== Roving tabindex =====
  describe('roving tabindex', () => {
    it('should set tabindex=0 on first row and -1 on others initially', () => {
      const rows = el.querySelectorAll('.country-row');
      rows.forEach((row, i) => {
        expect(row.getAttribute('tabindex')).toBe(i === 0 ? '0' : '-1');
      });
    });

    it('should update tabindex when focusedIndex changes via ArrowDown', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      fixture.detectChanges();

      expect(rows[0].getAttribute('tabindex')).toBe('-1');
      expect(rows[1].getAttribute('tabindex')).toBe('0');
    });
  });

  // ===== Checkmark on selection =====
  describe('checkmark indicator', () => {
    it('should show checkmark on selected row only', () => {
      // Verify no row has a checkmark before selection
      const rowsBefore = el.querySelectorAll('.country-row');
      rowsBefore.forEach((row) => {
        expect(row.querySelector('.country-row__check')).toBeNull();
      });

      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();

      // Verify only the selected row contains a checkmark
      const updatedRows = el.querySelectorAll('.country-row');
      updatedRows.forEach((row, i) => {
        const check = row.querySelector('.country-row__check');
        if (i === 0) {
          expect(check).toBeTruthy();
          expect(check?.textContent).toContain('✓');
        } else {
          expect(check).toBeNull();
        }
      });
    });
  });

  // ===== Chevron rotation class =====
  describe('chevron indicator', () => {
    it('should add open class to chevron when country is selected', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();

      const chevrons = el.querySelectorAll('.country-row__chevron');
      expect(chevrons[0].classList.contains('country-row__chevron--open')).toBe(true);
      expect(chevrons[1].classList.contains('country-row__chevron--open')).toBe(false);
    });

    it('should remove open class when deselected', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[0].click();
      fixture.detectChanges();
      rows[0].click();
      fixture.detectChanges();

      const chevrons = el.querySelectorAll('.country-row__chevron');
      expect(chevrons[0].classList.contains('country-row__chevron--open')).toBe(false);
    });
  });

  // ===== Toggle button visual state class =====
  describe('toggle button visual state', () => {
    it('should not have show-all class in explore mode', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLElement;
      expect(btn.classList.contains('toggle-btn--show-all')).toBe(false);
    });

    it('should have show-all class in show-all mode', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      expect(btn.classList.contains('toggle-btn--show-all')).toBe(true);
    });
  });

  // ===== Mid-animation toggle to show-all =====
  describe('mid-animation toggle to show-all', () => {
    it('should clear selection and switch to table cleanly', () => {
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[4].click(); // Colombia
      fixture.detectChanges(); // Ensure selection state is applied before toggling mid-animation

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      expect(component.selectedCountry()).toBeNull();
      expect(component.showAll()).toBe(true);
      expect(el.querySelector('table')).toBeTruthy();
      expect(el.querySelector('.country-list')).toBeNull();
    });
  });

  // ===== liveRegionText computed signal =====
  describe('liveRegionText signal', () => {
    it('should return empty string when no selection and no announcement', () => {
      expect((component as any).liveRegionText()).toBe('');
    });

    it('should return capital text when a country is selected', () => {
      component.selectCountry('Perú');
      expect((component as any).liveRegionText()).toBe('Capital: Lima');
    });

    it('should prioritize modeAnnouncement over capital text', () => {
      component.selectCountry('Chile');
      component.modeAnnouncement.set('Mostrando todas las capitales');
      expect((component as any).liveRegionText()).toBe('Mostrando todas las capitales');
    });
  });

  // ===== Listbox semantics =====
  describe('ARIA listbox semantics', () => {
    it('should have role="listbox" on the list', () => {
      const list = el.querySelector('ul');
      expect(list?.getAttribute('role')).toBe('listbox');
    });

    it('should have role="option" on each row', () => {
      const rows = el.querySelectorAll('.country-row');
      rows.forEach((row) => {
        expect(row.getAttribute('role')).toBe('option');
      });
    });

    it('should have aria-selected="false" on unselected rows', () => {
      const rows = el.querySelectorAll('.country-row');
      rows.forEach((row) => {
        expect(row.getAttribute('aria-selected')).toBe('false');
      });
    });

    it('should have aria-expanded="false" on unselected rows', () => {
      const rows = el.querySelectorAll('.country-row');
      rows.forEach((row) => {
        expect(row.getAttribute('aria-expanded')).toBe('false');
      });
    });
  });

  // ===== Persistent aria-live region =====
  describe('persistent aria-live region', () => {
    it('should always be in the DOM regardless of mode', () => {
      expect(el.querySelector('[aria-live="polite"]')).toBeTruthy();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
      expect(el.querySelector('[aria-live="polite"]')).toBeTruthy();

      btn.click();
      fixture.detectChanges();
      expect(el.querySelector('[aria-live="polite"]')).toBeTruthy();
    });
  });

  // ===== Table has no interactive rows =====
  describe('show-all table non-interactivity', () => {
    it('should not have click handlers on table rows (selecting in show-all is no-op)', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      // Verify no country-row elements exist (table uses different markup)
      expect(el.querySelectorAll('.country-row').length).toBe(0);

      // Table rows exist
      const tableRows = el.querySelectorAll('.capitals-table__row');
      expect(tableRows.length).toBe(12);
    });
  });

  // ===== Keyboard: unrecognized keys are ignored =====
  describe('keyboard: unrecognized keys', () => {
    it('should not change state on unrecognized key', () => {
      const row = el.querySelector('.country-row') as HTMLElement;
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      fixture.detectChanges();

      expect(component.selectedCountry()).toBeNull();
      expect(component.focusedIndex()).toBe(0);
    });
  });

  // ===== Show-all table caption =====
  describe('show-all table caption', () => {
    it('should have sr-only caption', () => {
      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      const caption = el.querySelector('caption.sr-only');
      expect(caption).toBeTruthy();
      expect(caption?.textContent).toContain('Países y capitales de Sudamérica');
    });
  });

  // ===== Double toggle show-all restores explore with no pre-selection =====
  describe('double toggle show-all', () => {
    it('should return to explore with no country selected and placeholder visible', () => {
      // Select a country first
      const rows = el.querySelectorAll('.country-row') as NodeListOf<HTMLElement>;
      rows[2].click();
      fixture.detectChanges();

      const btn = el.querySelector('.toggle-btn') as HTMLButtonElement;
      btn.click(); // to show-all
      fixture.detectChanges();
      btn.click(); // back to explore
      fixture.detectChanges();

      expect(component.selectedCountry()).toBeNull();
      expect(component.showAll()).toBe(false);
      const placeholder = el.querySelector('.placeholder');
      expect(placeholder?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  // ===== Each capital text is correct =====
  describe('capital text correctness', () => {
    it('should display correct capital for each country', () => {
      for (const country of SOUTH_AMERICAN_COUNTRIES) {
        component.selectCountry(country.name);
        fixture.detectChanges();

        const liveRegion = el.querySelector('[aria-live="polite"]');
        expect(liveRegion?.textContent).toContain(`Capital: ${country.capital}`);
      }
    });
  });
});
