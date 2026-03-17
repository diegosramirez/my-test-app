import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationStateService } from './notification-state.service';
import { NotificationDataSource } from './notification-data-source';
import { StorageAdapter } from './storage-adapter';
import { AppNotification } from '../models/notification.model';

const STORAGE_KEY = 'notification-center-read-status';

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'info', title: 'A', description: 'Desc A', timestamp: new Date().toISOString() },
  { id: 'n2', type: 'warning', title: 'B', description: 'Desc B', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n3', type: 'error', title: 'C', description: 'Desc C', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
];

class MockDataSource extends NotificationDataSource {
  getNotifications() { return of([...MOCK_NOTIFICATIONS]); }
}

class InMemoryStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
}

describe('NotificationStateService', () => {
  let service: NotificationStateService;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: storage },
      ],
    });
    service = TestBed.inject(NotificationStateService);
  });

  it('should load notifications from data source', () => {
    expect(service.notifications().length).toBe(3);
  });

  it('should start with all notifications unread', () => {
    expect(service.unreadCount()).toBe(3);
  });

  it('should mark a single notification as read', () => {
    service.markAsRead('n1');
    expect(service.isRead('n1')).toBe(true);
    expect(service.unreadCount()).toBe(2);
  });

  it('should persist read status to storage', () => {
    service.markAsRead('n1');
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(stored['n1']).toBeTruthy();
  });

  it('should not re-mark already read notification', () => {
    service.markAsRead('n1');
    const ts1 = JSON.parse(storage.getItem(STORAGE_KEY)!)['n1'];
    service.markAsRead('n1');
    const ts2 = JSON.parse(storage.getItem(STORAGE_KEY)!)['n1'];
    expect(ts1).toBe(ts2);
  });

  it('should mark all as read', () => {
    service.markAllAsRead();
    expect(service.unreadCount()).toBe(0);
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(Object.keys(stored).length).toBe(3);
  });

  it('should not change read map if all already read', () => {
    service.markAllAsRead();
    const map1 = storage.getItem(STORAGE_KEY);
    service.markAllAsRead();
    const map2 = storage.getItem(STORAGE_KEY);
    expect(map1).toBe(map2);
  });

  it('should group notifications correctly', () => {
    const grouped = service.groupedNotifications();
    expect(grouped.today.length + grouped.yesterday.length + grouped.older.length).toBe(3);
  });

  it('should restore read status from storage on init', () => {
    const readMap = { n1: new Date().toISOString(), n2: new Date().toISOString() };
    storage.setItem(STORAGE_KEY, JSON.stringify(readMap));

    // Create a new service instance that loads from storage
    const service2 = TestBed.inject(NotificationStateService);
    // Since it's providedIn root, same instance. We need a fresh one.
    // Actually, the singleton was already created. Let's test via a new TestBed.
    TestBed.resetTestingModule();
    const store2 = new InMemoryStorage();
    store2.setItem(STORAGE_KEY, JSON.stringify(readMap));
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: store2 },
      ],
    });
    const fresh = TestBed.inject(NotificationStateService);
    expect(fresh.isRead('n1')).toBe(true);
    expect(fresh.isRead('n2')).toBe(true);
    expect(fresh.unreadCount()).toBe(1);
  });

  it('should handle corrupted storage data gracefully', () => {
    TestBed.resetTestingModule();
    const store2 = new InMemoryStorage();
    store2.setItem(STORAGE_KEY, 'not-json!!!');
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: store2 },
      ],
    });
    const fresh = TestBed.inject(NotificationStateService);
    expect(fresh.unreadCount()).toBe(3);
  });

  it('should handle array as storage data gracefully', () => {
    TestBed.resetTestingModule();
    const store2 = new InMemoryStorage();
    store2.setItem(STORAGE_KEY, '[1,2,3]');
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: store2 },
      ],
    });
    const fresh = TestBed.inject(NotificationStateService);
    expect(fresh.unreadCount()).toBe(3);
  });

  it('should prune entries older than 90 days', () => {
    TestBed.resetTestingModule();
    const store2 = new InMemoryStorage();
    const old = new Date(Date.now() - 91 * 86400000).toISOString();
    const recent = new Date().toISOString();
    store2.setItem(STORAGE_KEY, JSON.stringify({ n1: old, n2: recent }));
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: store2 },
      ],
    });
    const fresh = TestBed.inject(NotificationStateService);
    expect(fresh.isRead('n1')).toBe(false); // pruned
    expect(fresh.isRead('n2')).toBe(true);  // kept
  });

  it('should handle storage write failure gracefully (in-memory still works)', () => {
    const failStore = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        NotificationStateService,
        { provide: NotificationDataSource, useClass: MockDataSource },
        { provide: StorageAdapter, useValue: failStore },
      ],
    });
    const fresh = TestBed.inject(NotificationStateService);
    // markAsRead will call persistReadMap which calls setItem which throws,
    // but the in-memory signal should still be updated
    // Actually, looking at the code, the service doesn't try/catch on persist.
    // The StorageAdapter itself handles the try/catch. Let's verify it doesn't crash.
    expect(() => fresh.markAsRead('n1')).not.toThrow();
  });
});
