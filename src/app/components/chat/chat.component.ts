import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, fromEvent, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../services/chat.service';
import { MessageComponent } from '../message/message.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { ChatMessage, TypingIndicator, SendMethod } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MessageComponent,
    TypingIndicatorComponent
  ],
  template: `
    <div class="chat-container" [attr.aria-label]="'Chat conversation'">
      <!-- Header -->
      <div class="chat-header">
        <h2>Live Chat</h2>
        <div class="connection-status" [ngClass]="'status-' + connectionStatus">
          <span class="status-indicator" [attr.aria-label]="getConnectionStatusLabel()"></span>
          <span class="status-text">{{ getConnectionStatusText() }}</span>
          <button
            *ngIf="connectionStatus === 'error'"
            class="retry-button"
            (click)="retryConnection()"
            [attr.aria-label]="'Retry connection'"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div
        #messageContainer
        class="messages-container"
        (scroll)="onScroll()"
        [attr.aria-live]="'polite'"
        [attr.aria-label]="'Chat messages, ' + messages.length + ' messages'"
        role="log"
      >
        <!-- Empty State -->
        <div *ngIf="messages.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>Start the conversation</h3>
          <p>Send your first message to begin chatting!</p>
        </div>

        <!-- Messages -->
        <div *ngFor="let message of messages; let i = index; trackBy: trackByMessageId">
          <app-message
            [message]="message"
            [isOwnMessage]="message.userId === currentUserId"
            [isGrouped]="isMessageGrouped(i)"
          ></app-message>
        </div>

        <!-- Typing Indicators -->
        <app-typing-indicator [typingUsers]="typingUsers"></app-typing-indicator>

        <!-- Scroll anchor for auto-scroll -->
        <div #scrollAnchor></div>
      </div>

      <!-- Input Area -->
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            #messageInput
            class="message-input"
            [(ngModel)]="newMessage"
            (keydown)="onKeyDown($event)"
            (input)="onInput()"
            (focus)="onInputFocus()"
            (blur)="onInputBlur()"
            placeholder="Type your message..."
            [disabled]="connectionStatus === 'disconnected' || connectionStatus === 'error'"
            [attr.aria-label]="'Message input, ' + getRemainingChars() + ' characters remaining'"
            [attr.aria-describedby]="'char-counter'"
            rows="1"
            maxlength="500"
          ></textarea>

          <button
            class="send-button"
            (click)="sendMessage()"
            [disabled]="!canSendMessage()"
            [attr.aria-label]="'Send message'"
            type="button"
          >
            <span class="send-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
              </svg>
            </span>
          </button>
        </div>

        <div class="input-footer">
          <div
            id="char-counter"
            class="char-counter"
            [ngClass]="{
              'warning': newMessage.length >= 450,
              'error': newMessage.length >= 500
            }"
            [attr.aria-live]="newMessage.length >= 450 ? 'assertive' : 'polite'"
          >
            {{ newMessage.length }}/500
            <span *ngIf="newMessage.length >= 450" class="char-warning">
              {{ newMessage.length >= 500 ? 'Character limit reached' : 'Approaching limit' }}
            </span>
          </div>

          <div class="input-help" *ngIf="newMessage.length === 0">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>

    <!-- Screen reader announcements -->
    <div aria-live="assertive" aria-atomic="true" class="sr-only">
      {{ screenReaderAnnouncement }}
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 600px;
      background-color: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background-color: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }

    .chat-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1F2937;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-connected .status-indicator {
      background-color: #10B981;
    }

    .status-connecting .status-indicator {
      background-color: #F59E0B;
      animation: pulse 1s infinite;
    }

    .status-disconnected .status-indicator,
    .status-error .status-indicator {
      background-color: #EF4444;
    }

    .status-text {
      color: #6B7280;
      font-weight: 500;
    }

    .retry-button {
      background: none;
      border: 1px solid #D1D5DB;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.75rem;
      cursor: pointer;
      color: #374151;
    }

    .retry-button:hover {
      background-color: #F3F4F6;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      scroll-behavior: smooth;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #6B7280;
      padding: 40px 20px;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: #374151;
      font-weight: 600;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    .input-container {
      border-top: 1px solid #E5E7EB;
      padding: 16px 20px;
      background-color: white;
    }

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 8px;
    }

    .message-input {
      flex: 1;
      border: 1px solid #D1D5DB;
      border-radius: 20px;
      padding: 12px 16px;
      font-size: 0.875rem;
      line-height: 1.5;
      resize: none;
      max-height: 120px;
      background-color: #F9FAFB;
      transition: border-color 0.2s ease, background-color 0.2s ease;
    }

    .message-input:focus {
      outline: none;
      border-color: #3B82F6;
      background-color: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .message-input:disabled {
      background-color: #F3F4F6;
      color: #9CA3AF;
      cursor: not-allowed;
    }

    .send-button {
      background-color: #3B82F6;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }

    .send-button:hover:not(:disabled) {
      background-color: #2563EB;
      transform: scale(1.05);
    }

    .send-button:disabled {
      background-color: #D1D5DB;
      cursor: not-allowed;
      transform: none;
    }

    .input-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #6B7280;
    }

    .char-counter {
      font-weight: 500;
    }

    .char-counter.warning {
      color: #F59E0B;
    }

    .char-counter.error {
      color: #EF4444;
    }

    .char-warning {
      margin-left: 8px;
      font-weight: 600;
    }

    .input-help {
      font-style: italic;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @media (max-width: 640px) {
      .chat-container {
        height: 100vh;
        border-radius: 0;
        border: none;
      }

      .chat-header {
        padding: 12px 16px;
      }

      .input-container {
        padding: 12px 16px;
      }

      .message-input {
        font-size: 16px; /* Prevents zoom on iOS */
      }

      .input-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messageContainer') messageContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  private readonly destroy$ = new Subject<void>();
  private readonly typingDebouncer$ = new Subject<void>();

  messages: ChatMessage[] = [];
  typingUsers: TypingIndicator[] = [];
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'connected';
  currentUserId = '';
  newMessage = '';
  screenReaderAnnouncement = '';

  private isUserScrolling = false;
  private shouldAutoScroll = true;
  private intersectionObserver?: IntersectionObserver;
  private isTyping = false;
  private lastMessageCount = 0;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.setupTypingDebouncer();
    this.trackEvent('chat_component_loaded', {
      user_id: this.currentUserId,
      session_id: this.generateSessionId()
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
    this.autoResizeTextarea();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  private initializeSubscriptions(): void {
    // Messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        const hadNewMessage = messages.length > this.lastMessageCount;
        this.messages = messages;
        this.lastMessageCount = messages.length;

        if (hadNewMessage) {
          this.handleNewMessage(messages[messages.length - 1]);
        }
        this.cdr.markForCheck();
      });

    // Typing indicators
    this.chatService.typingIndicators$
      .pipe(takeUntil(this.destroy$))
      .subscribe(indicators => {
        this.typingUsers = indicators;
        this.cdr.markForCheck();
      });

    // Connection status
    this.chatService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
        this.cdr.markForCheck();
      });

    // Current user
    this.chatService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUserId = user.id;
        this.cdr.markForCheck();
      });
  }

  private setupTypingDebouncer(): void {
    this.typingDebouncer$
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.isTyping) {
          this.chatService.stopTyping();
          this.isTyping = false;
        }
      });
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        this.shouldAutoScroll = entry.isIntersecting;
      },
      {
        root: this.messageContainer.nativeElement,
        rootMargin: '0px 0px -100px 0px', // Trigger when within 100px of bottom
        threshold: 0
      }
    );

    this.intersectionObserver.observe(this.scrollAnchor.nativeElement);
  }

  private handleNewMessage(message: ChatMessage): void {
    // Screen reader announcement
    if (message.userId !== this.currentUserId) {
      this.screenReaderAnnouncement = `New message from ${message.userName}: ${message.content}`;
      setTimeout(() => {
        this.screenReaderAnnouncement = '';
        this.cdr.markForCheck();
      }, 1000);
    }

    // Auto scroll if enabled
    if (this.shouldAutoScroll) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  onScroll(): void {
    this.isUserScrolling = true;
    setTimeout(() => {
      this.isUserScrolling = false;
    }, 150);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Allow new line
        return;
      } else {
        event.preventDefault();
        this.sendMessage('enter');
      }
    }
  }

  onInput(): void {
    this.autoResizeTextarea();

    // Handle typing indicators
    if (this.newMessage.trim().length > 0) {
      if (!this.isTyping) {
        this.chatService.startTyping();
        this.isTyping = true;
      }
      this.typingDebouncer$.next();
    } else {
      if (this.isTyping) {
        this.chatService.stopTyping();
        this.isTyping = false;
      }
    }
  }

  onInputFocus(): void {
    // Scroll to bottom on mobile to ensure input is visible
    if (window.innerWidth <= 640) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  }

  onInputBlur(): void {
    if (this.isTyping) {
      this.chatService.stopTyping();
      this.isTyping = false;
    }
  }

  sendMessage(method: SendMethod = 'button'): void {
    if (!this.canSendMessage()) return;

    const content = this.newMessage.trim();
    this.newMessage = '';
    this.autoResizeTextarea();

    if (this.isTyping) {
      this.chatService.stopTyping();
      this.isTyping = false;
    }

    this.chatService.sendMessage(content, method).subscribe({
      next: () => {
        // Message handled by service subscription
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        // Error feedback could be added here
      }
    });

    // Focus back to input
    setTimeout(() => {
      this.messageInput.nativeElement.focus();
    }, 100);
  }

  canSendMessage(): boolean {
    return (
      this.newMessage.trim().length > 0 &&
      this.newMessage.length <= 500 &&
      this.connectionStatus === 'connected'
    );
  }

  retryConnection(): void {
    this.chatService.retryConnection();
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  isMessageGrouped(index: number): boolean {
    if (index === 0) return false;

    const currentMessage = this.messages[index];
    const previousMessage = this.messages[index - 1];

    const timeDiff = currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime();
    const isConsecutive = timeDiff < 60000; // Within 1 minute
    const isSameUser = currentMessage.userId === previousMessage.userId;

    return isConsecutive && isSameUser;
  }

  getRemainingChars(): number {
    return 500 - this.newMessage.length;
  }

  getConnectionStatusText(): string {
    switch (this.connectionStatus) {
      case 'connected':
        return 'Online';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Connection failed';
      default:
        return 'Unknown';
    }
  }

  getConnectionStatusLabel(): string {
    return `Connection status: ${this.getConnectionStatusText()}`;
  }

  private scrollToBottom(): void {
    if (!this.shouldAutoScroll || this.isUserScrolling) return;

    this.ngZone.runOutsideAngular(() => {
      const container = this.messageContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    });

    this.trackEvent('auto_scroll_triggered', {
      message_count: this.messages.length,
      scroll_position: this.messageContainer.nativeElement.scrollTop
    });
  }

  private autoResizeTextarea(): void {
    const textarea = this.messageInput.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  private trackEvent(eventName: string, properties: any): void {
    console.log(`Event: ${eventName}`, properties);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}