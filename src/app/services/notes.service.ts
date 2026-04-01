import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly baseUrl = '/api/notes';

  constructor(private http: HttpClient) {}

  list(): Observable<Note[]> {
    return this.http.get<Note[]>(this.baseUrl);
  }

  get(id: string): Observable<Note> {
    return this.http.get<Note>(`${this.baseUrl}/${id}`);
  }

  create(body: { title: string; content: string }): Observable<Note> {
    return this.http.post<Note>(this.baseUrl, body);
  }

  update(id: string, body: { title: string; content: string }): Observable<Note> {
    return this.http.put<Note>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
