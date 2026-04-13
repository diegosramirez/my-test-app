import { TestBed } from '@angular/core/testing';
import { of, delay, firstValueFrom } from 'rxjs';
import { SearchService } from './search.service';
import { CacheService } from './cache.service';
import { SearchResult } from './search.models';

describe('SearchService', () => {
  let service: SearchService;
  let cacheService: CacheService;
  let cacheServiceSpy: any;

  const mockResults: SearchResult[] = [
    { id: '1', title: 'Angular Guide: Getting Started', description: 'Learn the fundamentals of Angular framework' },
    { id: '2', title: 'TypeScript Best Practices', description: 'Discover essential TypeScript patterns' }
  ];

  beforeEach(() => {
    const cacheServiceMock = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      size: vi.fn().mockReturnValue(0),
      clear: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        SearchService,
        { provide: CacheService, useValue: cacheServiceMock }
      ]
    });

    service = TestBed.inject(SearchService);
    cacheService = TestBed.inject(CacheService);
    cacheServiceSpy = cacheService as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search functionality', () => {
    it('should return cached results immediately when available', async () => {
      // Arrange
      const query = 'angular';
      cacheServiceSpy.get.mockReturnValue(mockResults);

      // Act
      const startTime = performance.now();
      const result = await firstValueFrom(service.search(query));
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toEqual(mockResults);
      expect(cacheServiceSpy.get).toHaveBeenCalledWith(query);
      expect(cacheServiceSpy.set).not.toHaveBeenCalled();
      expect(duration).toBeLessThan(10); // Should be instant from cache
    });

    it('should perform API search and cache results when not cached', async () => {
      // Arrange
      const query = 'angular';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const startTime = performance.now();
      const result = await firstValueFrom(service.search(query));
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toHaveLength(5); // Should match all items containing 'angular'
      expect(result[0].title).toContain('Angular');
      expect(cacheServiceSpy.get).toHaveBeenCalledWith(query);
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, result);
      expect(duration).toBeGreaterThan(200); // Should have simulated delay
      expect(duration).toBeLessThan(600); // Should be within delay range
    });

    it('should filter results based on query in title', async () => {
      // Arrange
      const query = 'typescript';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('TypeScript');
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, result);
    });

    it('should filter results based on query in description', async () => {
      // Arrange
      const query = 'fundamentals';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('fundamentals');
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, result);
    });

    it('should return empty results for non-matching queries', async () => {
      // Arrange
      const query = 'nonexistent';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toHaveLength(0);
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, []);
    });

    it('should be case insensitive', async () => {
      // Arrange
      const query = 'ANGULAR';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].title).toContain('Angular');
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, result);
    });

    it('should handle partial matches', async () => {
      // Arrange
      const query = 'rxjs';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('RxJS');
    });

    it('should apply random delay between 200-500ms for API calls', async () => {
      // Arrange
      const query = 'test';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act - perform multiple searches to test delay randomization
      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await firstValueFrom(service.search(`test${i}`));
        const endTime = performance.now();
        delays.push(endTime - startTime);
      }

      // Assert
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(190); // Account for slight timing variations
        expect(delay).toBeLessThan(550);
      });

      // Verify delays are actually different (randomized)
      const uniqueDelays = new Set(delays.map(d => Math.floor(d / 10) * 10));
      expect(uniqueDelays.size).toBeGreaterThan(1); // Should have some variation
    });
  });

  describe('cache integration', () => {
    it('should check cache before making API call', async () => {
      // Arrange
      const query = 'cached-query';
      const callOrder: string[] = [];

      cacheServiceSpy.get.mockImplementation(() => {
        callOrder.push('get');
        return null;
      });

      cacheServiceSpy.set.mockImplementation(() => {
        callOrder.push('set');
      });

      // Act
      await firstValueFrom(service.search(query));

      // Assert
      expect(callOrder).toEqual(['get', 'set']);
      expect(cacheServiceSpy.get).toHaveBeenCalledWith(query);
    });

    it('should not call set when cache hit occurs', async () => {
      // Arrange
      const query = 'cached-query';
      cacheServiceSpy.get.mockReturnValue(mockResults);

      // Act
      await firstValueFrom(service.search(query));

      // Assert
      expect(cacheServiceSpy.get).toHaveBeenCalledWith(query);
      expect(cacheServiceSpy.set).not.toHaveBeenCalled();
    });

    it('should cache empty results for queries with no matches', async () => {
      // Arrange
      const query = 'nomatch';
      cacheServiceSpy.get.mockReturnValue(null);

      // Act
      const result = await firstValueFrom(service.search(query));

      // Assert
      expect(result).toEqual([]);
      expect(cacheServiceSpy.set).toHaveBeenCalledWith(query, []);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Arrange
      cacheServiceSpy.size.mockReturnValue(25);

      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats.size).toBe(25);
      expect(stats.hitRate).toBe(0); // Hit rate tracking not fully implemented
      expect(cacheServiceSpy.size).toHaveBeenCalled();
    });

    it('should handle zero cache size', () => {
      // Arrange
      cacheServiceSpy.size.mockReturnValue(0);

      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle cache service errors by throwing', async () => {
      // Arrange
      const query = 'error-test';
      cacheServiceSpy.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Act & Assert - should throw the cache error
      await expect(firstValueFrom(service.search(query))).rejects.toThrow('Cache error');
    });

    it('should handle cache set errors gracefully', async () => {
      // Arrange
      const query = 'angular';
      cacheServiceSpy.get.mockReturnValue(null);
      cacheServiceSpy.set.mockImplementation(() => {
        throw new Error('Cache set error');
      });

      // Act & Assert - should complete search despite cache error
      const result = await firstValueFrom(service.search(query));
      expect(result).toHaveLength(5); // Should still return filtered results (5 items match 'angular')
    });
  });

  describe('multiple concurrent searches', () => {
    it('should handle concurrent searches correctly', async () => {
      // Arrange
      const queries = ['angular', 'typescript', 'rxjs'];
      cacheServiceSpy.get.mockReturnValue(null);

      // Act - start multiple searches concurrently
      const promises = queries.map(query => firstValueFrom(service.search(query)));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(5); // angular matches
      expect(results[1]).toHaveLength(1); // typescript matches
      expect(results[2]).toHaveLength(1); // rxjs matches
      expect(cacheServiceSpy.set).toHaveBeenCalledTimes(3);
    });
  });
});