import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatApiService } from './chat-api.service';
import { ChatMessage } from '../../models/chat.models';

describe('ChatApiService', () => {
  let service: ChatApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch messages for a room', () => {
    const msgs: ChatMessage[] = [
      { id: '1', sender: 'Alice', text: 'Hi', timestamp: '2026-01-01T00:00:00Z' },
    ];
    let result: ChatMessage[] = [];
    service.getHistory('general').subscribe((m) => (result = m));
    const req = httpMock.expectOne('/api/rooms/general/messages');
    expect(req.request.method).toBe('GET');
    req.flush({ messages: msgs });
    expect(result).toEqual(msgs);
  });

  it('should return empty array for empty room', () => {
    let result: ChatMessage[] | null = null;
    service.getHistory('unknown').subscribe((m) => (result = m));
    httpMock.expectOne('/api/rooms/unknown/messages').flush({ messages: [] });
    expect(result).toEqual([]);
  });
});
