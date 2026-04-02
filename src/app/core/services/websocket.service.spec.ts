import { TestBed } from '@angular/core/testing';
import { WebSocketService, WS_URL } from './websocket.service';
import { InboundEvent } from '../../models/chat.models';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  readyState = 1; // OPEN
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  // Helpers
  simulateOpen() {
    this.onopen?.();
  }
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  simulateError(event?: Event) {
    this.onerror?.(event ?? new Event('error'));
  }
  simulateClose(code: number) {
    this.onclose?.({ code } as CloseEvent);
  }
}

describe('WebSocketService', () => {
  let service: WebSocketService;
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    vi.stubGlobal('WebSocket', MockWebSocket as any);

    TestBed.configureTestingModule({
      providers: [{ provide: WS_URL, useValue: 'ws://test/ws' }],
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    vi.stubGlobal('WebSocket', originalWebSocket);
  });

  it('should create a WebSocket on connect', () => {
    service.connect('ws://test/ws');
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://test/ws');
  });

  it('should emit on open$', () => {
    const openSpy = vi.fn();
    service.open$.subscribe(openSpy);
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].simulateOpen();
    expect(openSpy).toHaveBeenCalled();
  });

  it('should emit parsed messages on messages$', () => {
    const msgs: InboundEvent[] = [];
    service.messages$.subscribe((m) => msgs.push(m));
    service.connect('ws://test/ws');
    const payload = { type: 'message', payload: { id: '1', sender: 'A', text: 'hi', timestamp: '2026-01-01T00:00:00Z' } };
    MockWebSocket.instances[0].simulateMessage(payload);
    expect(msgs).toEqual([payload]);
  });

  it('should silently ignore malformed JSON', () => {
    const msgs: InboundEvent[] = [];
    service.messages$.subscribe((m) => msgs.push(m));
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].onmessage?.({ data: 'not-json' });
    expect(msgs.length).toBe(0);
  });

  it('should emit connectionError$ on error', () => {
    const errors: Event[] = [];
    service.connectionError$.subscribe((e) => errors.push(e));
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].simulateError();
    expect(errors.length).toBe(1);
  });

  it('should emit connectionError$ on abnormal close', () => {
    const errors: Event[] = [];
    service.connectionError$.subscribe((e) => errors.push(e));
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].simulateClose(4000);
    expect(errors.length).toBe(1);
  });

  it('should NOT emit connectionError$ on normal close (1000)', () => {
    const errors: Event[] = [];
    service.connectionError$.subscribe((e) => errors.push(e));
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].simulateClose(1000);
    expect(errors.length).toBe(0);
  });

  it('should send JSON when socket is open', () => {
    service.connect('ws://test/ws');
    const ws = MockWebSocket.instances[0];
    ws.readyState = 1;
    service.send({ type: 'join', payload: { username: 'A', roomId: 'general' } });
    expect(ws.sent.length).toBe(1);
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'join', payload: { username: 'A', roomId: 'general' } });
  });

  it('should not send when socket is not open', () => {
    service.connect('ws://test/ws');
    MockWebSocket.instances[0].readyState = 0;
    service.send({ type: 'message', payload: { text: 'hi' } });
    expect(MockWebSocket.instances[0].sent.length).toBe(0);
  });

  it('should close existing socket on double connect', () => {
    service.connect('ws://test/ws');
    const first = MockWebSocket.instances[0];
    service.connect('ws://test/ws');
    expect(first.closed).toBe(true);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  it('should close socket on disconnect', () => {
    service.connect('ws://test/ws');
    service.disconnect();
    expect(MockWebSocket.instances[0].closed).toBe(true);
  });

  it('should handle disconnect when no socket exists', () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
