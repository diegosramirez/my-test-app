import { Injectable, signal, computed } from '@angular/core';
import { Country } from '../models/country.interface';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private readonly STORAGE_KEY = 'worldcup_prediction';

  private _selectedCountry = signal<Country | null>(null);
  private _confirmedPrediction = signal<Country | null>(null);

  public readonly selectedCountry = this._selectedCountry.asReadonly();
  public readonly confirmedPrediction = this._confirmedPrediction.asReadonly();
  public readonly isPredictionConfirmed = computed(() => this._confirmedPrediction() !== null);

  constructor() {
    this.loadStoredPrediction();
  }

  selectCountry(country: Country): void {
    if (this.isPredictionConfirmed()) {
      return; // Cannot change selection after confirmation
    }
    this._selectedCountry.set(country);
  }

  confirmPrediction(): boolean {
    const selected = this._selectedCountry();
    if (!selected) {
      return false;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(selected));
      this._confirmedPrediction.set(selected);
      return true;
    } catch (error) {
      console.error('Failed to save prediction to localStorage:', error);
      return false;
    }
  }

  clearPrediction(): void {
    this._selectedCountry.set(null);
    this._confirmedPrediction.set(null);
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove prediction from localStorage:', error);
    }
  }

  private loadStoredPrediction(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const prediction = JSON.parse(stored) as Country;
        this._confirmedPrediction.set(prediction);
      }
    } catch (error) {
      console.error('Failed to load prediction from localStorage:', error);
    }
  }
}