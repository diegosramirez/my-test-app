/// <reference lib="webworker" />

import { WorkerMessage, WorkerResponse, PollResult, CircuitBreakerState } from '../interfaces/scheduler.interface';

class DataPollingWorker {
  private pollingInterval = 30 * 60 * 1000; // 30 minutes
  private intervalId: number | null = null;
  private heartbeatTimeoutId: number | null = null;
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailure: 0,
    nextRetryAt: 0
  };
  private isActive = false;

  constructor() {
    this.setupMessageHandler();
    this.sendHeartbeat();
  }

  private setupMessageHandler(): void {
    self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      const { type, payload, timestamp } = event.data;

      switch (type) {
        case 'FETCH_DATA':
          this.handleDataFetch(payload);
          break;
        case 'HEARTBEAT':
          this.sendHeartbeat();
          break;
        case 'STATUS':
          this.sendStatus();
          break;
        case 'STOP':
          this.stopPolling();
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    });
  }

  private async handleDataFetch(config?: any): Promise<void> {
    if (this.circuitBreaker.isOpen && Date.now() < this.circuitBreaker.nextRetryAt) {
      this.sendResponse('ERROR', null, 0, 'Circuit breaker is open');
      return;
    }

    const startTime = Date.now();

    try {
      const result = await this.fetchFootballData();
      const executionTime = Date.now() - startTime;

      if (result.success) {
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.isOpen = false;
        this.sendResponse('SUCCESS', result.data, executionTime);
      } else {
        this.handleFailure();
        this.sendResponse('ERROR', null, executionTime, result.error);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.handleFailure();
      this.sendResponse('ERROR', null, executionTime, (error as Error).message);
    }
  }

  private async fetchFootballData(): Promise<PollResult> {
    const startTime = Date.now();

    try {
      // Simulate API call - in real implementation, this would be actual HTTP request
      // Note: Web Workers can use fetch() for HTTP requests
      const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches', {
        headers: {
          'X-Auth-Token': (self as any).API_KEY || '', // Use passed API key from main thread
          'X-Response-Control': 'minified'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
          responseTime,
          retryCount: 0
        };
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          id: `PL-${Date.now()}`,
          competition: data.competition?.name || 'Premier League',
          season: data.season?.startDate || new Date().getFullYear().toString(),
          matchday: data.season?.currentMatchday || 1,
          matches: data.matches || [],
          lastUpdated: new Date().toISOString()
        },
        timestamp: Date.now(),
        responseTime,
        retryCount: 0
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        retryCount: 0
      };
    }
  }

  private handleFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailure = Date.now();

    // Open circuit breaker after 5 consecutive failures
    if (this.circuitBreaker.failureCount >= 5) {
      this.circuitBreaker.isOpen = true;
      // Reset after 5 minutes
      this.circuitBreaker.nextRetryAt = Date.now() + (5 * 60 * 1000);
    }
  }

  private sendResponse(type: WorkerResponse['type'], payload?: any, executionTime?: number, error?: string): void {
    const response: WorkerResponse = {
      type,
      payload,
      timestamp: Date.now(),
      executionTime,
      error
    };

    self.postMessage(response);
  }

  private sendHeartbeat(): void {
    this.sendResponse('HEARTBEAT', {
      isActive: this.isActive,
      circuitBreakerState: this.circuitBreaker,
      uptime: Date.now()
    });

    // Clear existing timeout to prevent memory leaks
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }

    // Schedule next heartbeat in 1 minute
    this.heartbeatTimeoutId = self.setTimeout(() => this.sendHeartbeat(), 60000);
  }

  private sendStatus(): void {
    this.sendResponse('STATUS_UPDATE', {
      isActive: this.isActive,
      pollingInterval: this.pollingInterval,
      circuitBreaker: this.circuitBreaker,
      lastHeartbeat: Date.now()
    });
  }

  startPolling(): void {
    if (this.intervalId) {
      this.stopPolling();
    }

    this.isActive = true;
    this.intervalId = self.setInterval(() => {
      this.handleDataFetch();
    }, this.pollingInterval);

    // Immediate first fetch
    this.handleDataFetch();
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
    this.isActive = false;
  }
}

// Initialize the worker
const worker = new DataPollingWorker();

// Start polling immediately
worker.startPolling();