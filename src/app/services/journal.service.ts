import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JournalEntry } from '../models/journal-entry.interface';

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private readonly API_URL = '/api/entries';

  constructor(private http: HttpClient) {}

  getEntries(): Observable<JournalEntry[]> {
    return this.http.get<JournalEntry[]>(this.API_URL).pipe(
      catchError(error => this.handleError(error))
    );
  }

  createEntry(entry: Partial<JournalEntry>): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.API_URL, entry).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateEntry(id: string, entry: Partial<JournalEntry>): Observable<JournalEntry> {
    return this.http.put<JournalEntry>(`${this.API_URL}/${id}`, entry).pipe(
      catchError(error => this.handleError(error))
    );
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 404) {
      errorMessage = 'Entry not found or access denied.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}