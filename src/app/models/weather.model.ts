export interface WeatherData {
  city: string;
  temperature: number; // Temperature in Celsius
  description: string;
  humidity?: number;
  windSpeed?: number;
}

export interface ApiError {
  type: 'network' | 'not-found' | 'server-error' | 'validation' | 'rate-limit';
  message: string;
  originalError?: any;
}

export type SearchState = 'idle' | 'loading' | 'success' | 'error';

// OpenWeatherMap API response interface
export interface OpenWeatherMapResponse {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    description: string;
    main: string;
  }>;
  wind: {
    speed: number;
  };
}