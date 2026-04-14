import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchResultsComponent } from './match-results.component';
import { Match } from '../../services/football-data.service';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('MatchResultsComponent', () => {
  let component: MatchResultsComponent;
  let fixture: ComponentFixture<MatchResultsComponent>;

  const mockMatches: Match[] = [
    {
      id: 1,
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      homeScore: 2,
      awayScore: 1,
      matchDate: new Date('2024-04-13T15:00:00Z'),
      status: 'FINISHED'
    },
    {
      id: 2,
      homeTeam: 'Manchester United',
      awayTeam: 'Liverpool',
      homeScore: 1,
      awayScore: 3,
      matchDate: new Date('2024-04-12T15:00:00Z'),
      status: 'FINISHED'
    },
    {
      id: 3,
      homeTeam: 'Manchester City',
      awayTeam: 'Tottenham',
      homeScore: 1,
      awayScore: 1,
      matchDate: new Date('2024-04-11T15:00:00Z'),
      status: 'FINISHED'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchResultsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display match results when matches are provided', () => {
    component.matches = mockMatches;
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    const matchCards = fixture.debugElement.queryAll(By.css('.match-card:not(.skeleton)'));
    expect(matchCards.length).toBe(3);

    // Check first match details
    const firstCard = matchCards[0];
    expect(firstCard.nativeElement.textContent).toContain('Arsenal');
    expect(firstCard.nativeElement.textContent).toContain('Chelsea');
    expect(firstCard.nativeElement.textContent).toContain('2');
    expect(firstCard.nativeElement.textContent).toContain('1');
  });

  it('should display loading skeleton when loading is true', () => {
    component.loading = true;
    component.matches = [];
    component.error = null;

    fixture.detectChanges();

    const skeletonCards = fixture.debugElement.queryAll(By.css('.match-card.skeleton'));
    expect(skeletonCards.length).toBe(10); // Should show 10 skeleton cards

    const skeletonText = fixture.debugElement.queryAll(By.css('.skeleton-text'));
    expect(skeletonText.length).toBeGreaterThan(0);
  });

  it('should display error state when error is provided', () => {
    component.loading = false;
    component.matches = [];
    component.error = 'API error occurred';

    fixture.detectChanges();

    const errorState = fixture.debugElement.query(By.css('.error-state'));
    expect(errorState).toBeTruthy();
    expect(errorState.nativeElement.textContent).toContain('Unable to load match results');
    expect(errorState.nativeElement.textContent).toContain('API error occurred');
  });

  it('should display empty state when no matches and no error', () => {
    component.loading = false;
    component.matches = [];
    component.error = null;

    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('No matches found');
  });

  it('should format match date correctly', () => {
    const testDate = new Date('2024-04-13T15:00:00Z');
    const formatted = component.formatMatchDate(testDate);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
    // Should include day, month and time
    expect(formatted).toMatch(/\w{3}/); // Day abbreviation
    expect(formatted).toMatch(/\d{1,2}/); // Day number
    expect(formatted).toMatch(/\w{3}/); // Month abbreviation
    expect(formatted).toMatch(/\d{2}:\d{2}/); // Time format
  });

  it('should determine match result correctly', () => {
    expect(component.getMatchResult(mockMatches[0])).toBe('home-win'); // Arsenal 2-1 Chelsea
    expect(component.getMatchResult(mockMatches[1])).toBe('away-win'); // Man Utd 1-3 Liverpool
    expect(component.getMatchResult(mockMatches[2])).toBe('draw'); // Man City 1-1 Tottenham
  });

  it('should apply correct CSS classes for match results', () => {
    component.matches = mockMatches;
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    const matchCards = fixture.debugElement.queryAll(By.css('.match-card:not(.skeleton)'));

    expect(matchCards[0].nativeElement.classList).toContain('home-win');
    expect(matchCards[1].nativeElement.classList).toContain('away-win');
    expect(matchCards[2].nativeElement.classList).toContain('draw');
  });

  it('should display team names and scores correctly', () => {
    component.matches = [mockMatches[0]];
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    const homeTeamName = fixture.debugElement.query(By.css('.team.home .team-name'));
    const awayTeamName = fixture.debugElement.query(By.css('.team.away .team-name'));
    const homeScore = fixture.debugElement.query(By.css('.team.home .team-score'));
    const awayScore = fixture.debugElement.query(By.css('.team.away .team-score'));

    expect(homeTeamName.nativeElement.textContent.trim()).toBe('Arsenal');
    expect(awayTeamName.nativeElement.textContent.trim()).toBe('Chelsea');
    expect(homeScore.nativeElement.textContent.trim()).toBe('2');
    expect(awayScore.nativeElement.textContent.trim()).toBe('1');
  });

  it('should display match date correctly', () => {
    component.matches = [mockMatches[0]];
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    const matchDate = fixture.debugElement.query(By.css('.match-date'));
    expect(matchDate.nativeElement.textContent).toBeTruthy();
    expect(matchDate.nativeElement.textContent.length).toBeGreaterThan(0);
  });

  it('should show results header', () => {
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('.results-header h2'));
    expect(header).toBeTruthy();
    expect(header.nativeElement.textContent).toContain('Recent Premier League Results');
  });

  it('should handle empty match arrays gracefully', () => {
    component.matches = [];
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    const matchCards = fixture.debugElement.queryAll(By.css('.match-card:not(.skeleton)'));
    expect(matchCards.length).toBe(0);

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('should handle matches with missing or invalid data', () => {
    const invalidMatch: Match = {
      id: 999,
      homeTeam: '',
      awayTeam: '',
      homeScore: 0,
      awayScore: 0,
      matchDate: new Date('invalid-date'),
      status: 'FINISHED'
    };

    component.matches = [invalidMatch];
    component.loading = false;
    component.error = null;

    fixture.detectChanges();

    // Should not crash and should render the card
    const matchCards = fixture.debugElement.queryAll(By.css('.match-card:not(.skeleton)'));
    expect(matchCards.length).toBe(1);
  });

  it('should not show loading skeleton when not loading', () => {
    component.loading = false;
    component.matches = mockMatches;
    component.error = null;

    fixture.detectChanges();

    const skeletonCards = fixture.debugElement.queryAll(By.css('.match-card.skeleton'));
    expect(skeletonCards.length).toBe(0);
  });

  it('should not show error state when no error', () => {
    component.loading = false;
    component.matches = mockMatches;
    component.error = null;

    fixture.detectChanges();

    const errorState = fixture.debugElement.query(By.css('.error-state'));
    expect(errorState).toBeFalsy();
  });
});