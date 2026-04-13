import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';
import { SearchResult } from './search.models';

describe('CacheService', () => {
  let service: CacheService;
  const mockResults: SearchResult[] = [
    { id: '1', title: 'Test 1', description: 'Description 1' },
    { id: '2', title: 'Test 2', description: 'Description 2' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve cache entries', () => {
    service.set('test-query', mockResults);
    const retrieved = service.get('test-query');
    expect(retrieved).toEqual(mockResults);
  });

  it('should return null for non-existent cache entries', () => {
    const result = service.get('non-existent');
    expect(result).toBeNull();
  });

  it('should check if cache has entry', () => {
    service.set('test-query', mockResults);
    expect(service.has('test-query')).toBe(true);
    expect(service.has('non-existent')).toBe(false);
  });

  it('should track cache size', () => {
    expect(service.size()).toBe(0);
    service.set('query1', mockResults);
    expect(service.size()).toBe(1);
    service.set('query2', mockResults);
    expect(service.size()).toBe(2);
  });

  it('should clear all cache entries', () => {
    service.set('query1', mockResults);
    service.set('query2', mockResults);
    expect(service.size()).toBe(2);

    service.clear();
    expect(service.size()).toBe(0);
    expect(service.has('query1')).toBe(false);
  });

  it('should implement LRU eviction when cache is full', () => {
    // Fill cache to max capacity (50 items)
    for (let i = 0; i < 50; i++) {
      service.set(`query${i}`, mockResults);
    }
    expect(service.size()).toBe(50);

    // Access first item to make it recently used
    service.get('query0');

    // Add one more item to trigger eviction
    service.set('new-query', mockResults);

    expect(service.size()).toBe(50);
    expect(service.has('query0')).toBe(true); // Should still exist (was accessed)
    expect(service.has('query1')).toBe(false); // Should be evicted (LRU)
  });

  it('should update access order when retrieving items', () => {
    service.set('query1', mockResults);
    service.set('query2', mockResults);

    // Access query1 to make it more recently used
    service.get('query1');

    // Fill cache to capacity
    for (let i = 3; i < 51; i++) {
      service.set(`query${i}`, mockResults);
    }

    // Add one more to trigger eviction
    service.set('new-query', mockResults);

    expect(service.has('query1')).toBe(true); // Should still exist (was accessed)
    expect(service.has('query2')).toBe(false); // Should be evicted
  });
});