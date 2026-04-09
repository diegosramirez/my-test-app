export const environment = {
  production: true,
  apiKey: '', // Set this to your actual API key for production
  apiBaseUrl: 'https://api.football-data.org/v4',
  cache: {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
    staleThreshold: 30 * 60 * 1000 // 30 minutes
  },
  scheduler: {
    pollingInterval: 30 * 60 * 1000, // 30 minutes
    maxRetries: 3,
    baseBackoffDelay: 1000,
    maxBackoffDelay: 30000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 5 * 60 * 1000 // 5 minutes
  }
};