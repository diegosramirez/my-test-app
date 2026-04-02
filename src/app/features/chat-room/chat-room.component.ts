import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, inject, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatMessage, InboundEvent } from '../../models/chat.models';
import { WebSocketService, WS_URL } from '../../core/services/websocket.service';
import { ChatApiService } from '../../core/services/chat-api.service';
import { MessageBubbleComponent } from './message-bubble.component';

interface SystemMessage {
  type: 'system';
  text: string;
}

type DisplayMessage = ChatMessage | SystemMessage;

function isChatMessage(msg: DisplayMessage): msg is ChatMessage {
  return 'id' in msg;
}

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageBubbleComponent],
  template: `
    <div class="chat-container">
      <header class="chat-header">
        <span class="room-name">#general</span>
        <span class="username">{{ username }}</span>
      </header>

      <div
        #messageList
        class="message-list"
        role="log"
        aria-live="polite"
      >
        @if (connecting()) {
          <div class="status-message">Connecting…</div>
        }
        @if (connectionError()) {
          <div class="error-banner" role="alert">Unable to connect to chat server</div>
        }
        @if (!connecting() && !connectionError() && messages().length === 0) {
          <div class="status-message">No messages yet</div>
        }
        @for (msg of messages(); track trackMessage($index, msg)) {
          @if (isSystem(msg)) {
            <div class="system-message"><em>{{ msg.text }}</em></div>
          } @else {
            <app-message-bubble
              [message]="asChatMessage(msg)"
              [isOwnMessage]="asChatMessage(msg).sender === username"
            />
          }
        }
      </div>

      <div class="input-bar">
        <label for="message-input" class="sr-only">Message</label>
        <input
          #messageInput
          id="message-input"
          type="text"
          [(ngModel)]="messageText"
          name="messageText"
          maxlength="500"
          [placeholder]="connectionError() ? 'Chat unavailable' : 'Type a message…'"
          [disabled]="connectionError()"
          (keydown.enter)="sendMessage()"
          autocomplete="off"
        />
        <button
          (click)="sendMessage()"
          [disabled]="isSendDisabled()"
          [class.disabled]="isSendDisabled()"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #1e293b;
      color: white;
    }
    .room-name { font-weight: 600; }
    .username { font-size: 0.875rem; opacity: 0.8; }
    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
    }
    .status-message {
      text-align: center;
      color: #6b7280;
      padding: 2rem;
      font-size: 0.9375rem;
    }
    .error-banner {
      background: #fef3c7;
      color: #92400e;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }
    .system-message {
      text-align: center;
      color: #9ca3af;
      font-size: 0.8125rem;
      padding: 0.25rem 0;
    }
    .input-bar {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: white;
      border-top: 1px solid #e5e7eb;
    }
    .input-bar input {
      flex: 1;
      padding: 0.625rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9375rem;
    }
    .input-bar input:focus {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
    }
    .input-bar button {
      padding: 0.625rem 1.25rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }
    .input-bar button:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .input-bar button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }
  `]
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  @ViewChild('messageList') messageListRef!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInputRef!: ElementRef<HTMLInputElement>;

  private wsService = inject(WebSocketService);
  private chatApi = inject(ChatApiService);
  private router = inject(Router);
  private wsUrl = inject(WS_URL);

  private subscriptions: Subscription[] = [];

  username = '';
  messageText = '';
  messages = signal<DisplayMessage[]>([]);
  connecting = signal(true);
  connectionError = signal(false);

  isSystem(msg: DisplayMessage): msg is SystemMessage {
    return 'type' in msg && (msg as SystemMessage).type === 'system';
  }

  asChatMessage(msg: DisplayMessage): ChatMessage {
    return msg as ChatMessage;
  }

  trackMessage(index: number, msg: DisplayMessage): string {
    if ('id' in msg) return (msg as ChatMessage).id;
    return `system-${index}`;
  }

  isSendDisabled(): boolean {
    return this.messageText.trim().length === 0 || this.connectionError();
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('chat_username');
    if (!saved) {
      this.router.navigate(['/']);
      return;
    }
    this.username = saved.trim();

    // Load history then connect WebSocket
    const historySub = this.chatApi.getHistory('general').subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.connectWebSocket();
      },
      error: () => {
        this.connecting.set(false);
        this.connectionError.set(true);
      },
    });
    this.subscriptions.push(historySub);
  }

  private connectWebSocket(): void {
    const msgSub = this.wsService.messages$.subscribe((event: InboundEvent) => {
      this.handleInboundEvent(event);
    });
    this.subscriptions.push(msgSub);

    const errorSub = this.wsService.connectionError$.subscribe(() => {
      this.connecting.set(false);
      this.connectionError.set(true);
    });
    this.subscriptions.push(errorSub);

    const openSub = this.wsService.open$.subscribe(() => {
      this.connecting.set(false);
      // Send join event
      this.wsService.send({
        type: 'join',
        payload: { username: this.username, roomId: 'general' },
      });
      // Focus the message input after connection
      setTimeout(() => {
        this.messageInputRef?.nativeElement?.focus();
      }, 0);
    });
    this.subscriptions.push(openSub);

    this.wsService.connect(this.wsUrl);
  }

  private handleInboundEvent(event: InboundEvent): void {
    // Capture scroll position BEFORE updating messages
    const container = this.messageListRef?.nativeElement;
    let isNearBottom = true;
    if (container) {
      isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 50;
    }

    switch (event.type) {
      case 'message':
        this.messages.update((msgs) => [...msgs, event.payload]);
        break;
      case 'user_joined':
        this.messages.update((msgs) => [
          ...msgs,
          { type: 'system' as const, text: `${event.payload.username} joined the room` },
        ]);
        break;
      case 'error':
        // Server error - will be followed by close
        break;
    }

    // Auto-scroll after DOM update
    if (isNearBottom) {
      setTimeout(() => {
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }, 0);
    }
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text || this.connectionError()) return;

    this.wsService.send({ type: 'message', payload: { text } });
    this.messageText = '';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.wsService.disconnect();
  }
}
