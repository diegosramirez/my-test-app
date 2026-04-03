import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TypingIndicator } from '../../models/chat.models';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="typing-indicator-container"
      *ngIf="typingUsers.length > 0"
      [attr.aria-live]="'polite'"
      [attr.aria-label]="getTypingLabel()"
    >
      <div class="typing-bubble">
        <div class="typing-text">
          <span class="typing-names">{{ getTypingText() }}</span>
          <div class="typing-dots" aria-hidden="true">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .typing-indicator-container {
      padding: 0 16px 8px;
      display: flex;
      justify-content: flex-start;
      animation: slideIn 0.2s ease-out;
    }

    .typing-bubble {
      background-color: #F3F4F6;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
      max-width: 70%;
    }

    .typing-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: #6B7280;
    }

    .typing-names {
      font-weight: 500;
    }

    .typing-dots {
      display: flex;
      gap: 3px;
      align-items: center;
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: #9CA3AF;
      animation: typingPulse 1.5s infinite;
    }

    .dot:nth-child(1) {
      animation-delay: 0s;
    }

    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingPulse {
      0%, 80%, 100% {
        transform: scale(1);
        opacity: 0.5;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .typing-indicator-container {
        padding: 0 12px 8px;
      }

      .typing-bubble {
        max-width: 85%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TypingIndicatorComponent {
  @Input({ required: true }) typingUsers: TypingIndicator[] = [];

  getTypingText(): string {
    const activeUsers = this.typingUsers.filter(user => user.isTyping);

    if (activeUsers.length === 0) {
      return '';
    } else if (activeUsers.length === 1) {
      return `${activeUsers[0].userName} is typing`;
    } else if (activeUsers.length === 2) {
      return `${activeUsers[0].userName} and ${activeUsers[1].userName} are typing`;
    } else {
      return `${activeUsers.length} people are typing`;
    }
  }

  getTypingLabel(): string {
    const activeUsers = this.typingUsers.filter(user => user.isTyping);

    if (activeUsers.length === 0) {
      return '';
    } else if (activeUsers.length === 1) {
      return `${activeUsers[0].userName} is currently typing a message`;
    } else if (activeUsers.length === 2) {
      return `${activeUsers[0].userName} and ${activeUsers[1].userName} are currently typing`;
    } else {
      return `${activeUsers.length} people are currently typing`;
    }
  }
}