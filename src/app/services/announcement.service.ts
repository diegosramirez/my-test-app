import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Announcement } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  getAnnouncements(): Observable<Announcement[]> {
    // Stub implementation
    return of([]);
  }

  createAnnouncement(announcement: Partial<Announcement>): Observable<Announcement> {
    // Stub implementation
    const mockAnnouncement: Announcement = {
      id: 1,
      title: announcement.title || '',
      content: announcement.content || '',
      authorId: announcement.authorId || 0,
      createdAt: new Date()
    };
    return of(mockAnnouncement);
  }
}