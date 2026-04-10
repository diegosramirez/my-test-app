/// <reference lib="webworker" />

class DataPollingWorker {
  constructor() {
    this.pollingInterval = 30 * 60 * 1000; // 30 minutes
    this.intervalId = null;
    this.heartbeatTimeoutId = null;
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailure: 0,
      nextRetryAt: 0
    };
    this.isActive = false;
    this.config = {
      apiKey: '',
      baseUrl: 'https://api.football-data.org/v4'
    };

    this.setupMessageHandler();
    this.sendHeartbeat();
  }

  setupMessageHandler() {
    self.addEventListener('message', (event) => {
      const { type, payload, timestamp } = event.data;

      switch (type) {
        case 'CONFIG':
          this.updateConfig(payload);
          break;
        case 'FETCH_DATA':
          this.handleDataFetch(payload || this.config);
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

  updateConfig(config) {
    if (config.apiKey) {
      this.config.apiKey = config.apiKey;
    }
    if (config.baseUrl) {
      this.config.baseUrl = config.baseUrl;
    }
    this.sendResponse('CONFIG_UPDATED', { configured: true });
  }

  async handleDataFetch(config) {
    // Validate API key is configured
    if (!config.apiKey || config.apiKey === '') {
      this.sendResponse('ERROR', null, 0, 'API key not configured');
      return;
    }

    if (this.circuitBreaker.isOpen && Date.now() < this.circuitBreaker.nextRetryAt) {
      this.sendResponse('ERROR', null, 0, 'Circuit breaker is open');
      return;
    }

    const startTime = Date.now();

    try {
      const result = await this.fetchFootballData(config);
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
      this.sendResponse('ERROR', null, executionTime, error.message);
    }
  }

  async fetchFootballData(config) {
    const startTime = Date.now();

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Simulate API call - in real implementation, this would be actual HTTP request
      // Note: Web Workers can use fetch() for HTTP requests
      const response = await fetch(`${config.baseUrl}/competitions/PL/matches`, {
        headers: {
          'X-Auth-Token': config.apiKey,
          'X-Response-Control': 'minified'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
      // Handle timeout and other errors
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout after 30 seconds',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          retryCount: 0
        };
      }

      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        retryCount: 0
      };
    }
  }

  handleFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailure = Date.now();

    // Open circuit breaker after 5 consecutive failures
    if (this.circuitBreaker.failureCount >= 5) {
      this.circuitBreaker.isOpen = true;
      // Reset after 5 minutes
      this.circuitBreaker.nextRetryAt = Date.now() + (5 * 60 * 1000);
    }
  }

  sendResponse(type, payload, executionTime, error, timestamp) {
    const response = {
      type,
      payload,
      timestamp: timestamp || Date.now(),
      executionTime,
      error
    };

    self.postMessage(response);
  }

  sendHeartbeat() {
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

  sendStatus() {
    this.sendResponse('STATUS_UPDATE', {
      isActive: this.isActive,
      pollingInterval: this.pollingInterval,
      circuitBreaker: this.circuitBreaker,
      lastHeartbeat: Date.now()
    });
  }

  startPolling() {
    if (this.intervalId) {
      this.stopPolling();
    }

    this.isActive = true;
    this.intervalId = self.setInterval(() => {
      this.handleDataFetch(this.config);
    }, this.pollingInterval);

    // Immediate first fetch
    this.handleDataFetch(this.config);
  }

  stopPolling() {
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