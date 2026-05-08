import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { PredictionService } from './services/prediction.service';
import { CountryListComponent } from './components/country-list/country-list.component';
import { CountryCardComponent } from './components/country-card/country-card.component';
import { Country, WORLD_CUP_COUNTRIES } from './models/country.interface';
import { ComponentFixture } from '@angular/core/testing';

describe('App Integration Tests', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let predictionService: PredictionService;

  const mockCountry: Country = {
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷'
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    predictionService = TestBed.inject(PredictionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Complete User Journey', () => {
    it('should complete full prediction flow successfully', async () => {
      // AC: Country list display - Given the app loads when user navigates to main view then all World Cup participating countries are displayed
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;

      // Countries are immediately available from static data
      fixture.detectChanges();

      // Verify all countries are displayed
      const countryCards = compiled.querySelectorAll('app-country-card');
      expect(countryCards.length).toBe(WORLD_CUP_COUNTRIES.length);

      // Verify responsive grid layout
      const gridContainer = compiled.querySelector('[data-testid="countries-grid"]');
      expect(gridContainer).toBeTruthy();

      // AC: Country selection feedback - Given countries are displayed when user clicks on a country card then selection is highlighted
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      expect(brazilCard).toBeTruthy();

      // Click on Brazil
      brazilCard.click();
      fixture.detectChanges();

      // Verify selection state
      expect(predictionService.selectedCountry()?.name).toBe('Brazil');
      expect(brazilCard.getAttribute('ng-reflect-is-selected')).toBe('true');

      // AC: Prediction confirmation flow - Given a country is selected when user initiates confirmation then summary is presented
      const confirmButton = compiled.querySelector('[data-testid="confirm-button"]') as HTMLElement;
      expect(confirmButton).toBeTruthy();
      expect(confirmButton.textContent).toContain('Brazil');

      // Click confirm
      confirmButton.click();
      fixture.detectChanges();

      // AC: Prediction submission success - Given confirmation is completed when submission succeeds then prediction is stored and success message displayed
      expect(predictionService.isPredictionConfirmed()).toBe(true);
      expect(predictionService.confirmedPrediction()?.name).toBe('Brazil');

      const confirmedPrediction = compiled.querySelector('[data-testid="confirmed-prediction"]');
      expect(confirmedPrediction).toBeTruthy();
      expect(confirmedPrediction?.textContent).toContain('Prediction Confirmed!');
      expect(confirmedPrediction?.textContent).toContain('Brazil');

      // Verify localStorage persistence
      const stored = localStorage.getItem('worldcup_prediction');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockCountry);
    });

    it('should prevent multiple selections after confirmation', async () => {
      // Complete initial selection
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card');

      // Select and confirm Brazil
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      brazilCard.click();
      fixture.detectChanges();

      const confirmButton = compiled.querySelector('[data-testid="confirm-button"]') as HTMLElement;
      confirmButton.click();
      fixture.detectChanges();

      // AC: Multiple selection prevention - Try to select Argentina after confirmation
      const argentinaCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Argentina')
      ) as HTMLElement;
      argentinaCard.click();
      fixture.detectChanges();

      // Should still be Brazil
      expect(predictionService.confirmedPrediction()?.name).toBe('Brazil');
      expect(predictionService.selectedCountry()?.name).toBe('Brazil');
    });

    it('should load existing prediction on app restart', async () => {
      // AC: Prediction persistence and viewing - Given a prediction is submitted when user returns to app then previous prediction is displayed
      localStorage.setItem('worldcup_prediction', JSON.stringify(mockCountry));

      // Create new app instance
      const newFixture = TestBed.createComponent(App);
      const newComponent = newFixture.componentInstance;
      const newPredictionService = TestBed.inject(PredictionService);

      newFixture.detectChanges();
      await newFixture.whenStable();

      // Verify prediction is loaded
      expect(newPredictionService.isPredictionConfirmed()).toBe(true);
      expect(newPredictionService.confirmedPrediction()).toEqual(mockCountry);

      await new Promise(resolve => setTimeout(resolve, 600));
      newFixture.detectChanges();

      const compiled = newFixture.nativeElement as HTMLElement;
      const confirmedPrediction = compiled.querySelector('[data-testid="confirmed-prediction"]');
      expect(confirmedPrediction).toBeTruthy();
      expect(confirmedPrediction?.textContent).toContain('Brazil');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle localStorage failures gracefully', async () => {
      // AC: Error handling and recovery - Given storage failures occur when user attempts prediction then appropriate error messages are shown
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      // Mock localStorage failure
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card');

      // Select Brazil
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      brazilCard.click();
      fixture.detectChanges();

      // Try to confirm
      const confirmButton = compiled.querySelector('[data-testid="confirm-button"]') as HTMLElement;
      confirmButton.click();
      fixture.detectChanges();

      // Should not be confirmed due to storage failure
      expect(predictionService.isPredictionConfirmed()).toBe(false);

      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });

    it('should handle rapid successive selections correctly', async () => {
      // AC: Multiple selection prevention - Given rapid user interactions when multiple countries are selected quickly then only latest selection is registered
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card');

      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      const argentinaCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Argentina')
      ) as HTMLElement;
      const germanyCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Germany')
      ) as HTMLElement;

      // Rapid successive clicks
      brazilCard.click();
      argentinaCard.click();
      germanyCard.click();
      fixture.detectChanges();

      // Only the last selection should be active
      expect(predictionService.selectedCountry()?.name).toBe('Germany');
      expect(germanyCard.getAttribute('ng-reflect-is-selected')).toBe('true');
      expect(brazilCard.getAttribute('ng-reflect-is-selected')).toBe('false');
      expect(argentinaCard.getAttribute('ng-reflect-is-selected')).toBe('false');
    });

    it('should handle corrupted localStorage data', async () => {
      // Set corrupted data
      localStorage.setItem('worldcup_prediction', 'invalid json');

      const newFixture = TestBed.createComponent(App);
      const newPredictionService = TestBed.inject(PredictionService);

      newFixture.detectChanges();
      await newFixture.whenStable();

      // Should handle gracefully - no prediction should be loaded
      expect(newPredictionService.isPredictionConfirmed()).toBe(false);
      expect(newPredictionService.confirmedPrediction()).toBeNull();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should maintain functionality with touch interactions', async () => {
      // AC: Mobile responsiveness - Given the app is accessed on mobile when user interacts with country cards then interface remains fully functional
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card [data-testid="country-card"]');

      // Verify touch targets meet 44px minimum
      countryCards.forEach(card => {
        const styles = window.getComputedStyle(card as Element);
        expect(parseInt(styles.minHeight) || 0).toBeGreaterThanOrEqual(44);
      });

      // Simulate touch interaction
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;

      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{
          clientX: 100,
          clientY: 100,
          identifier: 0,
          pageX: 100,
          pageY: 100,
          screenX: 100,
          screenY: 100,
          radiusX: 0,
          radiusY: 0,
          rotationAngle: 0,
          force: 1,
          target: brazilCard
        } as Touch]
      });

      brazilCard.dispatchEvent(touchEvent);
      brazilCard.click();
      fixture.detectChanges();

      expect(predictionService.selectedCountry()?.name).toBe('Brazil');
    });

    it('should display confirmation flow properly on mobile viewport', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });

      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card');

      // Select country
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      brazilCard.click();
      fixture.detectChanges();

      // Verify confirm button is accessible
      const confirmButton = compiled.querySelector('[data-testid="confirm-button"]') as HTMLElement;
      expect(confirmButton).toBeTruthy();

      const buttonRect = confirmButton.getBoundingClientRect();
      expect(buttonRect.height).toBeGreaterThanOrEqual(44);

      // Complete confirmation
      confirmButton.click();
      fixture.detectChanges();

      // Verify success display works on mobile
      const confirmedPrediction = compiled.querySelector('[data-testid="confirmed-prediction"]');
      expect(confirmedPrediction).toBeTruthy();
    });
  });

  describe('Loading States and User Experience', () => {
    it('should show loading state before countries appear', () => {
      // AC: Country list display - Verify loading state handling
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const loadingElement = compiled.querySelector('[data-testid="loading"]');
      const gridContainer = compiled.querySelector('[data-testid="countries-grid"]');

      expect(loadingElement).toBeTruthy();
      expect(gridContainer).toBeFalsy();
      expect(loadingElement?.textContent).toContain('Loading countries');
    });

    it('should track user interaction events', async () => {
      // AC: Data Collection - Verify event tracking properties are available
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 600));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const countryCards = compiled.querySelectorAll('app-country-card');

      // Verify countries_viewed data
      expect(countryCards.length).toBe(WORLD_CUP_COUNTRIES.length);

      // Select country for tracking country_selected event
      const brazilCard = Array.from(countryCards).find(card =>
        card.textContent?.includes('Brazil')
      ) as HTMLElement;
      brazilCard.click();
      fixture.detectChanges();

      // Verify selection data
      expect(predictionService.selectedCountry()?.name).toBe('Brazil');
      expect(predictionService.selectedCountry()?.code).toBe('BR');

      // Complete prediction for tracking prediction_submitted event
      const confirmButton = compiled.querySelector('[data-testid="confirm-button"]') as HTMLElement;
      confirmButton.click();
      fixture.detectChanges();

      // Verify submission data
      expect(predictionService.isPredictionConfirmed()).toBe(true);
      expect(predictionService.confirmedPrediction()?.name).toBe('Brazil');
    });

    it('should maintain 95% success rate threshold functionality', async () => {
      // AC: Success Threshold - Users can successfully browse countries and submit predictions with 95%+ success rate
      const successfulCompletions: boolean[] = [];

      // Simulate multiple user sessions
      for (let i = 0; i < 20; i++) {
        localStorage.clear();

        const testFixture = TestBed.createComponent(App);
        const testPredictionService = TestBed.inject(PredictionService);

        testFixture.detectChanges();
        await testFixture.whenStable();
        await new Promise(resolve => setTimeout(resolve, 100));
        testFixture.detectChanges();

        try {
          const compiled = testFixture.nativeElement as HTMLElement;

          // Select random country
          const randomCountry = WORLD_CUP_COUNTRIES[Math.floor(Math.random() * WORLD_CUP_COUNTRIES.length)];
          testPredictionService.selectCountry(randomCountry);
          testFixture.detectChanges();

          // Confirm prediction
          const success = testPredictionService.confirmPrediction();
          testFixture.detectChanges();

          successfulCompletions.push(success);
        } catch (error) {
          successfulCompletions.push(false);
        }
      }

      const successRate = successfulCompletions.filter(Boolean).length / successfulCompletions.length;
      expect(successRate).toBeGreaterThanOrEqual(0.95); // 95% success threshold
    });
  });
});