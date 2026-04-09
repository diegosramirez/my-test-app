import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, fromEvent } from 'rxjs';
import { takeUntil, filter, map, tap, catchError } from 'rxjs/operators';
import {
  SchedulerConfig,
  WorkerMessage,
  WorkerResponse,
  PollResult,
  CircuitBreakerState
} from '../interfaces/scheduler.interface';
import { FootballData } from '../interfaces/football-data.interface';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService implements OnDestroy {
  private worker: Worker | null = null;
  private destroy$ = new Subject<void>();

  private readonly config: SchedulerConfig = {
    pollingInterval: 30 * 60 * 1000, // 30 minutes
    maxRetries: 3,
    baseBackoffDelay: 1000,
    maxBackoffDelay: 30000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 5 * 60 * 1000 // 5 minutes
  };

  // State tracking
  private isActive = false;
  private workerStatus = new BehaviorSubject<any>({
    isActive: false,
    lastHeartbeat: 0,
    totalPolls: 0,
    failedPolls: 0,
    averageExecutionTime: 0
  });

  private pollResults = new Subject<PollResult>();
  private workerErrors = new Subject<string>();

  // Performance tracking
  private totalPolls = 0;
  private failedPolls = 0;
  private executionTimes: number[] = [];

  public status$ = this.workerStatus.asObservable();
  public results$ = this.pollResults.asObservable();
  public errors$ = this.workerErrors.asObservable();

  constructor(
    private ngZone: NgZone,
    private cacheService: CacheService
  ) {
    this.initializeWorker();
    this.setupVisibilityHandling();
  }

  private initializeWorker(): void {
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('../workers/data-polling.worker.js', import.meta.url));
        this.setupWorkerEventHandlers();
        console.log('Web Worker initialized successfully');
      } else {
        console.warn('Web Workers not supported in this environment');
        this.fallbackToMainThread();
      }
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error);
      this.fallbackToMainThread();
    }
  }

  private setupWorkerEventHandlers(): void {
    if (!this.worker) return;

    fromEvent<MessageEvent<WorkerResponse>>(this.worker, 'message')
      .pipe(
        takeUntil(this.destroy$),
        map(event => event.data)
      )
      .subscribe({
        next: (response) => this.handleWorkerResponse(response),
        error: (error) => this.handleWorkerError(error)
      });

    fromEvent(this.worker, 'error')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (error) => this.handleWorkerError(error),
        error: (error) => console.error('Worker error handler failed:', error)
      });
  }

  private handleWorkerResponse(response: WorkerResponse): void {
    this.ngZone.run(() => {
      switch (response.type) {
        case 'SUCCESS':
          this.handleSuccessfulPoll(response);
          break;
        case 'ERROR':
          this.handleFailedPoll(response);
          break;
        case 'HEARTBEAT':
          this.handleHeartbeat(response);
          break;
        case 'STATUS_UPDATE':
          this.handleStatusUpdate(response);
          break;
        default:
          console.warn('Unknown worker response type:', response.type);
      }
    });
  }

  private handleSuccessfulPoll(response: WorkerResponse): void {
    if (response.payload && response.executionTime) {
      const pollResult: PollResult = {
        success: true,
        data: response.payload,
        timestamp: response.timestamp,
        responseTime: response.executionTime,
        retryCount: 0
      };

      this.totalPolls++;
      this.executionTimes.push(response.executionTime);
      this.keepRecentExecutionTimes();

      // Cache the successful result
      this.cacheService.set(
        `football-data-${Date.now()}`,
        response.payload,
        'football-data'
      ).subscribe({
        next: () => console.log('Data cached successfully'),
        error: (error) => console.error('Failed to cache data:', error)
      });

      this.pollResults.next(pollResult);
      this.updateStatus();
    }
  }

  private handleFailedPoll(response: WorkerResponse): void {
    const pollResult: PollResult = {
      success: false,
      error: response.error || 'Unknown error',
      timestamp: response.timestamp,
      responseTime: response.executionTime || 0,
      retryCount: 0
    };

    this.totalPolls++;
    this.failedPolls++;

    this.pollResults.next(pollResult);
    this.workerErrors.next(response.error || 'Unknown error');
    this.updateStatus();
  }

  private handleHeartbeat(response: WorkerResponse): void {
    if (response.payload) {
      this.workerStatus.next({
        ...this.workerStatus.value,
        isActive: response.payload.isActive,
        lastHeartbeat: response.timestamp
      });
    }
  }

  private handleStatusUpdate(response: WorkerResponse): void {
    if (response.payload) {
      this.workerStatus.next({
        ...this.workerStatus.value,
        ...response.payload
      });
    }
  }

  private handleWorkerError(error: any): void {
    console.error('Worker error:', error);
    this.workerErrors.next(error.toString());
    this.failedPolls++;
    this.updateStatus();
  }

  private updateStatus(): void {
    const averageExecutionTime = this.executionTimes.length > 0
      ? this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length
      : 0;

    this.workerStatus.next({
      ...this.workerStatus.value,
      totalPolls: this.totalPolls,
      failedPolls: this.failedPolls,
      averageExecutionTime
    });
  }

  private keepRecentExecutionTimes(): void {
    // Keep only last 20 execution times for average calculation
    if (this.executionTimes.length > 20) {
      this.executionTimes = this.executionTimes.slice(-20);
    }
  }

  private setupVisibilityHandling(): void {
    // Pause/resume polling based on page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Page hidden, polling continues in background');
      } else {
        console.log('Page visible, ensuring polling is active');
        this.sendMessage('HEARTBEAT');
      }
    });
  }

  private sendMessage(type: WorkerMessage['type'], payload?: any): void {
    if (this.worker) {
      const message: WorkerMessage = {
        type,
        payload,
        timestamp: Date.now()
      };
      this.worker.postMessage(message);
    }
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.sendMessage('FETCH_DATA');
    console.log('Scheduler started');
  }

  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.sendMessage('STOP');
    console.log('Scheduler stopped');
  }

  requestStatus(): void {
    this.sendMessage('STATUS');
  }

  forceRefresh(): Observable<PollResult> {
    this.sendMessage('FETCH_DATA');
    return this.pollResults.asObservable().pipe(
      filter(result => result.timestamp > Date.now() - 5000), // Recent result
      tap(result => console.log('Forced refresh result:', result))
    );
  }

  private fallbackToMainThread(): void {
    // Fallback implementation using setTimeout for polling
    console.log('Using main thread fallback for polling');

    const poll = () => {
      if (!this.isActive) return;

      // Simulate polling in main thread
      setTimeout(() => {
        this.handleWorkerError('Main thread fallback - limited functionality');
        setTimeout(poll, this.config.pollingInterval);
      }, 1000);
    };

    poll();
  }

  isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined' && this.worker !== null;
  }

  getPerformanceMetrics() {
    return {
      totalPolls: this.totalPolls,
      failedPolls: this.failedPolls,
      successRate: this.totalPolls > 0 ? ((this.totalPolls - this.failedPolls) / this.totalPolls) * 100 : 0,
      averageExecutionTime: this.executionTimes.length > 0
        ? this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length
        : 0,
      isActive: this.isActive
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.worker) {
      this.stop();
      this.worker.terminate();
    }
  }
}