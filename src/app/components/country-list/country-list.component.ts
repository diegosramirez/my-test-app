import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountryCardComponent } from '../country-card/country-card.component';
import { Country, WORLD_CUP_COUNTRIES } from '../../models/country.interface';
import { PredictionService } from '../../services/prediction.service';

@Component({
  selector: 'app-country-list',
  standalone: true,
  imports: [CommonModule, CountryCardComponent],
  template: `
    <div class="country-list-container">
      <h1>Choose Your World Cup Champion</h1>

      <div *ngIf="isLoading" class="loading" data-testid="loading">
        Loading countries
      </div>

      <div *ngIf="!isLoading"
        class="countries-grid"
        data-testid="countries-grid">
        <app-country-card
          *ngFor="let country of countries"
          [country]="country"
          [isSelected]="predictionService.selectedCountry() === country"
          (countrySelect)="onCountrySelected($event)">
        </app-country-card>
      </div>

      <div *ngIf="!isLoading && predictionService.selectedCountry() && !predictionService.isPredictionConfirmed()"
           class="confirm-button-container">
        <button
          class="confirm-button"
          data-testid="confirm-button"
          (click)="onConfirmPrediction()">
          Confirm Prediction: {{ predictionService.selectedCountry()?.name }}
        </button>
      </div>

      <div *ngIf="!isLoading && predictionService.isPredictionConfirmed()"
           class="confirmed-prediction"
           data-testid="confirmed-prediction">
        <h2>🎉 Prediction Confirmed!</h2>
        <div class="prediction-display">
          <span class="flag">{{ predictionService.confirmedPrediction()?.flag }}</span>
          <span class="country-name">{{ predictionService.confirmedPrediction()?.name }}</span>
        </div>
        <p>Your champion prediction has been saved!</p>
      </div>
    </div>
  `,
  styleUrls: ['./country-list.component.css']
})
export class CountryListComponent implements OnInit {
  protected readonly predictionService = inject(PredictionService);

  countries = WORLD_CUP_COUNTRIES;
  isLoading = true;

  ngOnInit(): void {
    // Countries are already loaded from static data
    this.isLoading = false;
  }

  onCountrySelected(country: Country): void {
    if (this.predictionService.isPredictionConfirmed()) {
      return; // Prevent selection after confirmation
    }
    this.predictionService.selectCountry(country);
  }

  onConfirmPrediction(): void {
    this.predictionService.confirmPrediction();
  }
}