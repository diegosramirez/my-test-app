import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { InboundEvent, WsEnvelope } from '../../models/chat.models';

export const WS_URL = new InjectionToken<string>('WS_URL', {
  providedIn: 'root',
  factory: () => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  },
});

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messagesSubject = new Subject<InboundEvent>();
  private connectionErrorSubject = new Subject<Event>();
  private openSubject = new Subject<void>();

  readonly messages$: Observable<InboundEvent> = this.messagesSubject.asObservable();
  readonly connectionError$: Observable<Event> = this.connectionErrorSubject.asObservable();
  readonly open$: Observable<void> = this.openSubject.asObservable();

  connect(url: string): void {
    // Guard against double-open
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.openSubject.next();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as InboundEvent;
        this.messagesSubject.next(data);
      } catch {
        // Silently ignore malformed JSON
      }
    };

    this.socket.onerror = (event: Event) => {
      this.connectionErrorSubject.next(event);
    };

    this.socket.onclose = (event: CloseEvent) => {
      if (event.code !== 1000 && event.code !== 1005) {
        this.connectionErrorSubject.next(event);
      }
    };
  }

  send(envelope: WsEnvelope<unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(envelope));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
