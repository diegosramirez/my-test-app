export interface SignupStep1Request {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignupStep1WireRequest {
  email: string;
  password: string;
  password_confirmation: string;
}

export interface SignupStep1Response {
  userId: string;
  step: number;
}

export interface SignupStep1WireResponse {
  user_id: string;
  step: number;
}
