import { TestBed } from '@angular/core/testing';
import { CountryListComponent } from './country-list.component';
import { PredictionService } from '../../services/prediction.service';
import { signal } from '@angular/core';
import { Country, WORLD_CUP_COUNTRIES } from '../../models/country.interface';

describe('CountryListComponent', () => {
  let component: CountryListComponent;
  let fixture: any;
  let mockPredictionService: any;

  const mockCountry: Country = {
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷'
  };

  beforeEach(async () => {
    mockPredictionService = {
      selectedCountry: signal(null),
      isPredictionConfirmed: signal(false),
      selectCountry: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CountryListComponent],
      providers: [
        { provide: PredictionService, useValue: mockPredictionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CountryListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all World Cup countries', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const countryCards = compiled.querySelectorAll('app-country-card');

    expect(countryCards.length).toBe(WORLD_CUP_COUNTRIES.length);
  });

  it('should display countries in responsive grid layout', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gridContainer = compiled.querySelector('[data-testid="countries-grid"]');

    expect(gridContainer).toBeTruthy();
    expect(gridContainer?.classList).toContain('countries-grid');
  });

  it('should call prediction service when country is selected', () => {
    component.onCountrySelected(mockCountry);

    expect(mockPredictionService.selectCountry).toHaveBeenCalledWith(mockCountry);
  });

  it('should mark selected country as selected', () => {
    mockPredictionService.selectedCountry = signal(mockCountry);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const countryCards = compiled.querySelectorAll('app-country-card');

    // Find the Brazil card and check if it has the selected attribute
    const brazilCard = Array.from(countryCards).find(card =>
      card.textContent?.includes('Brazil')
    );

    expect(brazilCard?.getAttribute('ng-reflect-is-selected')).toBe('true');
  });

  it('should disable country selection when prediction is confirmed', () => {
    mockPredictionService.isPredictionConfirmed = signal(true);

    component.onCountrySelected(mockCountry);

    expect(mockPredictionService.selectCountry).not.toHaveBeenCalled();
  });

  it('should show loading state initially', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const loadingElement = compiled.querySelector('[data-testid="loading"]');

    expect(loadingElement).toBeTruthy();
    expect(loadingElement?.textContent).toContain('Loading countries');
  });
});