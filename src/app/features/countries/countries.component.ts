import { Component, computed, signal, viewChildren, ElementRef, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Country, SOUTH_AMERICAN_COUNTRIES } from './country.model';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="countries-card" aria-labelledby="countries-heading">
      <div class="card-header">
        <h2 id="countries-heading">Capitales de Sudam\u00e9rica</h2>
        <button
          type="button"
          class="toggle-btn"
          (click)="toggleShowAll()">
          {{ showAll() ? 'Explorar una por una' : 'Ver todas las capitales' }}
        </button>
      </div>

      <!-- Persistent aria-live region for screen reader announcements -->
      <div aria-live="polite" class="sr-only" data-testid="live-region">{{ announcementText() }}</div>

      @if (showAll()) {
        <table class="capitals-table">
          <thead>
            <tr>
              <th scope="col">Pa\u00eds</th>
              <th scope="col">Capital</th>
            </tr>
          </thead>
          <tbody>
            @for (country of countries; track country.name) {
              <tr>
                <td>{{ country.flag }} {{ country.name }}</td>
                <td>{{ country.capital }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        @if (!selectedCountry()) {
          <p class="placeholder">Selecciona un pa\u00eds para ver su capital</p>
        }

        <ul role="list" class="country-list">
          @for (country of countries; track country.name; let i = $index) {
            <li
              #countryRow
              class="country-row"
              [class.selected]="selectedCountry() === country.name"
              role="button"
              [attr.tabindex]="focusedIndex() === i ? 0 : -1"
              [attr.aria-expanded]="selectedCountry() === country.name"
              (click)="selectCountry(country.name)"
              (keydown)="onCountryKeydown($event, i)">
              <span class="country-label">
                @if (selectedCountry() === country.name) {
                  <span class="checkmark" aria-hidden="true">\u2713</span>
                }
                {{ country.flag }} {{ country.name }}
              </span>
              <div
                class="capital-reveal-wrapper"
                [class.open]="selectedCountry() === country.name"
                [attr.aria-hidden]="selectedCountry() !== country.name">
                <div class="capital-reveal-inner">
                  <span class="capital-text">Capital: {{ country.capital }}</span>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1rem;
    }

    .countries-card {
      max-width: 600px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #eee;
    }

    .card-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .toggle-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #0066cc;
      border-radius: 4px;
      background: #fff;
      color: #0066cc;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .toggle-btn:hover {
      background: #f0f6ff;
    }

    .toggle-btn:focus-visible {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }

    .placeholder {
      padding: 0.75rem 1.25rem;
      margin: 0;
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
    }

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

    /* Country list */
    .country-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .country-row {
      min-height: 48px;
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      border-left: 4px solid transparent;
      user-select: none;
    }

    .country-row:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }

    .country-row:hover {
      background: #f8f9fa;
    }

    .country-row:focus-visible {
      outline: 2px solid #0066cc;
      outline-offset: -2px;
    }

    .country-row.selected {
      border-left-color: #0066cc;
      background: #f0f6ff;
    }

    .country-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 1rem;
    }

    .checkmark {
      color: #0066cc;
      font-weight: bold;
      margin-right: 0.25rem;
    }

    /* Capital reveal animation using grid technique */
    .capital-reveal-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      visibility: hidden;
    }

    .capital-reveal-wrapper.open {
      grid-template-rows: 1fr;
      visibility: visible;
    }

    .capital-reveal-inner {
      overflow: hidden;
    }

    .capital-text {
      display: block;
      padding: 0.5rem 0 0.25rem 1.75rem;
      color: #444;
      font-size: 0.9rem;
    }

    @media (prefers-reduced-motion: no-preference) {
      .capital-reveal-wrapper {
        transition: grid-template-rows 180ms ease-out, visibility 0s linear 180ms;
      }
      .capital-reveal-wrapper.open {
        transition: grid-template-rows 180ms ease-out, visibility 0s linear 0s;
      }
    }

    /* Table mode */
    .capitals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .capitals-table th {
      text-align: left;
      padding: 0.75rem 1.25rem;
      background: #f8f9fa;
      font-size: 0.875rem;
      color: #555;
      border-bottom: 2px solid #ddd;
    }

    .capitals-table td {
      padding: 0.625rem 1.25rem;
      font-size: 0.95rem;
    }

    .capitals-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    .capitals-table tbody tr:not(:last-child) td {
      border-bottom: 1px solid #f0f0f0;
    }
  `]
})
export class CountriesComponent {
  private readonly countryRows = viewChildren<ElementRef<HTMLElement>>('countryRow');
  readonly countries: readonly Country[] = SOUTH_AMERICAN_COUNTRIES;
  readonly selectedCountry: WritableSignal<string | null> = signal(null);
  readonly showAll: WritableSignal<boolean> = signal(false);
  readonly focusedIndex: WritableSignal<number> = signal(0);

  readonly announcementText = computed(() => {
    const name = this.selectedCountry();
    if (!name) return '';
    const country = this.countries.find(c => c.name === name);
    return country ? `Capital: ${country.capital}` : '';
  });

  selectCountry(name: string): void {
    if (this.showAll()) return;
    // TODO: emit analytics event — country_selected { country_name, capital_name } or country_deselected { country_name }
    if (this.selectedCountry() === name) {
      this.selectedCountry.set(null);
    } else {
      this.selectedCountry.set(name);
    }
  }

  toggleShowAll(): void {
    const previousMode = this.showAll() ? 'show_all' : 'explore';
    this.showAll.update(v => !v);
    this.selectedCountry.set(null);
    // TODO: emit analytics event — show_all_toggled { mode: this.showAll() ? 'show_all' : 'explore', previous_mode: previousMode }
  }

  onCountryKeydown(event: KeyboardEvent, index: number): void {
    switch (event.key) {
      case 'Enter':
        this.selectCountry(this.countries[index].name);
        break;
      case ' ':
        event.preventDefault();
        this.selectCountry(this.countries[index].name);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(index - 1);
        break;
    }
  }

  private moveFocus(newIndex: number): void {
    if (newIndex < 0 || newIndex >= this.countries.length) return;
    this.focusedIndex.set(newIndex);
    // Focus the DOM element after Angular updates tabindex
    setTimeout(() => {
      const rows = this.countryRows();
      rows[newIndex]?.nativeElement.focus();
    });
  }
}
