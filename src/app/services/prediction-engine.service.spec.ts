import { TestBed } from '@angular/core/testing';
import { of as rxOf, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { PredictionEngineService } from './prediction-engine.service';
import { FormDataService } from './form-data.service';
import { Fixture } from '../models/fixture.interface';

describe('PredictionEngineService', () => {
  let service: PredictionEngineService;
  let mockFormDataService: any;
  let mockFixture: Fixture;

  beforeEach(() => {
    mockFormDataService = {
      getTeamForm: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PredictionEngineService,
        { provide: FormDataService, useValue: mockFormDataService }
      ]
    });

    service = TestBed.inject(PredictionEngineService);

    mockFixture = {
      id: 1,
      homeTeam: { id: 1, name: 'Team A' },
      awayTeam: { id: 2, name: 'Team B' },
      kickoffTime: new Date(),
      status: 'scheduled'
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return fixture without predictions for non-scheduled matches', async () => {
    const postponedFixture = { ...mockFixture, status: 'postponed' as const };

    const result = await firstValueFrom(service.calculateSinglePrediction(postponedFixture));
    expect(result).toEqual(postponedFixture);
    expect(result.homeWinProbability).toBeUndefined();
    expect(result.drawProbability).toBeUndefined();
    expect(result.awayWinProbability).toBeUndefined();
  });

  it('should calculate predictions for scheduled matches with sufficient data', async () => {
    const mockHomeForm = {
      teamId: 1,
      matches: Array(10).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 1, name: 'Team A' },
        awayTeam: { id: 2, name: 'Team B' },
        homeScore: 2,
        awayScore: 1,
        result: 'win' as const
      })),
      winPercentage: 0.7,
      points: 21,
      goalsFor: 20,
      goalsAgainst: 10
    };

    const mockAwayForm = {
      teamId: 2,
      matches: Array(10).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 2, name: 'Team B' },
        awayTeam: { id: 1, name: 'Team A' },
        homeScore: 1,
        awayScore: 2,
        result: 'loss' as const
      })),
      winPercentage: 0.3,
      points: 9,
      goalsFor: 10,
      goalsAgainst: 20
    };

    mockFormDataService.getTeamForm
      .mockReturnValueOnce(rxOf(mockHomeForm))
      .mockReturnValueOnce(rxOf(mockAwayForm));

    const result = await firstValueFrom(service.calculateSinglePrediction(mockFixture));
    expect(result.homeWinProbability).toBeDefined();
    expect(result.drawProbability).toBeDefined();
    expect(result.awayWinProbability).toBeDefined();
    expect(result.predictionConfidence).toBeDefined();
    expect(result.lastCalculated).toBeDefined();
    expect(result.formPeriodUsed).toBe(10);

    // Probabilities should sum to approximately 1.0
    const total = result.homeWinProbability! + result.drawProbability! + result.awayWinProbability!;
    expect(total).toBeCloseTo(1.0, 2);

    // Home team should have higher probability due to better form and home advantage
    expect(result.homeWinProbability!).toBeGreaterThan(result.awayWinProbability!);
  });

  it('should return fixture without predictions for insufficient data', async () => {
    const mockHomeFormInsufficient = {
      teamId: 1,
      matches: Array(3).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 1, name: 'Team A' },
        awayTeam: { id: 2, name: 'Team B' },
        homeScore: 2,
        awayScore: 1,
        result: 'win' as const
      })),
      winPercentage: 1.0,
      points: 9,
      goalsFor: 6,
      goalsAgainst: 3
    };

    const mockAwayFormInsufficient = {
      teamId: 2,
      matches: Array(4).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 2, name: 'Team B' },
        awayTeam: { id: 1, name: 'Team A' },
        homeScore: 0,
        awayScore: 1,
        result: 'loss' as const
      })),
      winPercentage: 0.0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 4
    };

    mockFormDataService.getTeamForm
      .mockReturnValueOnce(rxOf(mockHomeFormInsufficient))
      .mockReturnValueOnce(rxOf(mockAwayFormInsufficient));

    const result = await firstValueFrom(service.calculateSinglePrediction(mockFixture));
    expect(result.homeWinProbability).toBeUndefined();
    expect(result.drawProbability).toBeUndefined();
    expect(result.awayWinProbability).toBeUndefined();
  });

  it('should refresh predictions and clear cache', (done) => {
    const fixtures = [mockFixture];

    const mockHomeForm = {
      teamId: 1,
      matches: Array(10).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 1, name: 'Team A' },
        awayTeam: { id: 2, name: 'Team B' },
        homeScore: 2,
        awayScore: 1,
        result: 'win' as const
      })),
      winPercentage: 0.7,
      points: 21,
      goalsFor: 20,
      goalsAgainst: 10
    };

    const mockAwayForm = {
      teamId: 2,
      matches: Array(10).fill(null).map((_, i) => ({
        id: i,
        date: new Date(),
        homeTeam: { id: 2, name: 'Team B' },
        awayTeam: { id: 1, name: 'Team A' },
        homeScore: 1,
        awayScore: 2,
        result: 'loss' as const
      })),
      winPercentage: 0.3,
      points: 9,
      goalsFor: 10,
      goalsAgainst: 20
    };

    mockFormDataService.getTeamForm
      .mockReturnValueOnce(rxOf(mockHomeForm))
      .mockReturnValueOnce(rxOf(mockAwayForm));

    service.refreshPredictions(fixtures).subscribe(result => {
      expect(result).toHaveLength(1);
      expect(result[0].homeWinProbability).toBeDefined();
      done();
    });
  });

  it('should provide last refresh time', (done) => {
    service.getLastRefreshTime().subscribe(time => {
      expect(time).toBeInstanceOf(Date);
      done();
    });
  });

  it('should clear cache successfully', () => {
    expect(() => service.clearCache()).not.toThrow();
  });
});

