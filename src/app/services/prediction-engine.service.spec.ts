import { TestBed } from '@angular/core/testing';
import { PredictionEngineService } from './prediction-engine.service';
import { FormDataService } from './form-data.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('PredictionEngineService', () => {
  let service: PredictionEngineService;
  let mockFormDataService: any;
  let mockTeamForm: any;

  beforeEach(() => {
    mockTeamForm = {
      teamId: 'arsenal',
      teamName: 'Arsenal',
      recentMatches: [
        {
          date: '2024-04-01T00:00:00.000Z',
          opponent: 'Chelsea',
          isHome: true,
          result: 'win' as const,
          goalsFor: 2,
          goalsAgainst: 1,
          points: 3
        }
      ],
      formRating: 75,
      homeFormRating: 80,
      awayFormRating: 70
    };

    mockFormDataService = {
      getTeamForm: vi.fn().mockReturnValue(of(mockTeamForm)),
      getMultipleTeamForms: vi.fn().mockReturnValue(of(new Map([
        ['arsenal', mockTeamForm],
        ['chelsea', { ...mockTeamForm, teamId: 'chelsea', homeFormRating: 65, awayFormRating: 60 }]
      ])))
    };

    TestBed.configureTestingModule({
      providers: [
        PredictionEngineService,
        { provide: FormDataService, useValue: mockFormDataService }
      ]
    });

    service = TestBed.inject(PredictionEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate prediction successfully', async () => {
    const request = {
      fixtureId: 'fixture-1',
      homeTeamId: 'arsenal',
      awayTeamId: 'chelsea'
    };

    const response = await service.calculatePrediction(request).toPromise();

    expect(response).toBeTruthy();
    expect(response!.success).toBe(true);
    expect(response!.prediction).toBeDefined();
    expect(response!.prediction.home_win_probability).toBeGreaterThan(0);
    expect(response!.prediction.draw_probability).toBeGreaterThan(0);
    expect(response!.prediction.away_win_probability).toBeGreaterThan(0);

    // Probabilities should sum to approximately 1
    const total = response!.prediction.home_win_probability +
                 response!.prediction.draw_probability +
                 response!.prediction.away_win_probability;
    expect(total).toBeCloseTo(1, 2);

    expect(response!.prediction.prediction_confidence).toMatch(/^(high|medium|low)$/);
    expect(response!.prediction.form_period_used).toBeGreaterThan(0);
  });

  it('should handle insufficient form data', async () => {
    mockFormDataService.getTeamForm.mockReturnValue(of(null));

    const request = {
      fixtureId: 'fixture-1',
      homeTeamId: 'unknown-team',
      awayTeamId: 'chelsea'
    };

    const response = await service.calculatePrediction(request).toPromise();

    expect(response).toBeTruthy();
    expect(response!.success).toBe(false);
    expect(response!.message).toBe('Insufficient form data available');
    expect(response!.prediction.prediction_confidence).toBe('low');
  });

  it('should use cache for repeated requests', async () => {
    const request = {
      fixtureId: 'fixture-1',
      homeTeamId: 'arsenal',
      awayTeamId: 'chelsea'
    };

    // First request
    const firstResponse = await service.calculatePrediction(request).toPromise();
    expect(firstResponse!.success).toBe(true);

    // Second request - should use cache
    const secondResponse = await service.calculatePrediction(request).toPromise();
    expect(secondResponse!.success).toBe(true);
    expect(mockFormDataService.getTeamForm).toHaveBeenCalledTimes(2); // Only called once per team
  });

  it('should force recalculation when requested', async () => {
    const request = {
      fixtureId: 'fixture-1',
      homeTeamId: 'arsenal',
      awayTeamId: 'chelsea',
      recalculate: true
    };

    const response = await service.calculatePrediction(request).toPromise();
    expect(response!.success).toBe(true);
    expect(mockFormDataService.getTeamForm).toHaveBeenCalled();
  });

  it('should calculate multiple predictions', async () => {
    const fixtures = [
      { id: 'fixture-1', homeTeamId: 'arsenal', awayTeamId: 'chelsea' },
      { id: 'fixture-2', homeTeamId: 'chelsea', awayTeamId: 'arsenal' }
    ];

    const predictions = await service.calculateMultiplePredictions(fixtures).toPromise();
    expect(predictions!.size).toBe(2);
    expect(predictions!.has('fixture-1')).toBe(true);
    expect(predictions!.has('fixture-2')).toBe(true);

    const prediction1 = predictions!.get('fixture-1')!;
    expect(prediction1.home_win_probability).toBeGreaterThan(0);
    expect(prediction1.prediction_confidence).toMatch(/^(high|medium|low)$/);
  });

  it('should clear cache correctly', () => {
    service.clearPredictionCache();
    expect(service.getCachedPrediction('arsenal', 'chelsea')).toBeNull();
  });
});