import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CountriesComponent } from './countries.component';
import { SOUTH_AMERICAN_COUNTRIES } from './country.model';

describe('CountriesComponent — edge cases & additional coverage', () => {
  let fixture: ComponentFixture<CountriesComponent>;
  let component: CountriesComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountriesComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CountriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  // --- Data model tests ---

  it('should have exactly 12 countries (no French Guiana)', () => {
    expect(SOUTH_AMERICAN_COUNTRIES.length).toBe(12);
    const names = SOUTH_AMERICAN_COUNTRIES.map(c => c.name);
    expect(names).not.toContain('Guayana Francesa');
    expect(names).not.toContain('French Guiana');
  });

  it('should have all expected countries in alphabetical order', () => {
    const expected = [
      'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Ecuador',
      'Guyana', 'Paraguay', 'Perú', 'Surinam', 'Uruguay', 'Venezuela',
    ];
    expect(SOUTH_AMERICAN_COUNTRIES.map(c => c.name)).toEqual(expected);
  });

  it('should have non-empty capital and flag for every country', () => {
    SOUTH_AMERICAN_COUNTRIES.forEach(c => {
      expect(c.capital.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
    });
  });

  // --- selectCountry is no-op in showAll mode ---

  it('should ignore selectCountry calls when in show-all mode', () => {
    component.showAll.set(true);
    component.selectCountry('Argentina');
    expect(component.selectedCountry()).toBeNull();
  });

  // --- Keyboard: ArrowDown / ArrowUp navigation ---

  it('should move focusedIndex down on ArrowDown', () => {
    expect(component.focusedIndex()).toBe(0);
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    component.onCountryKeydown(event, 0);
    expect(component.focusedIndex()).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should move focusedIndex up on ArrowUp', () => {
    component.focusedIndex.set(5);
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    component.onCountryKeydown(event, 5);
    expect(component.focusedIndex()).toBe(4);
  });

  it('should not move focus below last item', () => {
    component.focusedIndex.set(11);
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    component.onCountryKeydown(event, 11);
    expect(component.focusedIndex()).toBe(11);
  });

  it('should not move focus above first item', () => {
    component.focusedIndex.set(0);
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    component.onCountryKeydown(event, 0);
    expect(component.focusedIndex()).toBe(0);
  });

  // --- Roving tabindex ---

  it('should have tabindex 0 only on focused row and -1 on others', () => {
    const rows = el.querySelectorAll('.country-row');
    expect(rows[0].getAttribute('tabindex')).toBe('0');
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].getAttribute('tabindex')).toBe('-1');
    }

    // Move focus to index 3
    component.focusedIndex.set(3);
    fixture.detectChanges();
    expect(rows[3].getAttribute('tabindex')).toBe('0');
    expect(rows[0].getAttribute('tabindex')).toBe('-1');
  });

  // --- aria-expanded on all rows ---

  it('should set aria-expanded false on all unselected rows', () => {
    const rows = el.querySelectorAll('.country-row');
    rows.forEach(row => {
      expect(row.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // --- capital-reveal-wrapper aria-hidden ---

  it('should set aria-hidden true on all capital wrappers when none selected', () => {
    const wrappers = el.querySelectorAll('.capital-reveal-wrapper');
    wrappers.forEach(w => {
      expect(w.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should set aria-hidden false only on selected country capital wrapper', () => {
    const rows = el.querySelectorAll('.country-row');
    (rows[2] as HTMLElement).click();
    fixture.detectChanges();

    const wrappers = el.querySelectorAll('.capital-reveal-wrapper');
    wrappers.forEach((w, i) => {
      if (i === 2) {
        expect(w.getAttribute('aria-hidden')).toBe('false');
      } else {
        expect(w.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  // --- Show-all table semantics ---

  it('should have proper table headers with scope=col in show-all mode', () => {
    component.showAll.set(true);
    fixture.detectChanges();

    const ths = el.querySelectorAll('th');
    expect(ths.length).toBe(2);
    expect(ths[0].textContent?.trim()).toBe('País');
    expect(ths[1].textContent?.trim()).toBe('Capital');
    ths.forEach(th => expect(th.getAttribute('scope')).toBe('col'));
  });

  // --- Checkmark only on selected row ---

  it('should show checkmark only on selected country row', () => {
    expect(el.querySelectorAll('.checkmark').length).toBe(0);

    const rows = el.querySelectorAll('.country-row');
    (rows[0] as HTMLElement).click();
    fixture.detectChanges();

    const checkmarks = el.querySelectorAll('.checkmark');
    expect(checkmarks.length).toBe(1);
    expect(checkmarks[0].closest('.country-row')).toBe(rows[0]);
  });

  // --- Selected class toggling ---

  it('should apply selected class only to the selected row', () => {
    const rows = el.querySelectorAll('.country-row');
    (rows[6] as HTMLElement).click(); // Guyana
    fixture.detectChanges();

    expect(rows[6].classList.contains('selected')).toBe(true);
    for (let i = 0; i < rows.length; i++) {
      if (i !== 6) {
        expect(rows[i].classList.contains('selected')).toBe(false);
      }
    }
  });

  // --- Announcement text computed signal ---

  it('should return empty string for announcementText when no selection', () => {
    expect(component.announcementText()).toBe('');
  });

  it('should return correct announcement for each country', () => {
    component.selectedCountry.set('Perú');
    expect(component.announcementText()).toBe('Capital: Lima');
  });

  it('should return empty string for announcementText with invalid country name', () => {
    component.selectedCountry.set('Atlantis');
    expect(component.announcementText()).toBe('');
  });

  // --- toggleShowAll clears selection from any state ---

  it('should clear selection when toggling from explore to show-all and back', () => {
    component.selectedCountry.set('Chile');
    component.toggleShowAll(); // → show_all
    expect(component.selectedCountry()).toBeNull();
    expect(component.showAll()).toBe(true);

    component.toggleShowAll(); // → explore
    expect(component.selectedCountry()).toBeNull();
    expect(component.showAll()).toBe(false);
  });

  // --- Rapid toggle between modes ---

  it('should handle rapid mode toggles without errors', () => {
    const btn = el.querySelector('.toggle-btn') as HTMLElement;
    btn.click(); btn.click(); btn.click();
    fixture.detectChanges();
    // Odd number of clicks → show_all
    expect(component.showAll()).toBe(true);
    expect(component.selectedCountry()).toBeNull();
  });

  // --- aria-live region present in both modes ---

  it('should have aria-live region present in show-all mode', () => {
    component.showAll.set(true);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="live-region"]')).not.toBeNull();
  });

  // --- heading landmark ---

  it('should have section with aria-labelledby pointing to heading', () => {
    const section = el.querySelector('section');
    expect(section?.getAttribute('aria-labelledby')).toBe('countries-heading');
    expect(el.querySelector('#countries-heading')?.tagName).toBe('H2');
  });

  // --- country rows have role=button ---

  it('should have role=button on each country row', () => {
    const rows = el.querySelectorAll('.country-row');
    rows.forEach(row => {
      expect(row.getAttribute('role')).toBe('button');
    });
  });

  // --- Unrecognized keys are ignored ---

  it('should not change state on unrecognized keydown', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    component.onCountryKeydown(event, 0);
    expect(component.selectedCountry()).toBeNull();
    expect(component.focusedIndex()).toBe(0);
  });
});
