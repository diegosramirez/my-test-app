import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { ChatRoomComponent } from './chat-room.component';
import { WebSocketService, WS_URL } from '../../core/services/websocket.service';
import { InboundEvent } from '../../models/chat.models';

describe('ChatRoomComponent', () => {
  let fixture: ComponentFixture<ChatRoomComponent>;
  let component: ChatRoomComponent;
  let router: Router;
  let httpMock: HttpTestingController;
  let messagesSubject: Subject<InboundEvent>;
  let connectionErrorSubject: Subject<Event>;
  let openSubject: Subject<void>;
  let mockWsService: {
    messages$: Subject<InboundEvent>;
    connectionError$: Subject<Event>;
    open$: Subject<void>;
    connect: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.clear();
    messagesSubject = new Subject();
    connectionErrorSubject = new Subject();
    openSubject = new Subject();
    mockWsService = {
      messages$: messagesSubject,
      connectionError$: connectionErrorSubject,
      open$: openSubject,
      connect: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ChatRoomComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WebSocketService, useValue: mockWsService },
        { provide: WS_URL, useValue: 'ws://test/ws' },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    localStorage.clear();
    // Cancel any unflushed requests before verify to prevent cascade failures
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  function createComponent() {
    fixture = TestBed.createComponent(ChatRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function flushHistory(messages: any[] = []) {
    const req = httpMock.expectOne('/api/rooms/general/messages');
    req.flush({ messages });
  }

  // --- Route Guard ---
  it('should redirect to / if no username in localStorage', () => {
    createComponent();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  // --- Connecting State ---
  it('should show Connecting… state initially', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Connecting…');
    // Flush the pending HTTP request to satisfy httpMock.verify()
    flushHistory([]);
  });

  // --- History Loading ---
  it('should load history and connect WebSocket after', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    expect(mockWsService.connect).toHaveBeenCalledWith('ws://test/ws');
  });

  it('should render history messages', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([
      { id: '1', sender: 'Bob', text: 'Hello', timestamp: '2026-04-02T10:00:00Z' },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hello');
    expect(fixture.nativeElement.textContent).toContain('Bob');
  });

  it('should show "No messages yet" when history is empty and connected', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No messages yet');
  });

  // --- WebSocket open and join ---
  it('should send join event on WebSocket open', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    expect(mockWsService.send).toHaveBeenCalledWith({
      type: 'join',
      payload: { username: 'Alice', roomId: 'general' },
    });
  });

  it('should clear connecting state on open', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Connecting…');
  });

  // --- Receive messages ---
  it('should render incoming chat message', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    messagesSubject.next({
      type: 'message',
      payload: { id: '2', sender: 'Bob', text: 'Hey there', timestamp: '2026-04-02T10:05:00Z' },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hey there');
  });

  // --- System messages ---
  it('should render user_joined as system message', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    messagesSubject.next({ type: 'user_joined', payload: { username: 'Bob' } });
    fixture.detectChanges();
    const sysMsg = fixture.nativeElement.querySelector('.system-message');
    expect(sysMsg).toBeTruthy();
    expect(sysMsg.textContent).toContain('Bob joined the room');
  });

  // --- Send message ---
  it('should send message via WebSocket and clear input', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    component.messageText = 'Hello!';
    component.sendMessage();
    expect(mockWsService.send).toHaveBeenCalledWith({
      type: 'message',
      payload: { text: 'Hello!' },
    });
    expect(component.messageText).toBe('');
  });

  it('should not send empty/whitespace message', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    mockWsService.send.mockClear();
    component.messageText = '   ';
    component.sendMessage();
    expect(mockWsService.send).not.toHaveBeenCalled();
  });

  // --- Send button disabled ---
  it('should disable send when input is empty', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    component.messageText = '';
    expect(component.isSendDisabled()).toBe(true);
  });

  it('should disable send on connection error', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    connectionErrorSubject.next(new Event('error'));
    component.messageText = 'test';
    expect(component.isSendDisabled()).toBe(true);
  });

  // --- Connection Error ---
  it('should show error banner on connection error', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    connectionErrorSubject.next(new Event('error'));
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Unable to connect to chat server');
  });

  it('should disable message input and change placeholder on error', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    connectionErrorSubject.next(new Event('error'));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#message-input');
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe('Chat unavailable');
  });

  // --- Connection error on history fetch failure ---
  it('should show error if history fetch fails', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    const req = httpMock.expectOne('/api/rooms/general/messages');
    req.error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.connectionError()).toBe(true);
    expect(component.connecting()).toBe(false);
  });

  // --- Header ---
  it('should show room name and username in header', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('.chat-header');
    expect(header.textContent).toContain('#general');
    expect(header.textContent).toContain('Alice');
  });

  // --- Message list accessibility ---
  it('should have role="log" and aria-live="polite" on message list', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    const list = fixture.nativeElement.querySelector('.message-list');
    expect(list.getAttribute('role')).toBe('log');
    expect(list.getAttribute('aria-live')).toBe('polite');
    // Flush the pending HTTP request to satisfy httpMock.verify()
    flushHistory([]);
  });

  // --- Cleanup ---
  it('should disconnect WebSocket on destroy', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    component.ngOnDestroy();
    expect(mockWsService.disconnect).toHaveBeenCalled();
  });

  // --- Own vs other message styling ---
  it('should mark own messages with isOwnMessage', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    messagesSubject.next({
      type: 'message',
      payload: { id: '1', sender: 'Alice', text: 'My msg', timestamp: '2026-04-02T10:00:00Z' },
    });
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.bubble.own');
    expect(bubble).toBeTruthy();
  });

  it('should mark other messages with other class', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    messagesSubject.next({
      type: 'message',
      payload: { id: '1', sender: 'Bob', text: 'Their msg', timestamp: '2026-04-02T10:00:00Z' },
    });
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.bubble.other');
    expect(bubble).toBeTruthy();
  });

  // --- Auto-scroll ---
  it('should check isNearBottom before updating messages', () => {
    vi.useFakeTimers();
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    openSubject.next();
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.message-list');
    // Mock scroll dimensions: near bottom
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 450, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 40, configurable: true });
    const scrollSpy = vi.spyOn(container, 'scrollTo').mockImplementation(() => {});

    messagesSubject.next({
      type: 'message',
      payload: { id: '3', sender: 'Bob', text: 'scroll test', timestamp: '2026-04-02T10:00:00Z' },
    });
    fixture.detectChanges();

    // scrollTo is called via setTimeout(0)
    vi.advanceTimersByTime(0);
    expect(scrollSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // --- Not send message on connection error ---
  it('should not send message when in error state', () => {
    localStorage.setItem('chat_username', 'Alice');
    createComponent();
    flushHistory([]);
    connectionErrorSubject.next(new Event('error'));
    mockWsService.send.mockClear();
    component.messageText = 'test';
    component.sendMessage();
    expect(mockWsService.send).not.toHaveBeenCalled();
  });
});
