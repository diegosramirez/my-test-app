import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Country } from '../../models/country.interface';

@Component({
  selector: 'app-country-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="country-card"
      data-testid="country-card"
      [class.selected]="isSelected"
      (click)="onCountrySelect()">
      <div class="flag">{{ country.flag }}</div>
      <div class="name">{{ country.name }}</div>
    </div>
  `,
  styleUrls: ['./country-card.component.css']
})
export class CountryCardComponent {
  @Input() country!: Country;
  @Input() isSelected: boolean = false;
  @Output() countrySelect = new EventEmitter<Country>();

  onCountrySelect() {
    this.countrySelect.emit(this.country);
  }
}