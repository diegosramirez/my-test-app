import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FootballDataService, Match, MatchResponse } from './football-data.service';

describe('FootballDataService', () => {
  let service: FootballDataService;
  let httpMock: HttpTestingController;

  const mockApiResponse: MatchResponse = {
    matches: [
      {
        id: 1,
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
        score: { fullTime: { home: 2, away: 1 } },
        utcDate: '2024-04-13T15:00:00Z',
        status: 'FINISHED'
      },
      {
        id: 2,
        homeTeam: { name: 'Manchester United' },
        awayTeam: { name: 'Liverpool' },
        score: { fullTime: { home: 1, away: 3 } },
        utcDate: '2024-04-12T15:00:00Z',
        status: 'FINISHED'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FootballDataService]
    });
    service = TestBed.inject(FootballDataService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch recent matches from API', (done) => {
    service.getRecentMatches().subscribe(matches => {
      expect(matches).toBeDefined();
      expect(matches.length).toBe(2);
      expect(matches[0].homeTeam).toBe('Arsenal');
      expect(matches[0].awayTeam).toBe('Chelsea');
      expect(matches[0].homeScore).toBe(2);
      expect(matches[0].awayScore).toBe(1);
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Auth-Token')).toBe('demo-key');
    req.flush(mockApiResponse);
  });

  it('should transform API data correctly', (done) => {
    service.getRecentMatches().subscribe(matches => {
      const match = matches[0];
      expect(match.id).toBe(1);
      expect(match.homeTeam).toBe('Arsenal');
      expect(match.awayTeam).toBe('Chelsea');
      expect(match.homeScore).toBe(2);
      expect(match.awayScore).toBe(1);
      expect(match.matchDate).toBeInstanceOf(Date);
      expect(match.status).toBe('FINISHED');
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush(mockApiResponse);
  });

  it('should cache match data in localStorage', (done) => {
    service.getRecentMatches().subscribe(() => {
      const cached = localStorage.getItem('premier-league-matches');
      expect(cached).toBeTruthy();

      const parsedCache = JSON.parse(cached!);
      expect(parsedCache.data).toBeDefined();
      expect(parsedCache.timestamp).toBeDefined();
      expect(parsedCache.data.length).toBe(2);
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush(mockApiResponse);
  });

  it('should return cached data when API fails', (done) => {
    // First, set up cached data
    const cachedData = {
      data: [{
        id: 1,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeScore: 2,
        awayScore: 1,
        matchDate: new Date(),
        status: 'FINISHED'
      }],
      timestamp: new Date()
    };
    localStorage.setItem('premier-league-matches', JSON.stringify(cachedData));

    service.getRecentMatches().subscribe(matches => {
      expect(matches).toBeDefined();
      expect(matches.length).toBe(1);
      expect(matches[0].homeTeam).toBe('Arsenal');
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle API errors and update error state', (done) => {
    let errorReceived = false;

    service.error$.subscribe(error => {
      if (error) {
        expect(error).toContain('Server error');
        errorReceived = true;
      }
    });

    service.getRecentMatches().subscribe(() => {
      expect(errorReceived).toBe(true);
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should update loading state during API call', () => {
    let loadingStates: boolean[] = [];

    service.loading$.subscribe(loading => {
      loadingStates.push(loading);
    });

    service.getRecentMatches().subscribe();

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );

    expect(loadingStates).toContain(true);

    req.flush(mockApiResponse);

    expect(loadingStates).toContain(false);
  });

  it('should update lastUpdated timestamp after successful API call', (done) => {
    service.getRecentMatches().subscribe(() => {
      service.lastUpdated$.subscribe(timestamp => {
        if (timestamp) {
          expect(timestamp).toBeInstanceOf(Date);
          const now = new Date();
          const diff = now.getTime() - timestamp.getTime();
          expect(diff).toBeLessThan(1000); // Within 1 second
          done();
        }
      });
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush(mockApiResponse);
  });

  it('should refresh data by clearing cache', (done) => {
    // Set up cached data first
    const cachedData = {
      data: [{ id: 1, homeTeam: 'Old Team' }],
      timestamp: new Date()
    };
    localStorage.setItem('premier-league-matches', JSON.stringify(cachedData));

    service.refreshData().subscribe(matches => {
      expect(matches[0].homeTeam).toBe('Arsenal'); // New data, not cached
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush(mockApiResponse);
  });

  it('should handle missing team names gracefully', (done) => {
    const malformedResponse = {
      matches: [{
        id: 1,
        homeTeam: null,
        awayTeam: undefined,
        score: { fullTime: { home: 2, away: 1 } },
        utcDate: '2024-04-13T15:00:00Z',
        status: 'FINISHED'
      }]
    };

    service.getRecentMatches().subscribe(matches => {
      expect(matches[0].homeTeam).toBe('Unknown Team');
      expect(matches[0].awayTeam).toBe('Unknown Team');
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush(malformedResponse);
  });

  it('should return mock data when no cache is available and API fails', (done) => {
    service.getRecentMatches().subscribe(matches => {
      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].homeTeam).toBeDefined();
      done();
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('api.football-data.org/v4/competitions/PL/matches')
    );
    req.flush('Network error', { status: 0, statusText: 'Network Error' });
  });
});