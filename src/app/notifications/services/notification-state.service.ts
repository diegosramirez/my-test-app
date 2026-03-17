import { Injectable, signal, computed, inject } from '@angular/core';
import {
  AppNotification,
  NotificationReadMap,
  GroupedNotifications,
} from '../models/notification.model';
import { NotificationDataSource } from './notification-data-source';
import { StorageAdapter } from './storage-adapter';
import { groupByDate } from '../utils/date-utils';

const STORAGE_KEY = 'notification-center-read-status';
const PRUNE_DAYS = 90;

@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private readonly dataSource = inject(NotificationDataSource);
  private readonly storage = inject(StorageAdapter);

  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _readMap = signal<NotificationReadMap>({});

  readonly notifications = this._notifications.asReadonly();
  readonly readMap = this._readMap.asReadonly();

  readonly unreadCount = computed(() => {
    const map = this._readMap();
    return this._notifications().filter((n) => !map[n.id]).length;
  });

  readonly groupedNotifications = computed<GroupedNotifications>(() => {
    return groupByDate(this._notifications());
  });

  constructor() {
    this.loadReadMap();
    this.dataSource.getNotifications().subscribe((notifications) => {
      this._notifications.set(notifications);
    });
  }

  isRead(id: string): boolean {
    return !!this._readMap()[id];
  }

  markAsRead(id: string): void {
    const current = this._readMap();
    if (current[id]) return;
    const updated = { ...current, [id]: new Date().toISOString() };
    this._readMap.set(updated);
    this.persistReadMap(updated);
  }

  markAllAsRead(): void {
    const current = this._readMap();
    const updated = { ...current };
    const now = new Date().toISOString();
    let changed = false;
    for (const n of this._notifications()) {
      if (!updated[n.id]) {
        updated[n.id] = now;
        changed = true;
      }
    }
    if (changed) {
      this._readMap.set(updated);
      this.persistReadMap(updated);
    }
  }

  private loadReadMap(): void {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return;
      }
      const pruned = this.pruneOldEntries(parsed as NotificationReadMap);
      this._readMap.set(pruned);
      this.persistReadMap(pruned);
    } catch {
      // Corrupted data — start fresh
    }
  }

  private pruneOldEntries(map: NotificationReadMap): NotificationReadMap {
    const cutoff = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
    const pruned: NotificationReadMap = {};
    for (const [id, ts] of Object.entries(map)) {
      const time = new Date(ts).getTime();
      if (!isNaN(time) && time >= cutoff) {
        pruned[id] = ts;
      }
    }
    return pruned;
  }

  private persistReadMap(map: NotificationReadMap): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Storage write failed (quota exceeded, private browsing, etc.)
      // Degrade gracefully — in-memory state is still valid
    }
  }
}
