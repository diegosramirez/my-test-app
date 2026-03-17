import { describe, it, expect } from 'vitest';
import { StaticNotificationDataSource } from './static-notification-data-source';
import { firstValueFrom } from 'rxjs';

describe('StaticNotificationDataSource', () => {
  it('should return seed notifications', async () => {
    const ds = new StaticNotificationDataSource();
    const notifications = await firstValueFrom(ds.getNotifications());
    expect(notifications.length).toBeGreaterThanOrEqual(10);
  });

  it('should return a copy (not the original array)', async () => {
    const ds = new StaticNotificationDataSource();
    const a = await firstValueFrom(ds.getNotifications());
    const b = await firstValueFrom(ds.getNotifications());
    expect(a).not.toBe(b);
  });

  it('each notification should have required fields', async () => {
    const ds = new StaticNotificationDataSource();
    const notifications = await firstValueFrom(ds.getNotifications());
    for (const n of notifications) {
      expect(n.id).toBeTruthy();
      expect(n.type).toMatch(/^(info|warning|success|error)$/);
      expect(n.title).toBeTruthy();
      expect(n.description).toBeTruthy();
      expect(n.timestamp).toBeTruthy();
      expect(() => new Date(n.timestamp)).not.toThrow();
    }
  });
});
