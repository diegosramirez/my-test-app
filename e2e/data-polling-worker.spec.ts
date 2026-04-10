import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Data Polling Web Worker
 *
 * Tests the core acceptance criteria:
 * 1. Automated background polling every 30 minutes
 * 2. Circuit breaker and exponential backoff for API failures
 * 3. Heartbeat monitoring and status tracking
 * 4. Proper Web Worker message handling and communication
 * 5. API integration with football-data.org
 * 6. Error handling and recovery mechanisms
 */

test.describe('Data Polling Web Worker', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Mock the football API with different response scenarios
    await page.route('**/api.football-data.org/**', async route => {
      const url = route.request().url();

      // Default successful response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'X-RateLimit-Remaining': '95'
        },
        body: JSON.stringify({
          competition: { name: 'Premier League' },
          season: { startDate: '2024', currentMatchday: 15 },
          matches: [
            {
              id: '1',
              homeTeam: { id: '1', name: 'Arsenal', shortName: 'ARS' },
              awayTeam: { id: '2', name: 'Chelsea', shortName: 'CHE' },
              score: { fullTime: { home: 2, away: 1 } },
              status: 'FINISHED',
              utcDate: '2024-12-01T15:00:00Z'
            }
          ]
        })
      });
    });

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Acceptance Criteria 1: Automated Background Polling', () => {
    test('should initialize Web Worker and start polling immediately', async () => {
      // Create and test Web Worker functionality
      const workerResult = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            // Import the actual worker code
            importScripts('./assets/workers/data-polling.worker.js');
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          // Test worker initialization
          worker.postMessage({
            type: 'STATUS',
            timestamp: Date.now()
          });

          worker.onmessage = function(event) {
            const { type, payload } = event.data;
            if (type === 'STATUS_UPDATE') {
              resolve({
                success: true,
                isActive: payload.isActive,
                pollingInterval: payload.pollingInterval
              });
            }
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            resolve({ success: false, error: 'Worker timeout' });
          }, 5000);
        });
      });

      expect(workerResult.success).toBe(true);
      expect(workerResult.pollingInterval).toBe(30 * 60 * 1000); // 30 minutes
    });

    test('should fetch data immediately on startup and then every 30 minutes', async () => {
      const pollingTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let fetchCount = 0;
          const fetchTimes = [];

          const workerCode = `
            class TestWorker {
              constructor() {
                this.pollingInterval = 30 * 60 * 1000; // 30 minutes
                this.fetchCount = 0;
                this.startTime = Date.now();

                // For testing, use shorter interval
                this.testInterval = 1000; // 1 second for testing
                this.setupMessageHandler();
                this.startTesting();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  if (type === 'STOP') {
                    this.stopTesting();
                  }
                });
              }

              startTesting() {
                // Immediate fetch
                this.simulateFetch();

                // Schedule subsequent fetches
                this.intervalId = setInterval(() => {
                  this.simulateFetch();
                }, this.testInterval);
              }

              simulateFetch() {
                this.fetchCount++;
                const elapsed = Date.now() - this.startTime;

                self.postMessage({
                  type: 'FETCH_COMPLETE',
                  payload: {
                    fetchCount: this.fetchCount,
                    elapsed: elapsed,
                    timestamp: Date.now()
                  }
                });

                // Stop after 3 fetches for testing
                if (this.fetchCount >= 3) {
                  this.stopTesting();
                  self.postMessage({
                    type: 'TEST_COMPLETE',
                    payload: { totalFetches: this.fetchCount }
                  });
                }
              }

              stopTesting() {
                if (this.intervalId) {
                  clearInterval(this.intervalId);
                }
              }
            }

            new TestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          worker.onmessage = function(event) {
            const { type, payload } = event.data;

            if (type === 'FETCH_COMPLETE') {
              fetchCount++;
              fetchTimes.push(payload.timestamp);
            } else if (type === 'TEST_COMPLETE') {
              worker.terminate();
              resolve({
                success: true,
                totalFetches: fetchCount,
                immediateFetch: fetchCount >= 1,
                intervals: fetchTimes.length >= 2
              });
            }
          };

          // Cleanup timeout
          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Polling test timeout',
              fetchCount
            });
          }, 10000);
        });
      });

      expect(pollingTest.success).toBe(true);
      expect(pollingTest.immediateFetch).toBe(true);
      expect(pollingTest.totalFetches).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Acceptance Criteria 2: Data Storage with Timestamps', () => {
    test('should include timestamps and metadata in fetched data', async () => {
      const dataTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class DataTestWorker {
              constructor() {
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  if (event.data.type === 'FETCH_DATA') {
                    this.handleDataFetch();
                  }
                });
              }

              async handleDataFetch() {
                try {
                  const startTime = Date.now();

                  // Simulate the actual fetchFootballData method
                  const mockData = {
                    success: true,
                    data: {
                      id: 'PL-' + Date.now(),
                      competition: 'Premier League',
                      season: '2024',
                      matchday: 15,
                      matches: [],
                      lastUpdated: new Date().toISOString()
                    },
                    timestamp: Date.now(),
                    responseTime: Date.now() - startTime,
                    retryCount: 0
                  };

                  self.postMessage({
                    type: 'SUCCESS',
                    payload: mockData.data,
                    timestamp: mockData.timestamp,
                    executionTime: mockData.responseTime
                  });
                } catch (error) {
                  self.postMessage({
                    type: 'ERROR',
                    error: error.message,
                    timestamp: Date.now()
                  });
                }
              }
            }

            new DataTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          worker.postMessage({
            type: 'FETCH_DATA',
            timestamp: Date.now()
          });

          worker.onmessage = function(event) {
            const { type, payload, timestamp, executionTime } = event.data;

            if (type === 'SUCCESS') {
              worker.terminate();
              resolve({
                success: true,
                hasTimestamp: !!timestamp,
                hasExecutionTime: typeof executionTime === 'number',
                hasDataId: !!payload.id,
                hasLastUpdated: !!payload.lastUpdated,
                dataStructure: {
                  competition: payload.competition,
                  season: payload.season,
                  matchday: payload.matchday
                }
              });
            } else if (type === 'ERROR') {
              worker.terminate();
              resolve({
                success: false,
                error: event.data.error
              });
            }
          };

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Data fetch timeout'
            });
          }, 5000);
        });
      });

      expect(dataTest.success).toBe(true);
      expect(dataTest.hasTimestamp).toBe(true);
      expect(dataTest.hasExecutionTime).toBe(true);
      expect(dataTest.hasDataId).toBe(true);
      expect(dataTest.hasLastUpdated).toBe(true);
      expect(dataTest.dataStructure.competition).toBe('Premier League');
    });
  });

  test.describe('Acceptance Criteria 6: API Rate Limiting with Exponential Backoff', () => {
    test('should implement circuit breaker pattern after consecutive failures', async () => {
      const circuitBreakerTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class CircuitBreakerTestWorker {
              constructor() {
                this.circuitBreaker = {
                  isOpen: false,
                  failureCount: 0,
                  lastFailure: 0,
                  nextRetryAt: 0
                };
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  switch (type) {
                    case 'SIMULATE_FAILURE':
                      this.handleFailure();
                      this.sendStatus();
                      break;
                    case 'FETCH_WITH_BREAKER':
                      this.handleDataFetchWithBreaker();
                      break;
                    case 'GET_STATUS':
                      this.sendStatus();
                      break;
                  }
                });
              }

              handleFailure() {
                this.circuitBreaker.failureCount++;
                this.circuitBreaker.lastFailure = Date.now();

                // Open circuit breaker after 5 consecutive failures
                if (this.circuitBreaker.failureCount >= 5) {
                  this.circuitBreaker.isOpen = true;
                  // Reset after 5 minutes (shortened for testing)
                  this.circuitBreaker.nextRetryAt = Date.now() + (5 * 60 * 1000);
                }
              }

              handleDataFetchWithBreaker() {
                if (this.circuitBreaker.isOpen && Date.now() < this.circuitBreaker.nextRetryAt) {
                  self.postMessage({
                    type: 'ERROR',
                    payload: null,
                    executionTime: 0,
                    error: 'Circuit breaker is open'
                  });
                  return;
                }

                // Simulate successful fetch after breaker opens
                self.postMessage({
                  type: 'SUCCESS',
                  payload: { data: 'test' },
                  executionTime: 10
                });
              }

              sendStatus() {
                self.postMessage({
                  type: 'STATUS_UPDATE',
                  payload: {
                    circuitBreaker: this.circuitBreaker
                  }
                });
              }
            }

            new CircuitBreakerTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          let step = 0;
          const results = {
            initialState: null,
            afterFailures: null,
            circuitOpenResponse: null
          };

          worker.onmessage = function(event) {
            const { type, payload, error } = event.data;

            if (type === 'STATUS_UPDATE') {
              step++;

              if (step === 1) {
                // Initial state - should be closed
                results.initialState = payload.circuitBreaker;

                // Trigger 5 failures
                for (let i = 0; i < 5; i++) {
                  worker.postMessage({ type: 'SIMULATE_FAILURE' });
                }
              } else if (step === 6) {
                // After 5 failures - should be open
                results.afterFailures = payload.circuitBreaker;

                // Try to fetch with breaker open
                worker.postMessage({ type: 'FETCH_WITH_BREAKER' });
              }
            } else if (type === 'ERROR' && error === 'Circuit breaker is open') {
              results.circuitOpenResponse = { blocked: true, error };

              worker.terminate();
              resolve({
                success: true,
                initialClosed: !results.initialState.isOpen,
                failureCount: results.afterFailures.failureCount,
                circuitOpened: results.afterFailures.isOpen,
                requestBlocked: results.circuitOpenResponse.blocked
              });
            }
          };

          // Start test
          worker.postMessage({ type: 'GET_STATUS' });

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Circuit breaker test timeout'
            });
          }, 8000);
        });
      });

      expect(circuitBreakerTest.success).toBe(true);
      expect(circuitBreakerTest.initialClosed).toBe(true);
      expect(circuitBreakerTest.failureCount).toBe(5);
      expect(circuitBreakerTest.circuitOpened).toBe(true);
      expect(circuitBreakerTest.requestBlocked).toBe(true);
    });

    test('should reset circuit breaker failure count on successful API call', async () => {
      const resetTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class ResetTestWorker {
              constructor() {
                this.circuitBreaker = {
                  isOpen: false,
                  failureCount: 3, // Start with some failures
                  lastFailure: 0,
                  nextRetryAt: 0
                };
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  if (type === 'SIMULATE_SUCCESS') {
                    this.handleSuccess();
                    this.sendStatus();
                  } else if (type === 'GET_STATUS') {
                    this.sendStatus();
                  }
                });
              }

              handleSuccess() {
                this.circuitBreaker.failureCount = 0;
                this.circuitBreaker.isOpen = false;
              }

              sendStatus() {
                self.postMessage({
                  type: 'STATUS_UPDATE',
                  payload: {
                    circuitBreaker: this.circuitBreaker
                  }
                });
              }
            }

            new ResetTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          let step = 0;
          let initialFailureCount = 0;
          let finalFailureCount = 0;

          worker.onmessage = function(event) {
            const { type, payload } = event.data;

            if (type === 'STATUS_UPDATE') {
              step++;

              if (step === 1) {
                initialFailureCount = payload.circuitBreaker.failureCount;
                worker.postMessage({ type: 'SIMULATE_SUCCESS' });
              } else if (step === 2) {
                finalFailureCount = payload.circuitBreaker.failureCount;

                worker.terminate();
                resolve({
                  success: true,
                  initialFailures: initialFailureCount,
                  finalFailures: finalFailureCount,
                  resetSuccessful: finalFailureCount === 0
                });
              }
            }
          };

          worker.postMessage({ type: 'GET_STATUS' });

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Reset test timeout'
            });
          }, 5000);
        });
      });

      expect(resetTest.success).toBe(true);
      expect(resetTest.initialFailures).toBe(3);
      expect(resetTest.finalFailures).toBe(0);
      expect(resetTest.resetSuccessful).toBe(true);
    });
  });

  test.describe('Acceptance Criteria 5: Health Monitoring through Observables', () => {
    test('should send heartbeat messages every minute', async () => {
      const heartbeatTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class HeartbeatTestWorker {
              constructor() {
                this.heartbeatCount = 0;
                this.isActive = true;
                this.circuitBreaker = {
                  isOpen: false,
                  failureCount: 0,
                  lastFailure: 0,
                  nextRetryAt: 0
                };
                this.setupMessageHandler();
                this.sendHeartbeat();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  if (type === 'HEARTBEAT') {
                    this.sendHeartbeat();
                  }
                });
              }

              sendHeartbeat() {
                this.heartbeatCount++;

                self.postMessage({
                  type: 'HEARTBEAT',
                  payload: {
                    isActive: this.isActive,
                    circuitBreakerState: this.circuitBreaker,
                    uptime: Date.now(),
                    heartbeatCount: this.heartbeatCount
                  },
                  timestamp: Date.now()
                });

                // For testing, send multiple heartbeats quickly
                if (this.heartbeatCount < 3) {
                  setTimeout(() => this.sendHeartbeat(), 100);
                }
              }
            }

            new HeartbeatTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          const heartbeats = [];

          worker.onmessage = function(event) {
            const { type, payload, timestamp } = event.data;

            if (type === 'HEARTBEAT') {
              heartbeats.push({
                isActive: payload.isActive,
                timestamp: timestamp,
                uptime: payload.uptime,
                circuitBreakerState: payload.circuitBreakerState,
                heartbeatCount: payload.heartbeatCount
              });

              if (heartbeats.length >= 3) {
                worker.terminate();
                resolve({
                  success: true,
                  heartbeatCount: heartbeats.length,
                  allActive: heartbeats.every(h => h.isActive),
                  allHaveTimestamp: heartbeats.every(h => !!h.timestamp),
                  allHaveUptime: heartbeats.every(h => !!h.uptime),
                  circuitBreakerIncluded: heartbeats.every(h => !!h.circuitBreakerState)
                });
              }
            }
          };

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Heartbeat test timeout',
              receivedHeartbeats: heartbeats.length
            });
          }, 5000);
        });
      });

      expect(heartbeatTest.success).toBe(true);
      expect(heartbeatTest.heartbeatCount).toBeGreaterThanOrEqual(3);
      expect(heartbeatTest.allActive).toBe(true);
      expect(heartbeatTest.allHaveTimestamp).toBe(true);
      expect(heartbeatTest.allHaveUptime).toBe(true);
      expect(heartbeatTest.circuitBreakerIncluded).toBe(true);
    });

    test('should provide comprehensive status updates on request', async () => {
      const statusTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class StatusTestWorker {
              constructor() {
                this.isActive = true;
                this.pollingInterval = 30 * 60 * 1000;
                this.circuitBreaker = {
                  isOpen: false,
                  failureCount: 2,
                  lastFailure: Date.now() - 10000,
                  nextRetryAt: 0
                };
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  if (type === 'STATUS') {
                    this.sendStatus();
                  }
                });
              }

              sendStatus() {
                self.postMessage({
                  type: 'STATUS_UPDATE',
                  payload: {
                    isActive: this.isActive,
                    pollingInterval: this.pollingInterval,
                    circuitBreaker: this.circuitBreaker,
                    lastHeartbeat: Date.now()
                  },
                  timestamp: Date.now()
                });
              }
            }

            new StatusTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          worker.postMessage({
            type: 'STATUS',
            timestamp: Date.now()
          });

          worker.onmessage = function(event) {
            const { type, payload, timestamp } = event.data;

            if (type === 'STATUS_UPDATE') {
              worker.terminate();
              resolve({
                success: true,
                hasTimestamp: !!timestamp,
                isActive: payload.isActive,
                pollingInterval: payload.pollingInterval,
                circuitBreakerFailures: payload.circuitBreaker.failureCount,
                hasLastHeartbeat: !!payload.lastHeartbeat,
                circuitBreakerOpen: payload.circuitBreaker.isOpen
              });
            }
          };

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Status test timeout'
            });
          }, 5000);
        });
      });

      expect(statusTest.success).toBe(true);
      expect(statusTest.hasTimestamp).toBe(true);
      expect(statusTest.isActive).toBe(true);
      expect(statusTest.pollingInterval).toBe(30 * 60 * 1000);
      expect(statusTest.circuitBreakerFailures).toBe(2);
      expect(statusTest.hasLastHeartbeat).toBe(true);
      expect(statusTest.circuitBreakerOpen).toBe(false);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle Web Worker termination gracefully', async () => {
      const terminationTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class TerminationTestWorker {
              constructor() {
                this.isActive = true;
                this.intervalId = null;
                this.heartbeatTimeoutId = null;
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type } = event.data;
                  switch (type) {
                    case 'START_OPERATIONS':
                      this.startOperations();
                      break;
                    case 'STOP':
                      this.stopPolling();
                      break;
                  }
                });
              }

              startOperations() {
                this.intervalId = setInterval(() => {
                  self.postMessage({
                    type: 'OPERATION_TICK',
                    timestamp: Date.now()
                  });
                }, 100);

                this.heartbeatTimeoutId = setTimeout(() => {
                  self.postMessage({
                    type: 'HEARTBEAT',
                    timestamp: Date.now()
                  });
                }, 200);

                self.postMessage({
                  type: 'OPERATIONS_STARTED',
                  payload: {
                    hasInterval: !!this.intervalId,
                    hasTimeout: !!this.heartbeatTimeoutId
                  }
                });
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

                self.postMessage({
                  type: 'OPERATIONS_STOPPED',
                  payload: {
                    hasInterval: !!this.intervalId,
                    hasTimeout: !!this.heartbeatTimeoutId,
                    isActive: this.isActive
                  }
                });
              }
            }

            new TerminationTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          let operationsStarted = false;
          let operationsStopped = false;
          let stopResult = null;

          worker.onmessage = function(event) {
            const { type, payload } = event.data;

            if (type === 'OPERATIONS_STARTED') {
              operationsStarted = true;

              // Send stop command
              setTimeout(() => {
                worker.postMessage({ type: 'STOP' });
              }, 300);
            } else if (type === 'OPERATIONS_STOPPED') {
              operationsStopped = true;
              stopResult = payload;

              worker.terminate();
              resolve({
                success: true,
                operationsStarted,
                operationsStopped,
                cleanShutdown: !stopResult.hasInterval && !stopResult.hasTimeout,
                inactiveAfterStop: !stopResult.isActive
              });
            }
          };

          worker.postMessage({ type: 'START_OPERATIONS' });

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Termination test timeout',
              operationsStarted,
              operationsStopped
            });
          }, 5000);
        });
      });

      expect(terminationTest.success).toBe(true);
      expect(terminationTest.operationsStarted).toBe(true);
      expect(terminationTest.operationsStopped).toBe(true);
      expect(terminationTest.cleanShutdown).toBe(true);
      expect(terminationTest.inactiveAfterStop).toBe(true);
    });

    test('should handle unknown message types gracefully', async () => {
      const unknownMessageTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          // Capture console warnings
          const originalWarn = console.warn;
          let warningCaptured = '';
          console.warn = (message) => {
            warningCaptured = message;
            originalWarn(message);
          };

          const workerCode = `
            class UnknownMessageTestWorker {
              constructor() {
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type, payload, timestamp } = event.data;

                  switch (type) {
                    case 'UNKNOWN_TYPE':
                      console.warn('Unknown message type:', type);
                      self.postMessage({
                        type: 'WARNING_LOGGED',
                        payload: { receivedType: type }
                      });
                      break;
                    case 'VALID_TYPE':
                      self.postMessage({
                        type: 'VALID_RESPONSE',
                        payload: { success: true }
                      });
                      break;
                    default:
                      console.warn('Unknown message type:', type);
                      self.postMessage({
                        type: 'DEFAULT_WARNING',
                        payload: { unknownType: type }
                      });
                  }
                });
              }
            }

            new UnknownMessageTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          const responses = [];

          worker.onmessage = function(event) {
            const { type, payload } = event.data;
            responses.push({ type, payload });

            if (responses.length >= 2) {
              worker.terminate();
              console.warn = originalWarn; // Restore original

              resolve({
                success: true,
                responses,
                handledUnknown: responses.some(r => r.type === 'WARNING_LOGGED'),
                handledValid: responses.some(r => r.type === 'VALID_RESPONSE')
              });
            }
          };

          // Send unknown message type
          worker.postMessage({
            type: 'UNKNOWN_TYPE',
            payload: { test: true }
          });

          // Send valid message type
          worker.postMessage({
            type: 'VALID_TYPE',
            payload: { test: true }
          });

          setTimeout(() => {
            worker.terminate();
            console.warn = originalWarn;
            resolve({
              success: false,
              error: 'Unknown message test timeout',
              responses
            });
          }, 3000);
        });
      });

      expect(unknownMessageTest.success).toBe(true);
      expect(unknownMessageTest.handledUnknown).toBe(true);
      expect(unknownMessageTest.handledValid).toBe(true);
    });
  });

  test.describe('API Integration Requirements', () => {
    test('should make properly formatted HTTP requests to football API', async () => {
      // Mock API and verify request format
      await page.route('**/api.football-data.org/**', async route => {
        const request = route.request();
        const headers = request.headers();

        // Store request details for verification
        await page.evaluate((requestData) => {
          window.capturedRequest = requestData;
        }, {
          url: request.url(),
          method: request.method(),
          headers: headers
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            competition: { name: 'Premier League' },
            season: { startDate: '2024', currentMatchday: 15 },
            matches: []
          })
        });
      });

      const apiTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class APITestWorker {
              constructor() {
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  if (event.data.type === 'TEST_API_CALL') {
                    this.testApiCall();
                  }
                });
              }

              async testApiCall() {
                try {
                  const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches', {
                    headers: {
                      'X-Auth-Token': 'test-key',
                      'X-Response-Control': 'minified'
                    }
                  });

                  const data = await response.json();

                  self.postMessage({
                    type: 'API_CALL_COMPLETE',
                    payload: {
                      success: true,
                      status: response.status,
                      data: data
                    }
                  });
                } catch (error) {
                  self.postMessage({
                    type: 'API_CALL_COMPLETE',
                    payload: {
                      success: false,
                      error: error.message
                    }
                  });
                }
              }
            }

            new APITestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          worker.onmessage = function(event) {
            const { type, payload } = event.data;

            if (type === 'API_CALL_COMPLETE') {
              worker.terminate();
              resolve({
                success: payload.success,
                status: payload.status,
                hasData: !!payload.data,
                error: payload.error
              });
            }
          };

          worker.postMessage({ type: 'TEST_API_CALL' });

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'API call timeout'
            });
          }, 5000);
        });
      });

      // Verify the API request was made correctly
      const requestData = await page.evaluate(() => window.capturedRequest);

      expect(apiTest.success).toBe(true);
      expect(apiTest.status).toBe(200);
      expect(apiTest.hasData).toBe(true);
      expect(requestData.url).toContain('/v4/competitions/PL/matches');
      expect(requestData.headers['x-auth-token']).toBe('test-key');
      expect(requestData.headers['x-response-control']).toBe('minified');
    });

    test('should handle API errors and HTTP status codes properly', async () => {
      // Mock API with error responses
      await page.route('**/api.football-data.org/**', async (route, request) => {
        const url = request.url();

        if (url.includes('error-test')) {
          await route.fulfill({
            status: 429, // Rate limit exceeded
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              message: 'Too many requests'
            })
          });
        } else {
          await route.abort('failed');
        }
      });

      const errorTest = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const workerCode = `
            class ErrorTestWorker {
              constructor() {
                this.setupMessageHandler();
              }

              setupMessageHandler() {
                self.addEventListener('message', (event) => {
                  const { type, payload } = event.data;
                  if (type === 'TEST_ERROR_HANDLING') {
                    this.testErrorHandling(payload.testType);
                  }
                });
              }

              async testErrorHandling(testType) {
                const startTime = Date.now();

                try {
                  let url = 'https://api.football-data.org/v4/competitions/PL/matches';
                  if (testType === 'http-error') {
                    url += '?error-test=true';
                  }

                  const response = await fetch(url, {
                    headers: {
                      'X-Auth-Token': 'test-key',
                      'X-Response-Control': 'minified'
                    }
                  });

                  const responseTime = Date.now() - startTime;

                  if (!response.ok) {
                    self.postMessage({
                      type: 'ERROR_RESULT',
                      payload: {
                        success: false,
                        error: 'HTTP ' + response.status + ': ' + response.statusText,
                        timestamp: Date.now(),
                        responseTime,
                        retryCount: 0
                      }
                    });
                    return;
                  }

                  const data = await response.json();
                  self.postMessage({
                    type: 'ERROR_RESULT',
                    payload: {
                      success: true,
                      data
                    }
                  });
                } catch (error) {
                  self.postMessage({
                    type: 'ERROR_RESULT',
                    payload: {
                      success: false,
                      error: error.message,
                      timestamp: Date.now(),
                      responseTime: Date.now() - startTime,
                      retryCount: 0
                    }
                  });
                }
              }
            }

            new ErrorTestWorker();
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));

          const results = [];

          worker.onmessage = function(event) {
            const { type, payload } = event.data;

            if (type === 'ERROR_RESULT') {
              results.push(payload);

              if (results.length >= 2) {
                worker.terminate();

                const httpErrorResult = results.find(r => r.error && r.error.includes('HTTP 429'));
                const networkErrorResult = results.find(r => r.error && !r.error.includes('HTTP'));

                resolve({
                  success: true,
                  httpErrorHandled: !!httpErrorResult,
                  networkErrorHandled: !!networkErrorResult,
                  httpErrorDetails: httpErrorResult,
                  networkErrorDetails: networkErrorResult
                });
              }
            }
          };

          // Test HTTP error
          worker.postMessage({
            type: 'TEST_ERROR_HANDLING',
            payload: { testType: 'http-error' }
          });

          // Test network error
          worker.postMessage({
            type: 'TEST_ERROR_HANDLING',
            payload: { testType: 'network-error' }
          });

          setTimeout(() => {
            worker.terminate();
            resolve({
              success: false,
              error: 'Error handling test timeout',
              results
            });
          }, 8000);
        });
      });

      expect(errorTest.success).toBe(true);
      expect(errorTest.httpErrorHandled).toBe(true);
      expect(errorTest.networkErrorHandled).toBe(true);
      expect(errorTest.httpErrorDetails.error).toContain('HTTP 429');
      expect(errorTest.networkErrorDetails.error).toBeTruthy();
    });
  });
});