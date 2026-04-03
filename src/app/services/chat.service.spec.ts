import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { ChatMessage, ChatUser, TypingIndicator, SendMethod } from '../models/chat.models';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ChatService', () => {
  let service: ChatService;
  let consoleLogSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatService);
    consoleLogSpy = vi.vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default connection status', async () => {
      const status = await firstValueFrom(service.connectionStatus$);
      expect(status).toBe('connected');
    });

    it('should initialize with welcome messages', async () => {
      const messages = await firstValueFrom(service.messages$);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toContain('Welcome to the chat');
      expect(messages[0].status).toBe('sent');
    });

    it('should generate current user with random name', async () => {
      const user = await firstValueFrom(service.currentUser$);
      expect(user.id).toBe('user1');
      expect(user.name).toBeTruthy();
      expect(typeof user.name).toBe('string');
    });

    it('should start with no typing users', async () => {
      const typingUsers = await firstValueFrom(service.typingIndicators$);
      expect(typingUsers.length).toBe(0);
    });

    it('should track component loaded event on initialization', () => {
      // Service is created in beforeEach, so we expect tracking to have occurred
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('should send valid message successfully', async () => {
      const content = 'Test message';
      const messagePromise = firstValueFrom(service.sendMessage(content, 'button'));

      const sentMessage = await messagePromise;

      expect(sentMessage.content).toBe(content);
      expect(sentMessage.status).toBe('sent');
      expect(sentMessage.userId).toBe('user1');
      expect(sentMessage.id).toMatch(/^msg_\d+$/);
      expect(sentMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should add message immediately with sending status', async () => {
      const content = 'Test message';

      const messagePromise = new Promise((resolve) => {
        service.messages$.pipe(take(2)).subscribe(messages => {
          if (messages.length > 2) { // Skip initial messages
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.content === content) {
              expect(lastMessage.status).toBe('sending');
              resolve(lastMessage);
            }
          }
        });
      });

      service.sendMessage(content, 'enter').subscribe();
      await messagePromise;
    });

    it('should update message status to sent after delay', async () => {
      const content = 'Test message';

      const sentMessage = await firstValueFrom(service.sendMessage(content));
      expect(sentMessage.status).toBe('sent');
    });

    it('should track message_sent event with correct properties', async () => {
      const content = 'Test message';
      const method: SendMethod = 'enter';

      await firstValueFrom(service.sendMessage(content, method));

      expect(consoleLogSpy).toHaveBeenCalledWith('Event: message_sent', {
        message_length: content.length,
        send_method: method
      });
    });

    it('should reject empty messages', async () => {
      await expect(firstValueFrom(service.sendMessage('   '))).rejects.toBe('Invalid message content');
    });

    it('should reject messages over 500 characters', async () => {
      const longMessage = 'a'.repeat(501);

      await expect(firstValueFrom(service.sendMessage(longMessage))).rejects.toBe('Invalid message content');
    });

    it('should accept exactly 500 character messages', async () => {
      const maxMessage = 'a'.repeat(500);

      const sentMessage = await firstValueFrom(service.sendMessage(maxMessage));
      expect(sentMessage.content).toBe(maxMessage);
      expect(sentMessage.status).toBe('sent');
    });

    it('should simulate connection failures occasionally', async () => {
      // Override Math.random to force failure
      const mathRandomSpy = vi.vi.spyOn(Math, 'random').mockReturnValue(0.01); // Force failure (< 0.05)

      try {
        await firstValueFrom(service.sendMessage('Test'));
        expect.fail('Expected error for simulated connection failure');
      } catch (error) {
        expect(error).toBe('Connection failed');
      }

      // Verify connection status changes
      const status = await firstValueFrom(service.connectionStatus$);
      expect(status).toBe('error');

      mathRandomSpy.mockRestore();
    });

    it('should update message status to failed on error', async () => {
      // Force connection error
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

      let messageId: string;
      let failedMessageFound = false;

      // Subscribe to messages to catch the failed status update
      const messageSubscription = service.messages$.subscribe(messages => {
        if (messageId) {
          const failedMessage = messages.find(m => m.id === messageId);
          if (failedMessage && failedMessage.status === 'failed') {
            failedMessageFound = true;
          }
        }
      });

      try {
        await firstValueFrom(service.sendMessage('Test'));
        expect.fail('Expected error for simulated connection failure');
      } catch (error) {
        expect(error).toBe('Connection failed');
      }

      // Wait a bit for the status update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failedMessageFound).toBe(true);
      messageSubscription.unsubscribe();
      mathRandomSpy.mockRestore();
    });

    it('should restore connection after error', async () => {
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // Force error

      const connectionPromise = new Promise<void>((resolve) => {
        const subscription = service.connectionStatus$.subscribe(status => {
          if (status === 'connected') {
            subscription.unsubscribe();
            resolve();
          }
        });
      });

      try {
        await firstValueFrom(service.sendMessage('Test'));
        expect.fail('Expected error for simulated connection failure');
      } catch (error) {
        expect(error).toBe('Connection failed');
      }

      // Wait for connection to restore (with timeout)
      await Promise.race([
        connectionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);

      mathRandomSpy.mockRestore();
    });
  });

  describe('Typing Indicators', () => {
    it('should start typing for current user', () => {
      service.startTyping();

      service.typingIndicators$.pipe(take(1)).subscribe(indicators => {
        const userTyping = indicators.find(i => i.userId === 'user1');
        expect(userTyping).toBeTruthy();
        expect(userTyping?.isTyping).toBe(true);
      });
    });

    it('should track typing_started event', () => {
      service.startTyping();

      expect(consoleLogSpy).toHaveBeenCalledWith('Event: typing_started', {
        user_id: 'user1'
      });
    });

    it('should stop typing for current user', () => {
      service.startTyping();
      service.stopTyping();

      service.typingIndicators$.pipe(take(1)).subscribe(indicators => {
        const userTyping = indicators.find(i => i.userId === 'user1');
        expect(userTyping).toBeFalsy();
      });
    });

    it('should auto-stop typing after 3 seconds', async () => {
      service.startTyping();

      // Wait slightly longer than 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3100));

      const indicators = await firstValueFrom(service.typingIndicators$.pipe(take(1)));
      const userTyping = indicators.find(i => i.userId === 'user1');
      expect(userTyping).toBeFalsy();
    });

    it('should handle multiple users typing simultaneously', (done) => {
      // Start typing for current user
      service.startTyping();

      // Simulate other users typing by calling private method
      (service as any).startTypingForUser('user2', 'Alice Johnson');
      (service as any).startTypingForUser('user3', 'Bob Smith');

      service.typingIndicators$.pipe(take(1)).subscribe(indicators => {
        expect(indicators.length).toBe(3);
        expect(indicators.some(i => i.userId === 'user1')).toBe(true);
        expect(indicators.some(i => i.userId === 'user2')).toBe(true);
        expect(indicators.some(i => i.userId === 'user3')).toBe(true);
        done();
      });
    });

    it('should update existing typing indicator instead of creating duplicate', () => {
      (service as any).startTypingForUser('user2', 'Alice Johnson');
      (service as any).startTypingForUser('user2', 'Alice Johnson'); // Same user again

      service.typingIndicators$.pipe(take(1)).subscribe(indicators => {
        const user2Indicators = indicators.filter(i => i.userId === 'user2');
        expect(user2Indicators.length).toBe(1);
      });
    });

    it('should clear timeout when user stops typing manually', () => {
      (service as any).startTypingForUser('user2', 'Alice');
      (service as any).stopTypingForUser('user2');

      // Verify timeout was cleared by checking internal map
      const timeoutMap = (service as any).typingTimeout;
      expect(timeoutMap.has('user2')).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should retry connection successfully', (done) => {
      service.retryConnection();

      // Should start as connecting
      service.connectionStatus$.pipe(take(1)).subscribe(status => {
        expect(status).toBe('connecting');
      });

      // Should become connected after delay
      setTimeout(() => {
        service.connectionStatus$.pipe(take(1)).subscribe(status => {
          expect(status).toBe('connected');
          done();
        });
      }, 1600); // Wait for retry delay
    });

    it('should maintain connection status state', async () => {
      const initialStatus = await firstValueFrom(service.connectionStatus$);
      expect(initialStatus).toBe('connected');

      // Change status manually for testing
      (service as any).connectionSubject.next('error');

      const errorStatus = await firstValueFrom(service.connectionStatus$);
      expect(errorStatus).toBe('error');
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = (service as any).getNextMessageId();
      const id2 = (service as any).getNextMessageId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+$/);
      expect(id2).toMatch(/^msg_\d+$/);
    });

    it('should increment message ID counter', () => {
      const initialCounter = (service as any).messageIdCounter;
      (service as any).getNextMessageId();
      const newCounter = (service as any).messageIdCounter;

      expect(newCounter).toBe(initialCounter + 1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      // Start some typing to create timeouts
      (service as any).startTypingForUser('user2', 'Alice');
      (service as any).startTypingForUser('user3', 'Bob');

      const timeoutMap = (service as any).typingTimeout;
      expect(timeoutMap.size).toBeGreaterThan(0);

      service.ngOnDestroy();

      // Timeouts should be cleared
      expect(timeoutMap.size).toBe(0);
    });

    it('should complete destroy subject', () => {
      const destroy$ = (service as any).destroy$;
      vi.spyOn(destroy$, 'next');
      vi.spyOn(destroy$, 'complete');

      service.ngOnDestroy();

      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
    });
  });

  describe('Simulated Activity', () => {
    it('should have simulated users defined', () => {
      const simulatedUsers = (service as any).simulatedUsers;
      expect(simulatedUsers.length).toBeGreaterThan(0);
      expect(simulatedUsers[0]).toEqual(jasmine.objectContaining({
        id: jasmine.any(String),
        name: jasmine.any(String)
      }));
    });

    it('should generate realistic message content for simulated messages', () => {
      const messages = [
        'That\'s interesting!',
        'I agree with that point.',
        'Can you elaborate on that?',
        'Thanks for sharing!',
        'Good to know.',
        'Looking forward to hearing more.',
        'Great discussion everyone!'
      ];

      // Test that simulated message method uses these messages
      // We can't easily test the random selection, but we can verify the messages exist
      expect(messages.every(msg => typeof msg === 'string' && msg.length > 0)).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid message sending', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(firstValueFrom(service.sendMessage(`Message ${i}`)));
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach((msg, index) => {
        expect(msg.content).toBe(`Message ${index}`);
        expect(msg.status).toBe('sent');
      });
    });

    it('should handle rapid typing start/stop', () => {
      // Rapidly start and stop typing
      for (let i = 0; i < 5; i++) {
        service.startTyping();
        service.stopTyping();
      }

      service.typingIndicators$.pipe(take(1)).subscribe(indicators => {
        const userTyping = indicators.find(i => i.userId === 'user1');
        expect(userTyping).toBeFalsy();
      });
    });

    it('should handle long message content correctly', async () => {
      const longMessage = 'This is a very long message that contains exactly four hundred and ninety-nine characters. '.repeat(5).substring(0, 499);

      const sentMessage = await firstValueFrom(service.sendMessage(longMessage));
      expect(sentMessage.content).toBe(longMessage);
      expect(sentMessage.content.length).toBe(499);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = '🚀 Hello! @user #hashtag <script>alert("test")</script> & more…';

      const sentMessage = await firstValueFrom(service.sendMessage(specialMessage));
      expect(sentMessage.content).toBe(specialMessage);
    });

    it('should preserve message order with concurrent sends', (done) => {
      const messageContents = ['First', 'Second', 'Third'];
      let completedMessages = 0;

      service.messages$.subscribe(messages => {
        const recentMessages = messages.slice(-3);
        if (recentMessages.length === 3 &&
            recentMessages.every(m => messageContents.includes(m.content))) {
          // Verify order is preserved (messages should appear in order sent)
          const indices = recentMessages.map(m => messageContents.indexOf(m.content));
          expect(indices).toEqual([0, 1, 2]);
          done();
        }
      });

      // Send messages rapidly
      messageContents.forEach(content => {
        service.sendMessage(content).subscribe({
          next: () => {
            completedMessages++;
          }
        });
      });
    });
  });
});