import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { SchedulerService } from './scheduler.service';
import { CacheService } from './cache.service';
import { WorkerMessage, WorkerResponse, PollResult } from '../interfaces/scheduler.interface';
import { FootballData } from '../interfaces/football-data.interface';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let mockCacheService: any;
  let mockNgZone: any;
  let mockWorker: any;
  let mockDocument: any;

  // Mock Worker constructor
  const originalWorker = (globalThis as any).Worker;

  beforeEach(async () => {
    // Mock CacheService
    mockCacheService = {
      set: vi.fn(() => of(true)),
      get: vi.fn(() => of(null)),
      stats$: of({
        totalEntries: 10,
        staleEntries: 2,
        hitRatio: 80,
        totalHits: 80,
        totalMisses: 20,
        storageSize: 1024,
        lastCleanup: Date.now()
      })
    };

    // Mock NgZone
    mockNgZone = {
      run: vi.fn((callback) => callback()),
      runOutsideAngular: vi.fn((callback) => callback())
    };

    // Mock Worker
    mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      terminate: vi.fn(),
      dispatchEvent: vi.fn()
    };

    // Mock Worker constructor
    (globalThis as any).Worker = vi.fn(() => mockWorker);

    // Mock document
    mockDocument = {
      addEventListener: vi.fn(),
      hidden: false
    };
    Object.defineProperty(globalThis, 'document', {
      value: mockDocument,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        SchedulerService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: NgZone, useValue: mockNgZone }
      ]
    });

    service = TestBed.inject(SchedulerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original Worker with proper cleanup safeguards
    try {
      (globalThis as any).Worker = originalWorker;
    } catch (error) {
      console.warn('Failed to restore original Worker constructor:', error);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize Web Worker successfully', () => {
    expect((globalThis as any).Worker).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('data-polling.worker.ts')
      })
    );
    expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWorker.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle Web Worker not supported', () => {
    // Create isolated test setup without interfering with other tests
    const originalWorkerForTest = (globalThis as any).Worker;

    try {
      // Mock Worker as undefined
      (globalThis as any).Worker = undefined;

      const consoleSpy = vi.spyOn(console, 'warn');

      // Create a new isolated TestBed configuration
      const isolatedTestBed = TestBed.configureTestingModule({
        providers: [
          SchedulerService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: NgZone, useValue: mockNgZone }
        ]
      });

      const isolatedService = isolatedTestBed.inject(SchedulerService);

      expect(consoleSpy).toHaveBeenCalledWith('Web Workers not supported in this environment');
    } finally {
      // Restore Worker constructor
      (globalThis as any).Worker = originalWorkerForTest;
    }
  });

  describe('Worker Message Handling', () => {
    let messageHandler: (event: MessageEvent) => void;

    beforeEach(() => {
      // Capture the message handler
      const addEventListenerCall = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      );
      messageHandler = addEventListenerCall[1];
    });

    it('should handle successful poll result', () => {
      const mockFootballData: FootballData = {
        id: 'PL-12345',
        competition: 'Premier League',
        season: '2024',
        matchday: 1,
        matches: [],
        lastUpdated: new Date().toISOString()
      };

      const successResponse: WorkerResponse = {
        type: 'SUCCESS',
        payload: mockFootballData,
        timestamp: Date.now(),
        executionTime: 500
      };

      const resultsSubscription = vi.fn();
      service.results$.subscribe(resultsSubscription);

      messageHandler({ data: successResponse } as MessageEvent);

      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/football-data-\d+/),
        mockFootballData,
        'football-data'
      );
      expect(resultsSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockFootballData,
          responseTime: 500
        })
      );
    });

    it('should handle failed poll result', () => {
      const errorResponse: WorkerResponse = {
        type: 'ERROR',
        payload: null,
        timestamp: Date.now(),
        executionTime: 1000,
        error: 'API rate limit exceeded'
      };

      const resultsSubscription = vi.fn();
      const errorsSubscription = vi.fn();
      service.results$.subscribe(resultsSubscription);
      service.errors$.subscribe(errorsSubscription);

      messageHandler({ data: errorResponse } as MessageEvent);

      expect(resultsSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'API rate limit exceeded',
          responseTime: 1000
        })
      );
      expect(errorsSubscription).toHaveBeenCalledWith('API rate limit exceeded');
    });

    it('should handle heartbeat from worker', () => {
      const heartbeatResponse: WorkerResponse = {
        type: 'HEARTBEAT',
        payload: {
          isActive: true,
          circuitBreakerState: {
            isOpen: false,
            failureCount: 0,
            lastFailure: 0,
            nextRetryAt: 0
          }
        },
        timestamp: Date.now()
      };

      const statusSubscription = vi.fn();
      service.status$.subscribe(statusSubscription);

      messageHandler({ data: heartbeatResponse } as MessageEvent);

      expect(statusSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          lastHeartbeat: heartbeatResponse.timestamp
        })
      );
    });

    it('should handle status updates from worker', () => {
      const statusResponse: WorkerResponse = {
        type: 'STATUS_UPDATE',
        payload: {
          isActive: true,
          pollingInterval: 1800000, // 30 minutes
          totalPolls: 5,
          failedPolls: 1
        },
        timestamp: Date.now()
      };

      const statusSubscription = vi.fn();
      service.status$.subscribe(statusSubscription);

      messageHandler({ data: statusResponse } as MessageEvent);

      expect(statusSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          totalPolls: 5,
          failedPolls: 1
        })
      );
    });
  });

  describe('Service Controls', () => {
    it('should start polling', () => {
      service.start();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: undefined,
        timestamp: expect.any(Number)
      });
    });

    it('should stop polling', () => {
      service.start();
      service.stop();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'STOP',
        payload: undefined,
        timestamp: expect.any(Number)
      });
    });

    it('should not start polling if already active', () => {
      service.start();
      const callCount = mockWorker.postMessage.mock.calls.length;

      service.start(); // Should not send another message

      expect(mockWorker.postMessage.mock.calls.length).toBe(callCount);
    });

    it('should request worker status', () => {
      service.requestStatus();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'STATUS',
        payload: undefined,
        timestamp: expect.any(Number)
      });
    });

    it('should force refresh data', (done) => {
      const mockResult: PollResult = {
        success: true,
        data: { id: 'test', competition: 'Premier League' } as FootballData,
        timestamp: Date.now(),
        responseTime: 300,
        retryCount: 0
      };

      // Subscribe to force refresh
      service.forceRefresh().subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: undefined,
        timestamp: expect.any(Number)
      });

      // Simulate worker response
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1];

      messageHandler({
        data: {
          type: 'SUCCESS',
          payload: mockResult.data,
          timestamp: mockResult.timestamp,
          executionTime: mockResult.responseTime
        }
      } as MessageEvent);
    });
  });

  describe('Performance Tracking', () => {
    it('should track execution times and calculate averages', () => {
      const responseData = {
        type: 'SUCCESS',
        payload: { id: 'test' },
        timestamp: Date.now(),
        executionTime: 500
      };

      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1];

      // Simulate multiple successful responses
      messageHandler({ data: responseData } as MessageEvent);
      messageHandler({ data: { ...responseData, executionTime: 600 } } as MessageEvent);
      messageHandler({ data: { ...responseData, executionTime: 400 } } as MessageEvent);

      const metrics = service.getPerformanceMetrics();

      expect(metrics.totalPolls).toBe(3);
      expect(metrics.failedPolls).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageExecutionTime).toBe(500); // (500+600+400)/3
    });

    it('should track failures and calculate success rate', () => {
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1];

      // Simulate mixed responses
      messageHandler({
        data: { type: 'SUCCESS', payload: {}, timestamp: Date.now(), executionTime: 500 }
      } as MessageEvent);

      messageHandler({
        data: { type: 'ERROR', timestamp: Date.now(), executionTime: 1000, error: 'Failed' }
      } as MessageEvent);

      const metrics = service.getPerformanceMetrics();

      expect(metrics.totalPolls).toBe(2);
      expect(metrics.failedPolls).toBe(1);
      expect(metrics.successRate).toBe(50);
    });

    it('should limit execution time history to last 20 entries', () => {
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1];

      // Simulate 25 successful responses
      for (let i = 0; i < 25; i++) {
        messageHandler({
          data: {
            type: 'SUCCESS',
            payload: {},
            timestamp: Date.now(),
            executionTime: 500 + i
          }
        } as MessageEvent);
      }

      const metrics = service.getPerformanceMetrics();

      expect(metrics.totalPolls).toBe(25);
      // Average should be based on last 20 entries only
      // (505 + 506 + ... + 524) / 20 = 514.5
      expect(metrics.averageExecutionTime).toBe(514.5);
    });
  });

  describe('Visibility Handling', () => {
    it('should setup visibility change listener', () => {
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('should send heartbeat when page becomes visible', () => {
      const visibilityHandler = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )[1];

      // Reset mock calls
      mockWorker.postMessage.mockClear();

      // Simulate page becoming visible
      mockDocument.hidden = false;
      visibilityHandler();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'HEARTBEAT',
        payload: undefined,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle worker initialization errors gracefully', () => {
      // Create isolated test setup
      const originalWorkerForTest = (globalThis as any).Worker;

      try {
        // Mock Worker constructor to throw error
        (globalThis as any).Worker = vi.fn(() => {
          throw new Error('Worker initialization failed');
        });

        const consoleSpy = vi.spyOn(console, 'error');

        // Create isolated TestBed configuration
        const isolatedTestBed = TestBed.configureTestingModule({
          providers: [
            SchedulerService,
            { provide: CacheService, useValue: mockCacheService },
            { provide: NgZone, useValue: mockNgZone }
          ]
        });

        const isolatedService = isolatedTestBed.inject(SchedulerService);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to initialize Web Worker:',
          expect.any(Error)
        );
      } finally {
        // Restore Worker constructor
        (globalThis as any).Worker = originalWorkerForTest;
      }
    });

    it('should handle worker runtime errors', () => {
      const errorHandler = mockWorker.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const errorsSubscription = vi.fn();
      service.errors$.subscribe(errorsSubscription);

      const mockError = new Error('Worker runtime error');
      errorHandler(mockError);

      expect(errorsSubscription).toHaveBeenCalledWith(mockError.toString());
    });

    it('should handle cache service errors during data storage', () => {
      mockCacheService.set.mockReturnValue(throwError(() => new Error('Cache error')));

      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )[1];

      const consoleSpy = vi.spyOn(console, 'error');

      messageHandler({
        data: {
          type: 'SUCCESS',
          payload: { id: 'test', competition: 'Premier League' },
          timestamp: Date.now(),
          executionTime: 500
        }
      } as MessageEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cache data:',
        expect.any(Error)
      );
    });
  });

  describe('Cleanup', () => {
    it('should terminate worker and cleanup on destroy', () => {
      service.stop();
      service.ngOnDestroy();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should indicate worker support status', () => {
      expect(service.isWorkerSupported()).toBe(true);
    });
  });

  describe('Main Thread Fallback', () => {
    it('should fallback to main thread when worker initialization fails', () => {
      // Create isolated test setup
      const originalWorkerForTest = (globalThis as any).Worker;

      try {
        // Mock Worker constructor to throw error
        (globalThis as any).Worker = vi.fn(() => {
          throw new Error('Worker not supported');
        });

        const consoleSpy = vi.spyOn(console, 'log');

        // Create isolated TestBed configuration
        const isolatedTestBed = TestBed.configureTestingModule({
          providers: [
            SchedulerService,
            { provide: CacheService, useValue: mockCacheService },
            { provide: NgZone, useValue: mockNgZone }
          ]
        });

        const isolatedService = isolatedTestBed.inject(SchedulerService);

        expect(consoleSpy).toHaveBeenCalledWith('Using main thread fallback for polling');
        expect(isolatedService.isWorkerSupported()).toBe(false);
      } finally {
        // Restore Worker constructor
        (globalThis as any).Worker = originalWorkerForTest;
      }
    });
  });
});