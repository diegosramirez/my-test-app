import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ChatMessage } from '../../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private http = inject(HttpClient);

  getHistory(roomId: string): Observable<ChatMessage[]> {
    return this.http
      .get<{ messages: ChatMessage[] }>(`/api/rooms/${roomId}/messages`)
      .pipe(map((res) => res.messages));
  }
}
