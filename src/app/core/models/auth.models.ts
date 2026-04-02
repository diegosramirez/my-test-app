export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface ApiValidationError {
  error: string;
  details: Record<string, string>;
}

export interface ApiConflictError {
  error: string;
  field: string;
  message: string;
}

export interface ApiAuthError {
  error: string;
  message: string;
}
