import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat.models';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="message-container"
      [ngClass]="{
        'own-message': isOwnMessage,
        'other-message': !isOwnMessage,
        'grouped': isGrouped
      }"
      [attr.aria-label]="getAriaLabel()"
    >
      <div class="message-content">
        <div class="message-header" *ngIf="!isGrouped">
          <span class="user-name">{{ message.userName }}</span>
          <span class="timestamp">{{ formatTimestamp(message.timestamp) }}</span>
        </div>
        <div class="message-bubble">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-status" *ngIf="isOwnMessage" [attr.aria-label]="getStatusLabel()">
            <span class="status-icon" [ngClass]="'status-' + message.status">
              <span *ngIf="message.status === 'sending'" class="spinner" aria-hidden="true"></span>
              <span *ngIf="message.status === 'sent'" class="checkmark" aria-hidden="true">✓</span>
              <span *ngIf="message.status === 'failed'" class="error" aria-hidden="true">✗</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message-container {
      margin-bottom: 8px;
      padding: 0 16px;
    }

    .message-container.grouped {
      margin-bottom: 2px;
    }

    .message-container.grouped .message-content {
      margin-left: 48px;
    }

    .own-message {
      display: flex;
      justify-content: flex-end;
    }

    .own-message .message-content {
      align-items: flex-end;
    }

    .other-message .message-content {
      align-items: flex-start;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 70%;
      min-width: 120px;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 0.875rem;
    }

    .user-name {
      font-weight: 600;
      color: #374151;
    }

    .timestamp {
      color: #6B7280;
      font-size: 0.75rem;
    }

    .message-bubble {
      position: relative;
      padding: 12px 16px;
      border-radius: 18px;
      word-wrap: break-word;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .own-message .message-bubble {
      background-color: #3B82F6;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .other-message .message-bubble {
      background-color: #F3F4F6;
      color: #1F2937;
      border-bottom-left-radius: 4px;
    }

    .message-text {
      flex: 1;
      line-height: 1.5;
    }

    .message-status {
      display: flex;
      align-items: center;
      margin-left: 8px;
      min-width: 16px;
    }

    .status-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      font-size: 12px;
    }

    .status-sending .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }

    .status-sent .checkmark {
      color: rgba(255, 255, 255, 0.8);
    }

    .status-failed .error {
      color: #EF4444;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 640px) {
      .message-content {
        max-width: 85%;
      }

      .message-container {
        padding: 0 12px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Input({ required: true }) isOwnMessage!: boolean;
  @Input() isGrouped = false;

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) { // Less than 1 minute
      return 'now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  getAriaLabel(): string {
    const timeLabel = this.formatTimestamp(this.message.timestamp);
    const statusLabel = this.isOwnMessage ? `, ${this.getStatusLabel()}` : '';
    return `Message from ${this.message.userName} at ${timeLabel}: ${this.message.content}${statusLabel}`;
  }

  getStatusLabel(): string {
    switch (this.message.status) {
      case 'sending':
        return 'sending';
      case 'sent':
        return 'delivered';
      case 'failed':
        return 'failed to send';
      default:
        return '';
    }
  }
}