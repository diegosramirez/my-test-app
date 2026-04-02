import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageBubbleComponent } from './message-bubble.component';
import { ChatMessage } from '../../models/chat.models';

describe('MessageBubbleComponent', () => {
  let component: MessageBubbleComponent;
  let fixture: ComponentFixture<MessageBubbleComponent>;

  const testMessage: ChatMessage = {
    id: '1',
    sender: 'Alice',
    text: 'Hello world',
    timestamp: '2026-04-02T14:30:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageBubbleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MessageBubbleComponent);
    component = fixture.componentInstance;
  });

  it('should show sender name', () => {
    component.message = testMessage;
    component.isOwnMessage = false;
    fixture.detectChanges();
    const sender = fixture.nativeElement.querySelector('.sender');
    expect(sender.textContent).toBe('Alice');
  });

  it('should show message text', () => {
    component.message = testMessage;
    component.isOwnMessage = false;
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.text');
    expect(text.textContent).toBe('Hello world');
  });

  it('should format timestamp as HH:mm', () => {
    component.message = testMessage;
    component.isOwnMessage = false;
    fixture.detectChanges();
    const time = fixture.nativeElement.querySelector('.time');
    // Verify it's a time format (HH:mm)
    expect(time.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it('should apply own class for own messages', () => {
    component.message = testMessage;
    component.isOwnMessage = true;
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.bubble');
    expect(bubble.classList.contains('own')).toBe(true);
  });

  it('should apply other class for other messages', () => {
    component.message = testMessage;
    component.isOwnMessage = false;
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.bubble');
    expect(bubble.classList.contains('other')).toBe(true);
  });
});
