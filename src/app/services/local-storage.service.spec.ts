import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { Event } from '../models/event.interface';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  const mockEvent: Event = {
    id: 'test-id-1',
    title: 'Test Event',
    date: new Date('2025-12-25T10:00:00'),
    location: 'Test Location',
    description: 'Test Description',
    createdAt: new Date('2024-01-01T10:00:00'),
    updatedAt: new Date('2024-01-01T10:00:00')
  };

  const mockEvents: Event[] = [mockEvent];

  beforeEach(async () => {
    // Mock localStorage and sessionStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };

    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };

    // Replace global storage objects
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    await TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });

    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should check storage availability on init', () => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-storage-availability', 'test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-storage-availability');
    });

    it('should fall back to sessionStorage if localStorage unavailable', () => {
      // Simulate localStorage unavailable
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const newService = new LocalStorageService();
      const storageInfo = newService.getStorageInfo();

      expect(storageInfo.type).toBe('sessionStorage');
    });
  });

  describe('saveEvents', () => {
    it('should save events to localStorage by default', () => {
      service.saveEvents(mockEvents);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'event-planner-events',
        JSON.stringify(mockEvents)
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('event-planner-quota-exceeded');
    });

    it('should handle empty array', () => {
      service.saveEvents([]);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'event-planner-events',
        JSON.stringify([])
      );
    });

    it('should handle quota exceeded error and fallback to sessionStorage', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw quotaError;
      });

      service.saveEvents(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'event-planner-events',
        JSON.stringify(mockEvents)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'event-planner-quota-exceeded',
        'true'
      );
    });

    it('should handle quota exceeded error with error code 22', () => {
      const quotaError = new Error('Storage quota exceeded');
      (quotaError as any).code = 22;

      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw quotaError;
      });

      service.saveEvents(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'event-planner-events',
        JSON.stringify(mockEvents)
      );
    });

    it('should handle sessionStorage quota exceeded when localStorage already failed', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      // First call fails on localStorage (triggers fallback)
      vi.mocked(mockLocalStorage.setItem).mockImplementationOnce(() => {
        throw quotaError;
      });

      // Second call should be to sessionStorage, which also fails
      vi.mocked(mockSessionStorage.setItem).mockImplementation(() => {
        throw quotaError;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.saveEvents(mockEvents);

      expect(consoleSpy).toHaveBeenCalledWith('Both localStorage and sessionStorage quota exceeded:', quotaError);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('event-planner-quota-exceeded', 'true');

      consoleSpy.mockRestore();
    });

    it('should handle other storage errors', () => {
      const storageError = new Error('Storage access denied');
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw storageError;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.saveEvents(mockEvents);

      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', storageError);
      consoleSpy.mockRestore();
    });
  });

  describe('loadEvents', () => {
    it('should load events from localStorage', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(JSON.stringify(mockEvents));

      const result = service.loadEvents();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('event-planner-events');
      expect(result).toEqual([
        {
          ...mockEvent,
          date: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      ]);
    });

    it('should return empty array when no data exists', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      const result = service.loadEvents();

      expect(result).toEqual([]);
    });

    it('should return empty array when JSON is invalid', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue('invalid-json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = service.loadEvents();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading events from storage:', expect.any(SyntaxError));
      consoleSpy.mockRestore();
    });

    it('should validate and parse events with date conversion', () => {
      const eventsJson = JSON.stringify([
        {
          ...mockEvent,
          date: '2025-12-25T10:00:00.000Z',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z'
        }
      ]);
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(eventsJson);

      const result = service.loadEvents();

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid event data format', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue('"not-an-array"');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = service.loadEvents();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid events data format, returning empty array');
      consoleSpy.mockRestore();
    });

    it('should filter out invalid events and warn', () => {
      const invalidEventsJson = JSON.stringify([
        mockEvent,
        { ...mockEvent, date: 'invalid-date' }
      ]);
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(invalidEventsJson);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = service.loadEvents();

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid event data, skipping:',
        expect.objectContaining({ date: 'invalid-date' }),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('quota management', () => {
    it('should check if quota is exceeded', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue('true');

      const result = service.isQuotaExceeded();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('event-planner-quota-exceeded');
      expect(result).toBe(true);
    });

    it('should return false when quota not exceeded', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      const result = service.isQuotaExceeded();

      expect(result).toBe(false);
    });

    it('should get storage info with localStorage type by default', () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      const result = service.getStorageInfo();

      expect(result).toEqual({
        type: 'localStorage',
        quotaExceeded: false
      });
    });

    it('should get storage info with sessionStorage type when fallback is active', () => {
      // Trigger fallback by causing localStorage to fail
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const newService = new LocalStorageService();
      vi.mocked(mockSessionStorage.getItem).mockReturnValue('true');

      const result = newService.getStorageInfo();

      expect(result).toEqual({
        type: 'sessionStorage',
        quotaExceeded: true
      });
    });
  });

  describe('cross-tab synchronization', () => {
    it('should setup storage event listener for cross-tab sync', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Create new service to test listener setup
      new LocalStorageService();

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should emit custom events-updated event when storage changes', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      // Simulate storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'event-planner-events',
        newValue: JSON.stringify(mockEvents),
        oldValue: null
      });

      window.dispatchEvent(storageEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'events-updated',
          detail: { source: 'storage-event' }
        })
      );
    });

    it('should not emit custom event for other storage keys', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      // Simulate storage event with different key
      const storageEvent = new StorageEvent('storage', {
        key: 'other-key',
        newValue: 'value',
        oldValue: null
      });

      // Reset call count
      dispatchEventSpy.mockClear();

      window.dispatchEvent(storageEvent);

      // Should not have been called with events-updated
      expect(dispatchEventSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'events-updated'
        })
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle storage getItem throwing errors', () => {
      vi.mocked(mockLocalStorage.getItem).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = service.loadEvents();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading events from storage:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle very large event arrays', () => {
      const largeEventArray = Array(1000).fill(null).map((_, index) => ({
        ...mockEvent,
        id: `event-${index}`,
        title: `Event ${index}`
      }));

      service.saveEvents(largeEventArray);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'event-planner-events',
        expect.stringContaining('Event 999')
      );
    });
  });
});