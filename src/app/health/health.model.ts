export interface HealthResponse {
  status: 'UP' | 'DOWN';
  uptime: number;
  timestamp: string;
}
