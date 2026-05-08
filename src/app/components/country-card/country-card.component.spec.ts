import { TestBed } from '@angular/core/testing';
import { CountryCardComponent } from './country-card.component';
import { Country } from '../../models/country.interface';

describe('CountryCardComponent', () => {
  let component: CountryCardComponent;
  let fixture: any;

  const mockCountry: Country = {
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CountryCardComponent);
    component = fixture.componentInstance;
    component.country = mockCountry;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display country name and flag', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Brazil');
    expect(compiled.textContent).toContain('🇧🇷');
  });

  it('should emit country on click', () => {
    const countrySelectSpy = vi.fn();
    component.countrySelect.subscribe(countrySelectSpy);

    const cardElement = fixture.nativeElement.querySelector('[data-testid="country-card"]');
    cardElement.click();

    expect(countrySelectSpy).toHaveBeenCalledWith(mockCountry);
  });

  it('should apply selected class when isSelected is true', () => {
    component.isSelected = true;
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('[data-testid="country-card"]');
    expect(cardElement.classList).toContain('selected');
  });

  it('should not apply selected class when isSelected is false', () => {
    component.isSelected = false;
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('[data-testid="country-card"]');
    expect(cardElement.classList).not.toContain('selected');
  });

  it('should have minimum 44px touch target for mobile', () => {
    fixture.detectChanges();
    const cardElement = fixture.nativeElement.querySelector('[data-testid="country-card"]');
    const styles = window.getComputedStyle(cardElement);

    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
  });
});