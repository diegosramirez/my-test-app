export interface WeatherData {
  city: string;
  temperature: number; // in Fahrenheit
  condition: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
}

export interface WeatherSearchState {
  loading: boolean;
  loadingStage: 'idle' | 'acknowledgment' | 'searching' | 'spinner';
  error: string | null;
  data: WeatherData | null;
}

export interface ApiError {
  type: 'network' | 'validation' | 'not_found' | 'rate_limit' | 'timeout' | 'unknown';
  message: string;
  statusCode?: number;
}

export interface OpenWeatherMapResponse {
  name: string;
  main: {
    temp: number; // Kelvin
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind?: {
    speed: number;
  };
}