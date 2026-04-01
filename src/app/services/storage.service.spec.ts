import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;

  beforeEach(() => {
    // Save original storage objects
    originalLocalStorage = localStorage;
    originalSessionStorage = sessionStorage;

    TestBed.configureTestingModule({
      providers: [StorageService]
    });
  });

  afterEach(() => {
    // Restore original storage objects
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true
    });

    // Clear any stored data
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Storage Detection and Browser Compatibility - Acceptance Criteria', () => {
    it('should detect localStorage availability and use it by default', () => {
      service = TestBed.inject(StorageService);

      expect(service.getStorageMethod()).toBe('localStorage');
      expect(service.isAvailable()).toBe(true);
    });

    it('should fallback to sessionStorage when localStorage is unavailable', () => {
      // Mock localStorage to throw an error
      const mockLocalStorage = {
        setItem: jasmine.createSpy().and.throwError('localStorage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Create new service instance after mocking
      service = new StorageService();

      expect(service.getStorageMethod()).toBe('sessionStorage');
      expect(service.isAvailable()).toBe(true);
    });

    it('should fallback to memory storage when all browser storage is unavailable', () => {
      // Mock both localStorage and sessionStorage to throw errors
      const mockStorage = {
        setItem: jasmine.createSpy().and.throwError('Storage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true
      });

      // Spy on console.warn to verify fallback warnings
      spyOn(console, 'warn');

      service = new StorageService();

      expect(service.getStorageMethod()).toBe('memory');
      expect(service.isAvailable()).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Browser storage unavailable')
      );
    });

    it('should provide user notification about session-only storage', () => {
      spyOn(console, 'warn');

      // Mock localStorage to fail
      const mockLocalStorage = {
        setItem: jasmine.createSpy().and.throwError('localStorage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      service = new StorageService();

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('localStorage unavailable, using sessionStorage')
      );
    });
  });

  describe('Storage Operations - Acceptance Criteria', () => {
    beforeEach(() => {
      service = TestBed.inject(StorageService);
    });

    it('should store and retrieve data successfully with metadata', async () => {
      const testData = {
        email: 'test@example.com',
        normalizedEmail: 'test@example.com',
        timestamp: Date.now(),
        validationStatus: 'valid' as const,
        metadata: {
          storageMethod: 'localStorage' as const,
          createdAt: Date.now(),
          validationHistory: []
        }
      };

      const stored = await service.store('test_key', testData);
      expect(stored).toBe(true);

      const retrieved = await service.retrieve('test_key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await service.retrieve('non_existent_key');
      expect(result).toBe(null);
    });

    it('should remove data successfully', async () => {
      const testData = { test: 'value' };
      await service.store('remove_test', testData);

      const removed = await service.remove('remove_test');
      expect(removed).toBe(true);

      const retrieved = await service.retrieve('remove_test');
      expect(retrieved).toBe(null);
    });

    it('should clear all storage data', async () => {
      await service.store('key1', { data: 'value1' });
      await service.store('key2', { data: 'value2' });

      const cleared = await service.clear();
      expect(cleared).toBe(true);

      const retrieved1 = await service.retrieve('key1');
      const retrieved2 = await service.retrieve('key2');
      expect(retrieved1).toBe(null);
      expect(retrieved2).toBe(null);
    });

    it('should get all storage keys', async () => {
      await service.store('key1', { data: 'value1' });
      await service.store('key2', { data: 'value2' });

      const keys = await service.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should handle storage quota exceeded gracefully', async () => {
      spyOn(console, 'error');
      spyOn(console, 'warn');

      // Mock localStorage to throw quota exceeded error
      const mockLocalStorage = {
        setItem: jasmine.createSpy().and.throwError(new Error('QuotaExceededError')),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Create new instance with quota exceeded scenario
      service = new StorageService();

      const testData = { large: 'data'.repeat(1000) };
      const result = await service.store('test_key', testData);

      // Should fallback to memory and still succeed
      expect(result).toBe(true);
      expect(service.getStorageMethod()).toBe('memory');
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('falling back to memory storage')
      );
    });

    it('should handle corrupted JSON data gracefully', async () => {
      spyOn(console, 'error');

      // Manually insert corrupted JSON
      localStorage.setItem('corrupted_key', 'invalid{json');

      const result = await service.retrieve('corrupted_key');
      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to retrieve data'),
        jasmine.any(Error)
      );
    });
  });

  describe('Memory Fallback Storage', () => {
    beforeEach(() => {
      // Force memory storage
      const mockStorage = {
        setItem: jasmine.createSpy().and.throwError('Storage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true
      });

      service = new StorageService();
    });

    it('should store and retrieve data in memory', async () => {
      expect(service.getStorageMethod()).toBe('memory');

      const testData = { test: 'memory_value' };
      const stored = await service.store('memory_key', testData);
      expect(stored).toBe(true);

      const retrieved = await service.retrieve('memory_key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle memory operations correctly', async () => {
      const testData = { test: 'value' };
      await service.store('key1', testData);

      const keys = await service.getKeys();
      expect(keys).toContain('key1');

      const removed = await service.remove('key1');
      expect(removed).toBe(true);

      const retrieved = await service.retrieve('key1');
      expect(retrieved).toBe(null);
    });

    it('should clear memory storage', async () => {
      await service.store('key1', { data: 'value1' });
      await service.store('key2', { data: 'value2' });

      const cleared = await service.clear();
      expect(cleared).toBe(true);

      const keys = await service.getKeys();
      expect(keys.length).toBe(0);
    });
  });

  describe('Storage Information and Statistics', () => {
    beforeEach(() => {
      service = TestBed.inject(StorageService);
    });

    it('should provide storage information', async () => {
      const info = await service.getStorageInfo();

      expect(info.method).toBe('localStorage');
      expect(info.available).toBe(true);
      expect(info.persistent).toBe(true);
      expect(typeof info.estimatedQuota).toEqual(jasmine.any(Object)); // number or undefined
      expect(typeof info.estimatedUsage).toEqual(jasmine.any(Object)); // number or undefined
    });

    it('should indicate non-persistent storage for memory fallback', async () => {
      // Force memory storage
      const mockStorage = {
        setItem: jasmine.createSpy().and.throwError('Storage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true
      });

      service = new StorageService();
      const info = await service.getStorageInfo();

      expect(info.method).toBe('memory');
      expect(info.available).toBe(false);
      expect(info.persistent).toBe(false);
    });

    it('should handle storage estimation errors gracefully', async () => {
      // Mock navigator.storage.estimate to throw an error
      const originalNavigator = navigator;
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          storage: {
            estimate: jasmine.createSpy().and.rejectWith(new Error('Estimation failed'))
          }
        },
        writable: true
      });

      const info = await service.getStorageInfo();
      expect(info).toBeTruthy();
      expect(info.method).toBeTruthy();

      // Restore navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true
      });
    });
  });

  describe('Data Cleanup and Management', () => {
    beforeEach(() => {
      service = TestBed.inject(StorageService);
    });

    it('should clean up old subscription data', async () => {
      const oldTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      const newTimestamp = Date.now();

      // Store old subscription data
      await service.store('subscription_old', {
        email: 'old@example.com',
        timestamp: oldTimestamp
      });

      // Store new subscription data
      await service.store('subscription_new', {
        email: 'new@example.com',
        timestamp: newTimestamp
      });

      // Store non-subscription data (should be ignored)
      await service.store('other_data', {
        timestamp: oldTimestamp
      });

      const maxAge = 3 * 24 * 60 * 60 * 1000; // 3 days
      const result = await service.cleanup(maxAge);

      expect(result.removed).toBe(1); // Only old subscription data
      expect(result.errors).toBe(0);

      // Verify old data is removed and new data remains
      const oldData = await service.retrieve('subscription_old');
      const newData = await service.retrieve('subscription_new');
      const otherData = await service.retrieve('other_data');

      expect(oldData).toBe(null);
      expect(newData).not.toBe(null);
      expect(otherData).not.toBe(null); // Non-subscription data should remain
    });

    it('should clean up corrupted data', async () => {
      // Store some valid data
      await service.store('subscription_valid', {
        email: 'valid@example.com',
        timestamp: Date.now()
      });

      // Manually insert corrupted data
      localStorage.setItem('subscription_corrupted', 'invalid{json');

      const result = await service.cleanup();

      expect(result.removed).toBe(1); // Corrupted data removed
      expect(result.errors).toBe(0);

      const validData = await service.retrieve('subscription_valid');
      const corruptedData = await service.retrieve('subscription_corrupted');

      expect(validData).not.toBe(null);
      expect(corruptedData).toBe(null);
    });

    it('should handle cleanup errors gracefully', async () => {
      spyOn(console, 'warn');

      // Store data that will cause retrieval errors
      await service.store('subscription_error', { test: 'data' });

      // Mock retrieve method to throw error for specific key
      const originalRetrieve = service.retrieve.bind(service);
      spyOn(service, 'retrieve').and.callFake((key: string) => {
        if (key === 'subscription_error') {
          throw new Error('Retrieval failed');
        }
        return originalRetrieve(key);
      });

      const result = await service.cleanup();

      expect(result.errors).toBeGreaterThan(0);
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to process key'),
        jasmine.any(Error)
      );
    });

    it('should only clean subscription-related keys', async () => {
      await service.store('subscription_test', { timestamp: Date.now() - 1000000 });
      await service.store('email_test', { timestamp: Date.now() - 1000000 });
      await service.store('other_data', { timestamp: Date.now() - 1000000 });

      const result = await service.cleanup(1000); // Very short max age

      // Should only affect subscription_ and email_ prefixed keys
      expect(result.removed).toBe(2);

      const otherData = await service.retrieve('other_data');
      expect(otherData).not.toBe(null); // Should remain untouched
    });
  });

  describe('Error Handling and Fallback Scenarios', () => {
    beforeEach(() => {
      service = TestBed.inject(StorageService);
    });

    it('should create structured storage errors', () => {
      const error = service.createStorageError(
        'STORAGE_UNAVAILABLE',
        'Storage is not available',
        'localStorage access denied',
        true
      );

      expect(error.type).toBe('storage');
      expect(error.code).toBe('STORAGE_UNAVAILABLE');
      expect(error.message).toBe('Storage is not available');
      expect(error.technicalDetails).toBe('localStorage access denied');
      expect(error.fallbackUsed).toBe(true);
    });

    it('should handle storage operation failures', async () => {
      spyOn(console, 'error');

      // Mock storage to fail
      spyOn(localStorage, 'setItem').and.throwError('Storage failure');

      const result = await service.store('fail_key', { test: 'data' });

      // Should fallback to memory and succeed
      expect(result).toBe(true);
      expect(service.getStorageMethod()).toBe('memory');
    });

    it('should handle final fallback failure', async () => {
      // Create a service where even memory storage fails (unlikely but possible)
      spyOn(console, 'error');

      // Force localStorage to fail
      const mockStorage = {
        setItem: jasmine.createSpy().and.throwError('All storage failed'),
        removeItem: jasmine.createSpy().and.throwError('All storage failed'),
        getItem: jasmine.createSpy().and.throwError('All storage failed'),
        clear: jasmine.createSpy().and.throwError('All storage failed')
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true
      });

      service = new StorageService();

      // Mock the memory storage to also fail
      const originalMemoryFallback = (service as any).memoryFallback;
      (service as any).memoryFallback = {
        set: jasmine.createSpy().and.throwError('Memory failed'),
        get: jasmine.createSpy().and.throwError('Memory failed'),
        delete: jasmine.createSpy().and.throwError('Memory failed'),
        clear: jasmine.createSpy().and.throwError('Memory failed'),
        keys: jasmine.createSpy().and.throwError('Memory failed')
      };

      const result = await service.store('test', { data: 'value' });
      expect(result).toBe(false);

      // Restore memory fallback
      (service as any).memoryFallback = originalMemoryFallback;
    });

    it('should handle removal and clear operation failures', async () => {
      spyOn(console, 'error');

      // Mock remove to fail
      spyOn(localStorage, 'removeItem').and.throwError('Remove failed');
      spyOn(localStorage, 'clear').and.throwError('Clear failed');

      const removeResult = await service.remove('test_key');
      const clearResult = await service.clear();

      expect(removeResult).toBe(false);
      expect(clearResult).toBe(false);
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(() => {
      service = TestBed.inject(StorageService);
    });

    it('should handle large data objects efficiently', async () => {
      const largeData = {
        email: 'test@example.com',
        data: 'x'.repeat(10000), // 10KB of data
        array: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item_${i}` }))
      };

      const start = Date.now();
      const stored = await service.store('large_data', largeData);
      const retrieved = await service.retrieve('large_data');
      const duration = Date.now() - start;

      expect(stored).toBe(true);
      expect(retrieved).toEqual(largeData);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent storage operations', async () => {
      const operations = [];

      // Create 10 concurrent store operations
      for (let i = 0; i < 10; i++) {
        operations.push(service.store(`concurrent_${i}`, { id: i, data: `value_${i}` }));
      }

      const results = await Promise.all(operations);

      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true);

      // Verify all data was stored correctly
      for (let i = 0; i < 10; i++) {
        const retrieved = await service.retrieve(`concurrent_${i}`);
        expect(retrieved).toEqual({ id: i, data: `value_${i}` });
      }
    });

    it('should provide consistent behavior across storage methods', async () => {
      const testOperations = async (storageService: StorageService) => {
        await storageService.store('test', { value: 'data' });
        const retrieved = await storageService.retrieve('test');
        const keys = await storageService.getKeys();
        await storageService.remove('test');
        const removedData = await storageService.retrieve('test');

        return {
          stored: retrieved?.value === 'data',
          hasKeys: keys.includes('test'),
          removed: removedData === null
        };
      };

      // Test with localStorage (normal case)
      const localStorageResults = await testOperations(service);

      // Test with memory fallback
      const mockStorage = {
        setItem: jasmine.createSpy().and.throwError('Storage disabled'),
        removeItem: jasmine.createSpy(),
        getItem: jasmine.createSpy(),
        clear: jasmine.createSpy()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true
      });

      const memoryService = new StorageService();
      const memoryResults = await testOperations(memoryService);

      // Results should be consistent regardless of storage method
      expect(localStorageResults).toEqual(memoryResults);
    });
  });
});