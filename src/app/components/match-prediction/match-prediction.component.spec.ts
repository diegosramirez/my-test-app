import { TestBed } from '@angular/core/testing';
import { MatchPredictionComponent } from './match-prediction.component';
import { ProbabilityIndicatorComponent } from '../probability-indicator/probability-indicator.component';
import { ComponentFixture } from '@angular/core/testing';
import { Fixture } from '../../models/fixture.interface';

describe('MatchPredictionComponent', () => {
  let component: MatchPredictionComponent;
  let fixture: ComponentFixture<MatchPredictionComponent>;

  const mockFixtureWithPredictions: Fixture = {
    id: 1,
    homeTeam: { id: 1, name: 'Manchester City' },
    awayTeam: { id: 2, name: 'Liverpool' },
    kickoffTime: new Date('2024-05-15T20:00:00Z'),
    status: 'scheduled',
    homeWinProbability: 0.65,
    drawProbability: 0.20,
    awayWinProbability: 0.15,
    predictionConfidence: 'high',
    lastCalculated: new Date('2024-05-14T10:00:00Z'),
    formPeriodUsed: 10
  };

  const mockFixtureWithoutPredictions: Fixture = {
    id: 2,
    homeTeam: { id: 3, name: 'Chelsea' },
    awayTeam: { id: 4, name: 'Arsenal' },
    kickoffTime: new Date('2024-05-16T15:00:00Z'),
    status: 'scheduled'
  };

  const mockPostponedFixture: Fixture = {
    id: 3,
    homeTeam: { id: 5, name: 'Tottenham' },
    awayTeam: { id: 6, name: 'Manchester United' },
    kickoffTime: new Date('2024-05-17T18:00:00Z'),
    status: 'postponed'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchPredictionComponent, ProbabilityIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchPredictionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('hasPredictions getter', () => {
    it('should return true when all predictions are present', () => {
      component.fixture = mockFixtureWithPredictions;
      expect(component.hasPredictions).toBe(true);
    });

    it('should return false when predictions are missing', () => {
      component.fixture = mockFixtureWithoutPredictions;
      expect(component.hasPredictions).toBe(false);
    });

    it('should return false when only some predictions are present', () => {
      const partialPrediction: Fixture = {
        ...mockFixtureWithoutPredictions,
        homeWinProbability: 0.5,
        drawProbability: 0.3
        // Missing awayWinProbability
      };
      component.fixture = partialPrediction;
      expect(component.hasPredictions).toBe(false);
    });
  });

  describe('showDetailedView', () => {
    it('should initially show detailed view on large screens', () => {
      // Mock window.innerWidth for large screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      component.ngOnInit();
      expect(component.showDetailedView()).toBe(true);
    });

    it('should initially hide detailed view on mobile screens', () => {
      // Mock window.innerWidth for mobile screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      component.ngOnInit();
      expect(component.showDetailedView()).toBe(false);
    });
  });

  describe('toggleDetailedView', () => {
    it('should toggle the detailed view state', () => {
      component.ngOnInit();
      const initialState = component.showDetailedView();

      component.toggleDetailedView();
      expect(component.showDetailedView()).toBe(!initialState);

      component.toggleDetailedView();
      expect(component.showDetailedView()).toBe(initialState);
    });
  });

  describe('getShortTeamName', () => {
    it('should handle Manchester teams correctly', () => {
      expect(component.getShortTeamName('Manchester City')).toBe('City');
      expect(component.getShortTeamName('Manchester United')).toBe('United');
    });

    it('should handle Tottenham correctly', () => {
      expect(component.getShortTeamName('Tottenham')).toBe('Spurs');
      expect(component.getShortTeamName('Tottenham Hotspur')).toBe('Spurs');
    });

    it('should return last word for multi-word team names', () => {
      expect(component.getShortTeamName('West Ham United')).toBe('United');
      expect(component.getShortTeamName('Brighton Hove Albion')).toBe('Albion');
    });

    it('should return full name for single word teams', () => {
      expect(component.getShortTeamName('Arsenal')).toBe('Arsenal');
      expect(component.getShortTeamName('Chelsea')).toBe('Chelsea');
    });
  });

  describe('getTimeAgo', () => {
    beforeEach(() => {
      // Mock current time to a specific date for consistent testing
      vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "less than 1 hour ago" for recent times', () => {
      const recentTime = new Date('2024-05-15T11:30:00Z'); // 30 minutes ago
      expect(component.getTimeAgo(recentTime)).toBe('less than 1 hour ago');
    });

    it('should return "1 hour ago" for exactly one hour', () => {
      const oneHourAgo = new Date('2024-05-15T11:00:00Z');
      expect(component.getTimeAgo(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return hours for multiple hours within a day', () => {
      const threeHoursAgo = new Date('2024-05-15T09:00:00Z');
      expect(component.getTimeAgo(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should return "1 day ago" for exactly one day', () => {
      const oneDayAgo = new Date('2024-05-14T12:00:00Z');
      expect(component.getTimeAgo(oneDayAgo)).toBe('1 day ago');
    });

    it('should return days for multiple days', () => {
      const threeDaysAgo = new Date('2024-05-12T12:00:00Z');
      expect(component.getTimeAgo(threeDaysAgo)).toBe('3 days ago');
    });
  });

  describe('getStatusText', () => {
    it('should return correct status text for different statuses', () => {
      expect(component.getStatusText('postponed')).toBe('Postponed');
      expect(component.getStatusText('cancelled')).toBe('Cancelled');
      expect(component.getStatusText('completed')).toBe('Completed');
      expect(component.getStatusText('scheduled')).toBe('scheduled');
    });
  });

  describe('template rendering with predictions', () => {
    beforeEach(() => {
      component.fixture = mockFixtureWithPredictions;
      fixture.detectChanges();
    });

    it('should display team names correctly', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const teamNames = compiled.querySelectorAll('.team-name');

      expect(teamNames[0]?.textContent).toContain('Manchester City');
      expect(teamNames[1]?.textContent).toContain('Liverpool');
    });

    it('should display kick-off time', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const matchTime = compiled.querySelector('.match-time');
      expect(matchTime?.textContent).toBeTruthy();
    });

    it('should show predictions section when predictions are available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const predictionsSection = compiled.querySelector('.predictions-section');
      expect(predictionsSection?.hasAttribute('hidden')).toBe(false);
    });

    it('should display confidence badge with correct class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const confidenceBadge = compiled.querySelector('.confidence-badge');

      expect(confidenceBadge?.textContent).toContain('high confidence');
      expect(confidenceBadge?.classList.contains('high')).toBe(true);
    });

    it('should display probability percentages in summary view', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const probPercentages = compiled.querySelectorAll('.prob-percentage');

      expect(probPercentages[0]?.textContent).toContain('65%'); // Home win
      expect(probPercentages[1]?.textContent).toContain('20%'); // Draw
      expect(probPercentages[2]?.textContent).toContain('15%'); // Away win
    });

    it('should display last updated timestamp', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const lastUpdated = compiled.querySelector('.last-updated');
      expect(lastUpdated?.textContent).toBeTruthy();
    });

    it('should show details toggle button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const toggleButton = compiled.querySelector('.details-toggle');
      expect(toggleButton).toBeTruthy();
    });
  });

  describe('template rendering without predictions', () => {
    beforeEach(() => {
      component.fixture = mockFixtureWithoutPredictions;
      fixture.detectChanges();
    });

    it('should hide predictions section when no predictions available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const predictionsSection = compiled.querySelector('.predictions-section');
      expect(predictionsSection?.hasAttribute('hidden')).toBe(true);
    });

    it('should show no predictions message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const noPredictionsMessage = compiled.querySelector('.no-predictions-message');

      expect(noPredictionsMessage?.hasAttribute('hidden')).toBe(false);
      expect(noPredictionsMessage?.textContent).toContain('Prediction unavailable');
      expect(noPredictionsMessage?.textContent).toContain('Insufficient historical data');
    });

    it('should add no-predictions class to card', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.match-prediction-card');
      expect(card?.classList.contains('no-predictions')).toBe(true);
    });
  });

  describe('template rendering for postponed fixture', () => {
    beforeEach(() => {
      component.fixture = mockPostponedFixture;
      fixture.detectChanges();
    });

    it('should display status message for non-scheduled matches', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statusMessage = compiled.querySelector('.status-message');

      expect(statusMessage).toBeTruthy();
      expect(statusMessage?.textContent).toContain('Postponed');
    });

    it('should apply correct status class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statusElement = compiled.querySelector('.status.postponed');
      expect(statusElement).toBeTruthy();
    });
  });

  describe('detailed view toggle functionality', () => {
    beforeEach(() => {
      component.fixture = mockFixtureWithPredictions;
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should toggle between summary and detailed view when button is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const toggleButton = compiled.querySelector('.details-toggle') as HTMLButtonElement;

      const initialButtonText = toggleButton.textContent?.trim();

      // Click to toggle
      toggleButton.click();
      fixture.detectChanges();

      const newButtonText = toggleButton.textContent?.trim();
      expect(newButtonText).not.toBe(initialButtonText);

      // Verify the view actually changed
      const summaryView = compiled.querySelector('.probabilities');
      const detailedView = compiled.querySelector('.detailed-probabilities');

      // Should show opposite of what was initially shown
      if (initialButtonText?.includes('Less')) {
        expect(summaryView?.hasAttribute('hidden')).toBe(false);
        expect(detailedView?.hasAttribute('hidden')).toBe(true);
      } else {
        expect(summaryView?.hasAttribute('hidden')).toBe(true);
        expect(detailedView?.hasAttribute('hidden')).toBe(false);
      }
    });
  });

  describe('confidence indicators', () => {
    it('should apply correct styling for medium confidence', () => {
      const mediumConfidenceFixture: Fixture = {
        ...mockFixtureWithPredictions,
        predictionConfidence: 'medium'
      };
      component.fixture = mediumConfidenceFixture;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const confidenceBadge = compiled.querySelector('.confidence-badge');

      expect(confidenceBadge?.classList.contains('medium')).toBe(true);
      expect(confidenceBadge?.textContent).toContain('medium confidence');
    });

    it('should apply correct styling for low confidence', () => {
      const lowConfidenceFixture: Fixture = {
        ...mockFixtureWithPredictions,
        predictionConfidence: 'low'
      };
      component.fixture = lowConfidenceFixture;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const confidenceBadge = compiled.querySelector('.confidence-badge');

      expect(confidenceBadge?.classList.contains('low')).toBe(true);
      expect(confidenceBadge?.textContent).toContain('low confidence');
    });
  });

  describe('accessibility and mobile optimization', () => {
    beforeEach(() => {
      component.fixture = mockFixtureWithPredictions;
      fixture.detectChanges();
    });

    it('should have proper semantic structure', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.match-header')).toBeTruthy();
      expect(compiled.querySelector('.predictions-section')).toBeTruthy();
      expect(compiled.querySelector('.prediction-metadata')).toBeTruthy();
    });

    it('should include team name shortening for mobile display', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const shortNames = compiled.querySelectorAll('.team-name-short');

      expect(shortNames.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle fixture with cancelled status', () => {
      const cancelledFixture: Fixture = {
        ...mockFixtureWithPredictions,
        status: 'cancelled'
      };
      component.fixture = cancelledFixture;
      fixture.detectChanges();

      expect(component.getStatusText('cancelled')).toBe('Cancelled');
    });

    it('should handle very old last calculated time', () => {
      const oldDate = new Date('2024-01-01T10:00:00Z');
      vi.setSystemTime(new Date('2024-05-15T12:00:00Z'));

      const result = component.getTimeAgo(oldDate);
      expect(result).toMatch(/\d+ days ago/);

      vi.useRealTimers();
    });

    it('should handle missing lastCalculated date', () => {
      const fixtureWithoutTimestamp: Fixture = {
        ...mockFixtureWithPredictions,
        lastCalculated: undefined
      };
      component.fixture = fixtureWithoutTimestamp;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const lastUpdated = compiled.querySelector('.last-updated');
      expect(lastUpdated).toBeFalsy();
    });
  });
});