export interface ChatUser {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  userName: string;
  status: 'sending' | 'sent' | 'failed';
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  currentUser: ChatUser;
  typingUsers: TypingIndicator[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export type SendMethod = 'enter' | 'button';

export interface ChatEvent {
  type: 'message' | 'typing' | 'connection';
  payload: any;
}