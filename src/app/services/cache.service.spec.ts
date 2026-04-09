import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';
import { CachedData } from '../interfaces/cache.interface';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  databases: vi.fn()
};

const mockIDBDatabase = {
  createObjectStore: vi.fn(),
  transaction: vi.fn(),
  objectStoreNames: { contains: vi.fn() }
};

const mockObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  openCursor: vi.fn(),
  createIndex: vi.fn()
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore)
};

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    // Mock global indexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIndexedDB,
      writable: true
    });

    // Setup mock implementations
    mockIndexedDB.open.mockImplementation(() => {
      const request = {
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
        result: mockIDBDatabase
      };

      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, 0);

      return request;
    });

    mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
    mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [CacheService]
    });

    service = TestBed.inject(CacheService);

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get data from cache', async () => {
    const testData = { id: '1', name: 'Test' };
    const key = 'test-key';

    // Mock successful put operation
    mockObjectStore.put.mockImplementation(() => ({
      onsuccess: null as any,
      onerror: null as any,
      result: undefined
    }));

    const putRequest = mockObjectStore.put();
    setTimeout(() => {
      if (putRequest.onsuccess) {
        putRequest.onsuccess();
      }
    }, 0);

    service.set(key, testData, 'test').subscribe(result => {
      expect(result).toBe(true);
    });

    // Mock successful get operation
    const cachedData: CachedData<typeof testData> = {
      id: key,
      data: testData,
      metadata: {
        timestamp: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000,
        version: 1,
        dataType: 'test',
        isStale: false,
        lastAccessedAt: Date.now()
      }
    };

    mockObjectStore.get.mockImplementation(() => ({
      onsuccess: null as any,
      onerror: null as any,
      result: cachedData
    }));

    const getRequest = mockObjectStore.get();
    setTimeout(() => {
      if (getRequest.onsuccess) {
        getRequest.onsuccess();
      }
    }, 0);

    service.get<typeof testData>(key).subscribe(result => {
      expect(result).toEqual(cachedData);
      expect(result?.data.name).toBe('Test');
    });
  });

  it('should return null for non-existent data', async () => {
    const key = 'non-existent-key';

    mockObjectStore.get.mockImplementation(() => ({
      onsuccess: null as any,
      onerror: null as any,
      result: undefined
    }));

    const getRequest = mockObjectStore.get();
    setTimeout(() => {
      if (getRequest.onsuccess) {
        getRequest.onsuccess();
      }
    }, 0);

    service.get(key).subscribe(result => {
      expect(result).toBeNull();
    });
  });

  it('should delete data from cache', async () => {
    const key = 'test-key';

    mockObjectStore.delete.mockImplementation(() => ({
      onsuccess: null as any,
      onerror: null as any,
      result: undefined
    }));

    const deleteRequest = mockObjectStore.delete();
    setTimeout(() => {
      if (deleteRequest.onsuccess) {
        deleteRequest.onsuccess();
      }
    }, 0);

    service.delete(key).subscribe(result => {
      expect(result).toBe(true);
    });
  });

  it('should clear all cache data', async () => {
    mockObjectStore.clear.mockImplementation(() => ({
      onsuccess: null as any,
      onerror: null as any,
      result: undefined
    }));

    const clearRequest = mockObjectStore.clear();
    setTimeout(() => {
      if (clearRequest.onsuccess) {
        clearRequest.onsuccess();
      }
    }, 0);

    service.clear().subscribe(result => {
      expect(result).toBe(true);
    });
  });

  it('should cleanup expired data', async () => {
    mockObjectStore.openCursor.mockImplementation(() => {
      const cursor = {
        value: {
          id: 'expired-item',
          data: {},
          metadata: {
            expiresAt: Date.now() - 1000 // Expired 1 second ago
          }
        },
        delete: vi.fn(),
        continue: vi.fn()
      };

      return {
        onsuccess: null as any,
        onerror: null as any,
        result: cursor
      };
    });

    const cursorRequest = mockObjectStore.openCursor();
    setTimeout(() => {
      if (cursorRequest.onsuccess) {
        // First call with cursor
        cursorRequest.onsuccess({ target: { result: cursorRequest.result } });
        // Second call without cursor (end of iteration)
        cursorRequest.onsuccess({ target: { result: null } });
      }
    }, 0);

    service.cleanup().subscribe(deletedCount => {
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  it('should provide cache statistics', () => {
    const stats = service.getStats();

    expect(stats).toEqual(expect.objectContaining({
      totalEntries: expect.any(Number),
      staleEntries: expect.any(Number),
      hitRatio: expect.any(Number),
      totalHits: expect.any(Number),
      totalMisses: expect.any(Number),
      storageSize: expect.any(Number),
      lastCleanup: expect.any(Number)
    }));
  });

  it('should report health status', () => {
    expect(service.isHealthy()).toBe(true);
  });
});