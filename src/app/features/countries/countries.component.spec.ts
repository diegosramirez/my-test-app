import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
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
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('should render all 12 countries alphabetically with placeholder and heading', () => {
    const rows = el.querySelectorAll('.country-row');
    expect(rows.length).toBe(12);

    // Verify alphabetical order
    const names = Array.from(rows).map(r => r.textContent?.trim().replace(/^[^\w]*/, ''));
    for (let i = 1; i < names.length; i++) {
      expect(names[i]! >= names[i - 1]!).toBe(true);
    }

    // Heading
    expect(el.querySelector('h2')?.textContent).toContain('Capitales de Sudam\u00e9rica');

    // Toggle button
    const btn = el.querySelector('.toggle-btn');
    expect(btn?.textContent?.trim()).toBe('Ver todas las capitales');

    // Placeholder
    expect(el.querySelector('.placeholder')?.textContent).toContain('Selecciona un pa\u00eds para ver su capital');

    // No capital visible
    const openWrappers = el.querySelectorAll('.capital-reveal-wrapper.open');
    expect(openWrappers.length).toBe(0);
  });

  it('should display flag emojis for each country', () => {
    const rows = el.querySelectorAll('.country-row');
    rows.forEach((row, i) => {
      expect(row.textContent).toContain(SOUTH_AMERICAN_COUNTRIES[i].flag);
    });
  });

  it('should reveal capital on country selection with aria-expanded', () => {
    const rows = el.querySelectorAll('.country-row');
    // Click Colombia (index 4)
    (rows[4] as HTMLElement).click();
    fixture.detectChanges();

    expect(component.selectedCountry()).toBe('Colombia');
    expect(rows[4].getAttribute('aria-expanded')).toBe('true');
    expect(rows[4].querySelector('.capital-reveal-wrapper')?.classList.contains('open')).toBe(true);
    expect(rows[4].textContent).toContain('Bogot\u00e1');

    // Placeholder gone
    expect(el.querySelector('.placeholder')).toBeNull();
  });

  it('should toggle deselect and restore placeholder', () => {
    const rows = el.querySelectorAll('.country-row');
    (rows[4] as HTMLElement).click();
    fixture.detectChanges();
    (rows[4] as HTMLElement).click();
    fixture.detectChanges();

    expect(component.selectedCountry()).toBeNull();
    expect(rows[4].getAttribute('aria-expanded')).toBe('false');
    expect(rows[4].querySelector('.capital-reveal-wrapper')?.classList.contains('open')).toBe(false);
    expect(el.querySelector('.placeholder')).not.toBeNull();
  });

  it('should switch selection between countries', () => {
    const rows = el.querySelectorAll('.country-row');
    // Select Colombia
    (rows[4] as HTMLElement).click();
    fixture.detectChanges();
    expect(rows[4].textContent).toContain('Bogot\u00e1');

    // Select Chile (index 3)
    (rows[3] as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedCountry()).toBe('Chile');
    expect(rows[3].querySelector('.capital-reveal-wrapper')?.classList.contains('open')).toBe(true);
    expect(rows[3].textContent).toContain('Santiago');
    // Previous collapsed
    expect(rows[4].querySelector('.capital-reveal-wrapper')?.classList.contains('open')).toBe(false);
  });

  it('should show all capitals in table mode', () => {
    const btn = el.querySelector('.toggle-btn') as HTMLElement;
    btn.click();
    fixture.detectChanges();

    expect(component.showAll()).toBe(true);
    const table = el.querySelector('table');
    expect(table).not.toBeNull();

    const thElements = table!.querySelectorAll('th');
    expect(thElements.length).toBe(2);
    expect(thElements[0].getAttribute('scope')).toBe('col');

    const tbodyRows = table!.querySelectorAll('tbody tr');
    expect(tbodyRows.length).toBe(12);

    // Each row has flag
    tbodyRows.forEach((row, i) => {
      expect(row.textContent).toContain(SOUTH_AMERICAN_COUNTRIES[i].flag);
      expect(row.textContent).toContain(SOUTH_AMERICAN_COUNTRIES[i].capital);
    });

    // Button label changed
    expect(btn.textContent?.trim()).toBe('Explorar una por una');
  });

  it('should return to explore mode with no pre-selection', () => {
    const btn = el.querySelector('.toggle-btn') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();

    expect(component.showAll()).toBe(false);
    expect(component.selectedCountry()).toBeNull();
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelectorAll('.country-row').length).toBe(12);
    expect(el.querySelector('.placeholder')).not.toBeNull();
  });

  it('should clear selection when toggling to show-all', () => {
    const rows = el.querySelectorAll('.country-row');
    (rows[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedCountry()).toBe('Argentina');

    (el.querySelector('.toggle-btn') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.selectedCountry()).toBeNull();
  });

  it('should select country on keyboard Enter', () => {
    const rows = el.querySelectorAll('.country-row');
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    rows[2].dispatchEvent(event);
    fixture.detectChanges();

    expect(component.selectedCountry()).toBe('Brasil');
  });

  it('should select country on keyboard Space and prevent default', () => {
    const rows = el.querySelectorAll('.country-row');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows[5].dispatchEvent(event);
    fixture.detectChanges();

    expect(component.selectedCountry()).toBe('Ecuador');
    expect(event.defaultPrevented).toBe(true);
  });

  it('should update aria-live region on selection and clear on deselect', () => {
    const liveRegion = el.querySelector('[data-testid="live-region"]')!;
    expect(liveRegion.textContent?.trim()).toBe('');

    const rows = el.querySelectorAll('.country-row');
    (rows[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(liveRegion.textContent?.trim()).toBe('Capital: Buenos Aires');

    (rows[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(liveRegion.textContent?.trim()).toBe('');
  });

  it('should resolve rapid clicks to last selection only', () => {
    // Click three countries without intermediate detectChanges
    const rows = el.querySelectorAll('.country-row');
    (rows[0] as HTMLElement).click();
    (rows[3] as HTMLElement).click();
    (rows[7] as HTMLElement).click();
    fixture.detectChanges();

    expect(component.selectedCountry()).toBe('Paraguay');
    const openWrappers = el.querySelectorAll('.capital-reveal-wrapper.open');
    expect(openWrappers.length).toBe(1);
    expect(openWrappers[0].textContent).toContain('Asunci\u00f3n');
  });
});
