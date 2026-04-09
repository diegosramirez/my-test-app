import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FootballDataService } from './football-data.service';
import { FootballData, ApiResponse } from '../interfaces/football-data.interface';

describe('FootballDataService', () => {
  let service: FootballDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FootballDataService]
    });
    service = TestBed.inject(FootballDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch competition data successfully', () => {
    const mockResponse = {
      competition: { name: 'Premier League' },
      season: { startDate: '2024', currentMatchday: 1 },
      matches: [
        {
          id: '1',
          homeTeam: { id: '1', name: 'Team A', shortName: 'TA', crest: '' },
          awayTeam: { id: '2', name: 'Team B', shortName: 'TB', crest: '' },
          score: { fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
          status: 'SCHEDULED' as const,
          utcDate: '2024-01-01T15:00:00Z'
        }
      ]
    };

    service.fetchCompetitionData('PL').subscribe((response: ApiResponse<FootballData>) => {
      expect(response.status).toBe(200);
      expect(response.data.competition).toBe('Premier League');
      expect(response.data.matches).toHaveLength(1);
      expect(response.data.matches[0].id).toBe('1');
    });

    const req = httpMock.expectOne('https://api.football-data.org/v4/competitions/PL/matches');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Auth-Token')).toBe('your-api-key');

    req.flush(mockResponse, { status: 200, statusText: 'OK', headers: { 'X-RateLimit-Remaining': '99' } });
  });

  it('should handle API errors gracefully', () => {
    service.fetchCompetitionData('PL').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.status).toBe(500);
        expect(error.message).toContain('HTTP 500');
      }
    });

    const req = httpMock.expectOne('https://api.football-data.org/v4/competitions/PL/matches');
    req.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle rate limiting', () => {
    const mockResponse = { competition: {}, matches: [] };

    service.fetchCompetitionData('PL').subscribe();

    const req = httpMock.expectOne('https://api.football-data.org/v4/competitions/PL/matches');
    req.flush(mockResponse, {
      status: 200,
      statusText: 'OK',
      headers: { 'X-RateLimit-Remaining': '3' }
    });

    expect(service.isRateLimited()).toBe(true);
  });

  it('should track health metrics', () => {
    const metrics = service.getHealthMetrics();

    expect(metrics).toEqual(expect.objectContaining({
      responseTime: expect.any(Number),
      successRate: expect.any(Number),
      lastSuccessfulFetch: expect.any(Number),
      rateLimitRemaining: expect.any(Number),
      consecutiveFailures: expect.any(Number),
      totalRequests: expect.any(Number)
    }));
  });

  it('should check if requests can be made', () => {
    expect(service.canMakeRequest()).toBe(true);

    // Simulate rate limiting
    const mockResponse = { competition: {}, matches: [] };
    service.fetchCompetitionData('PL').subscribe();

    const req = httpMock.expectOne('https://api.football-data.org/v4/competitions/PL/matches');
    req.flush(mockResponse, {
      status: 200,
      statusText: 'OK',
      headers: { 'X-RateLimit-Remaining': '2' }
    });

    expect(service.canMakeRequest()).toBe(false);
  });
});