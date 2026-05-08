import { TestBed } from '@angular/core/testing';
import { PredictionService } from './prediction.service';
import { Country } from '../models/country.interface';

describe('PredictionService', () => {
  let service: PredictionService;

  const mockCountry: Country = {
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with no selected country', () => {
    expect(service.selectedCountry()).toBeNull();
    expect(service.isPredictionConfirmed()).toBe(false);
  });

  it('should select a country', () => {
    service.selectCountry(mockCountry);

    expect(service.selectedCountry()).toEqual(mockCountry);
    expect(service.isPredictionConfirmed()).toBe(false);
  });

  it('should prevent multiple rapid selections', () => {
    const country1: Country = { name: 'Argentina', code: 'AR', flag: '🇦🇷' };
    const country2: Country = { name: 'Brazil', code: 'BR', flag: '🇧🇷' };

    service.selectCountry(country1);
    service.selectCountry(country2);

    expect(service.selectedCountry()).toEqual(country2);
  });

  it('should confirm prediction and store in localStorage', () => {
    service.selectCountry(mockCountry);

    const result = service.confirmPrediction();

    expect(result).toBe(true);
    expect(service.isPredictionConfirmed()).toBe(true);
    expect(service.confirmedPrediction()).toEqual(mockCountry);

    const stored = localStorage.getItem('worldcup_prediction');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(mockCountry);
  });

  it('should not confirm prediction without selected country', () => {
    const result = service.confirmPrediction();

    expect(result).toBe(false);
    expect(service.isPredictionConfirmed()).toBe(false);
    expect(service.confirmedPrediction()).toBeNull();
  });

  it('should load existing prediction from localStorage on init', () => {
    localStorage.setItem('worldcup_prediction', JSON.stringify(mockCountry));

    service = TestBed.inject(PredictionService);

    expect(service.confirmedPrediction()).toEqual(mockCountry);
    expect(service.isPredictionConfirmed()).toBe(true);
  });

  it('should handle localStorage failures gracefully', () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage full');
    });

    service.selectCountry(mockCountry);
    const result = service.confirmPrediction();

    expect(result).toBe(false);
    expect(service.isPredictionConfirmed()).toBe(false);

    localStorage.setItem = originalSetItem;
  });

  it('should clear prediction', () => {
    service.selectCountry(mockCountry);
    service.confirmPrediction();

    service.clearPrediction();

    expect(service.selectedCountry()).toBeNull();
    expect(service.isPredictionConfirmed()).toBe(false);
    expect(service.confirmedPrediction()).toBeNull();
    expect(localStorage.getItem('worldcup_prediction')).toBeNull();
  });
});