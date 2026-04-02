export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface WsEnvelope<T> {
  type: string;
  payload: T;
}

export interface JoinPayload {
  username: string;
  roomId: string;
}

export interface SendMessagePayload {
  text: string;
}

export interface UserJoinedPayload {
  username: string;
}

export interface ErrorPayload {
  message: string;
}

export type InboundEvent =
  | { type: 'message'; payload: ChatMessage }
  | { type: 'user_joined'; payload: UserJoinedPayload }
  | { type: 'error'; payload: ErrorPayload };
