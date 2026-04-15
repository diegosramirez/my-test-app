import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { Event } from '../models/event.interface';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventsSubject = new BehaviorSubject<Event[]>([]);
  public events$ = this.eventsSubject.asObservable();

  constructor(private localStorageService: LocalStorageService) {
    this.loadEvents();
    this.setupCrossTabSync();
  }

  getEvents(): Observable<Event[]> {
    return this.events$;
  }

  saveEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): void {
    const now = new Date();
    const newEvent: Event = {
      ...eventData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    const currentEvents = this.eventsSubject.value;
    const updatedEvents = [...currentEvents, newEvent];

    this.updateEventsAndPersist(updatedEvents);
  }

  updateEvent(id: string, eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): boolean {
    const currentEvents = this.eventsSubject.value;
    const eventIndex = currentEvents.findIndex(event => event.id === id);

    if (eventIndex === -1) {
      return false;
    }

    const existingEvent = currentEvents[eventIndex];
    const updatedEvent: Event = {
      ...eventData,
      id,
      createdAt: existingEvent.createdAt,
      updatedAt: new Date()
    };

    const updatedEvents = [...currentEvents];
    updatedEvents[eventIndex] = updatedEvent;

    this.updateEventsAndPersist(updatedEvents);
    return true;
  }

  deleteEvent(id: string): boolean {
    const currentEvents = this.eventsSubject.value;
    const filteredEvents = currentEvents.filter(event => event.id !== id);

    if (filteredEvents.length === currentEvents.length) {
      return false;
    }

    this.updateEventsAndPersist(filteredEvents);
    return true;
  }

  getEventById(id: string): Event | undefined {
    return this.eventsSubject.value.find(event => event.id === id);
  }

  searchEvents(query: string): Event[] {
    if (!query.trim()) {
      return this.eventsSubject.value;
    }

    const searchTerm = query.toLowerCase();
    return this.eventsSubject.value.filter(event =>
      event.title.toLowerCase().includes(searchTerm) ||
      (event.location && event.location.toLowerCase().includes(searchTerm)) ||
      (event.description && event.description.toLowerCase().includes(searchTerm))
    );
  }

  filterEventsByMonth(month: number, year: number): Event[] {
    return this.eventsSubject.value.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  }

  getStorageInfo(): { type: 'localStorage' | 'sessionStorage'; quotaExceeded: boolean } {
    return this.localStorageService.getStorageInfo();
  }

  private loadEvents(): void {
    const events = this.localStorageService.loadEvents();
    this.eventsSubject.next(events);
  }

  private updateEventsAndPersist(events: Event[]): void {
    this.eventsSubject.next(events);
    this.localStorageService.saveEvents(events);
  }

  private generateId(): string {
    // Use crypto.randomUUID() if available, fallback to timestamp-based ID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback ID generation
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${randomPart}`;
  }

  private setupCrossTabSync(): void {
    // Listen for custom events from LocalStorageService
    fromEvent(window, 'events-updated').subscribe(() => {
      this.loadEvents();
    });
  }
}