export interface WeatherData {
  cityName: string;
  temperature: number;
  condition: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
  icon: string;
  country: string;
}

export interface WeatherSearchState {
  isLoading: boolean;
  weatherData: WeatherData | null;
  error: string | null;
  hasSearched: boolean;
}

export interface WeatherApiResponse {
  name: string;
  sys: {
    country: string;
  };
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

export interface WeatherApiError {
  cod: string;
  message: string;
}

export enum WeatherErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_CITY = 'invalid_city',
  API_RATE_LIMIT = 'api_rate_limit',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}