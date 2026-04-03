import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, of, throwError, combineLatest } from 'rxjs';
import { delay, map, catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { ChatMessage, ChatUser, TypingIndicator, ChatState, SendMethod } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly destroy$ = new Subject<void>();
  private readonly messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private readonly typingSubject = new BehaviorSubject<TypingIndicator[]>([]);
  private readonly connectionSubject = new BehaviorSubject<'connected' | 'disconnected' | 'connecting' | 'error'>('connected');
  private readonly currentUserSubject = new BehaviorSubject<ChatUser>(this.generateCurrentUser());

  private messageIdCounter = 1;
  private typingTimeout = new Map<string, any>();
  private simulatedUsers: ChatUser[] = [
    { id: 'user2', name: 'Alice Johnson' },
    { id: 'user3', name: 'Bob Smith' },
    { id: 'user4', name: 'Carol Davis' }
  ];

  // Public observables
  readonly messages$ = this.messagesSubject.asObservable();
  readonly typingIndicators$ = this.typingSubject.asObservable();
  readonly connectionStatus$ = this.connectionSubject.asObservable();
  readonly currentUser$ = this.currentUserSubject.asObservable();

  // Combined state observable
  readonly chatState$: Observable<ChatState> = combineLatest([
    this.messages$,
    this.currentUser$,
    this.typingIndicators$,
    this.connectionStatus$
  ]).pipe(
    map(([messages, currentUser, typingUsers, connectionStatus]) => ({
      messages,
      currentUser,
      typingUsers,
      connectionStatus
    }))
  );

  constructor() {
    this.initializeChat();
    this.startSimulatedActivity();
  }

  private generateCurrentUser(): ChatUser {
    const names = ['John Doe', 'Jane Smith', 'Mike Wilson', 'Sarah Brown'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    return {
      id: 'user1',
      name: randomName
    };
  }

  private initializeChat(): void {
    // Add some initial messages
    const initialMessages: ChatMessage[] = [
      {
        id: this.getNextMessageId(),
        content: 'Welcome to the chat! This is a demo of real-time messaging.',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        userId: 'user2',
        userName: 'Alice Johnson',
        status: 'sent'
      },
      {
        id: this.getNextMessageId(),
        content: 'Feel free to send a message and see the typing indicators in action!',
        timestamp: new Date(Date.now() - 240000), // 4 minutes ago
        userId: 'user3',
        userName: 'Bob Smith',
        status: 'sent'
      }
    ];

    this.messagesSubject.next(initialMessages);
  }

  private startSimulatedActivity(): void {
    // Simulate random incoming messages
    timer(10000, 30000).pipe(
      switchMap(() => this.simulateIncomingMessage()),
      takeUntil(this.destroy$)
    ).subscribe();

    // Simulate random typing indicators
    timer(15000, 20000).pipe(
      switchMap(() => this.simulateTypingActivity()),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private simulateIncomingMessage(): Observable<void> {
    if (Math.random() > 0.3) return of(); // 70% chance of no message

    const user = this.simulatedUsers[Math.floor(Math.random() * this.simulatedUsers.length)];
    const messages = [
      'That\'s interesting!',
      'I agree with that point.',
      'Can you elaborate on that?',
      'Thanks for sharing!',
      'Good to know.',
      'Looking forward to hearing more.',
      'Great discussion everyone!'
    ];

    const message: ChatMessage = {
      id: this.getNextMessageId(),
      content: messages[Math.floor(Math.random() * messages.length)],
      timestamp: new Date(),
      userId: user.id,
      userName: user.name,
      status: 'sent'
    };

    return of(null).pipe(
      delay(Math.random() * 2000 + 500), // Random delay 500-2500ms
      map(() => {
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, message]);
      })
    );
  }

  private simulateTypingActivity(): Observable<void> {
    if (Math.random() > 0.4) return of(); // 60% chance of no typing

    const user = this.simulatedUsers[Math.floor(Math.random() * this.simulatedUsers.length)];

    return of(null).pipe(
      delay(Math.random() * 1000), // Random delay up to 1s
      map(() => {
        this.startTypingForUser(user.id, user.name);
        // Auto-stop typing after 2-5 seconds
        setTimeout(() => {
          this.stopTypingForUser(user.id);
        }, Math.random() * 3000 + 2000);
      })
    );
  }

  sendMessage(content: string, method: SendMethod = 'button'): Observable<ChatMessage> {
    if (content.trim().length === 0 || content.length > 500) {
      return throwError('Invalid message content');
    }

    // Simulate connection failures occasionally (5% chance)
    if (Math.random() < 0.05) {
      this.connectionSubject.next('error');
      setTimeout(() => this.connectionSubject.next('connected'), 2000);
      return throwError('Connection failed');
    }

    const currentUser = this.currentUserSubject.value;
    const message: ChatMessage = {
      id: this.getNextMessageId(),
      content: content.trim(),
      timestamp: new Date(),
      userId: currentUser.id,
      userName: currentUser.name,
      status: 'sending'
    };

    // Add message immediately with sending status
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);

    // Emit tracking event
    this.trackEvent('message_sent', {
      message_length: content.length,
      send_method: method
    });

    // Simulate network delay and update status
    return of(message).pipe(
      delay(Math.random() * 1000 + 200), // 200-1200ms delay
      map(msg => {
        const updatedMessage = { ...msg, status: 'sent' as const };
        const messages = this.messagesSubject.value;
        const messageIndex = messages.findIndex(m => m.id === msg.id);
        if (messageIndex >= 0) {
          messages[messageIndex] = updatedMessage;
          this.messagesSubject.next([...messages]);
        }
        return updatedMessage;
      }),
      catchError(error => {
        // Update message status to failed
        const messages = this.messagesSubject.value;
        const messageIndex = messages.findIndex(m => m.id === message.id);
        if (messageIndex >= 0) {
          messages[messageIndex] = { ...message, status: 'failed' };
          this.messagesSubject.next([...messages]);
        }
        return throwError(error);
      })
    );
  }

  startTyping(): void {
    const currentUser = this.currentUserSubject.value;
    this.startTypingForUser(currentUser.id, currentUser.name);
    this.trackEvent('typing_started', { user_id: currentUser.id });
  }

  stopTyping(): void {
    const currentUser = this.currentUserSubject.value;
    this.stopTypingForUser(currentUser.id);
  }

  private startTypingForUser(userId: string, userName: string): void {
    const currentTyping = this.typingSubject.value;
    const existingIndex = currentTyping.findIndex(t => t.userId === userId);

    let updatedTyping: TypingIndicator[];
    if (existingIndex >= 0) {
      updatedTyping = [...currentTyping];
      updatedTyping[existingIndex] = { userId, userName, isTyping: true };
    } else {
      updatedTyping = [...currentTyping, { userId, userName, isTyping: true }];
    }

    this.typingSubject.next(updatedTyping);

    // Clear existing timeout
    if (this.typingTimeout.has(userId)) {
      clearTimeout(this.typingTimeout.get(userId));
    }

    // Set 3-second timeout
    const timeout = setTimeout(() => {
      this.stopTypingForUser(userId);
    }, 3000);

    this.typingTimeout.set(userId, timeout);
  }

  private stopTypingForUser(userId: string): void {
    const currentTyping = this.typingSubject.value;
    const updatedTyping = currentTyping.filter(t => t.userId !== userId);
    this.typingSubject.next(updatedTyping);

    if (this.typingTimeout.has(userId)) {
      clearTimeout(this.typingTimeout.get(userId));
      this.typingTimeout.delete(userId);
    }
  }

  private getNextMessageId(): string {
    return `msg_${this.messageIdCounter++}`;
  }

  retryConnection(): void {
    this.connectionSubject.next('connecting');
    timer(1500).subscribe(() => {
      this.connectionSubject.next('connected');
    });
  }

  private trackEvent(eventName: string, properties: any): void {
    // In a real app, this would send to analytics
    console.log(`Event: ${eventName}`, properties);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.typingTimeout.forEach(timeout => clearTimeout(timeout));
  }
}