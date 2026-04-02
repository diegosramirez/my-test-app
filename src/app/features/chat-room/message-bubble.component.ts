import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ChatMessage } from '../../models/chat.models';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="bubble" [class.own]="isOwnMessage" [class.other]="!isOwnMessage">
      <span class="sender">{{ message.sender }}</span>
      <span class="text">{{ message.text }}</span>
      <span class="time">{{ formatTime(message.timestamp) }}</span>
    </div>
  `,
  styles: [`
    .bubble {
      max-width: 70%;
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      margin-bottom: 0.5rem;
      word-wrap: break-word;
    }
    .own {
      background: #2563eb;
      color: #ffffff;
      margin-left: auto;
      text-align: right;
    }
    .other {
      background: #4b5563;
      color: #ffffff;
      margin-right: auto;
      text-align: left;
    }
    .sender {
      display: block;
      font-weight: 600;
      font-size: 0.75rem;
      margin-bottom: 0.125rem;
    }
    .own .sender {
      color: #dbeafe;
    }
    .other .sender {
      color: #e5e7eb;
    }
    .text {
      display: block;
      font-size: 0.9375rem;
      line-height: 1.4;
    }
    .time {
      display: block;
      font-size: 0.6875rem;
      margin-top: 0.25rem;
      opacity: 0.8;
    }
  `]
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Input({ required: true }) isOwnMessage!: boolean;

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
