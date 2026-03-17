import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isToday, isYesterday, formatRelativeTime, groupByDate, getStartOfDay } from './date-utils';
import { AppNotification } from '../models/notification.model';

describe('date-utils', () => {
  describe('getStartOfDay', () => {
    it('should return midnight of the given date', () => {
      const d = new Date(2026, 2, 17, 14, 30, 45);
      const result = getStartOfDay(d);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(17);
    });

    it('should not mutate the input date', () => {
      const d = new Date(2026, 2, 17, 14, 30);
      getStartOfDay(d);
      expect(d.getHours()).toBe(14);
    });
  });

  describe('isToday', () => {
    it('should return true for a date today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return true for start of today', () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      expect(isToday(start)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for a date yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      expect(isYesterday(new Date())).toBe(false);
    });

    it('should return false for two days ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(12, 0, 0, 0);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('should return true for start of yesterday', () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      expect(isYesterday(startOfYesterday)).toBe(true);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for times less than 60 seconds ago', () => {
      const iso = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatRelativeTime(iso)).toBe('just now');
    });

    it('should return "just now" for future timestamps', () => {
      const iso = new Date(Date.now() + 60000).toISOString();
      expect(formatRelativeTime(iso)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(iso)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const iso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(iso)).toBe('3h ago');
    });

    it('should return "Yesterday" for 1 day ago', () => {
      const iso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(iso)).toBe('Yesterday');
    });

    it('should return days ago for 2-6 days', () => {
      const iso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(iso)).toBe('3d ago');
    });

    it('should return formatted date for 7+ days', () => {
      const iso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(iso);
      // Should be a locale date string like "Mar 7"
      expect(result).toBeTruthy();
      expect(result).not.toContain('ago');
    });
  });

  describe('groupByDate', () => {
    it('should group notifications into today, yesterday, older', () => {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const notifications: AppNotification[] = [
        { id: '1', type: 'info', title: 'T', description: 'D', timestamp: new Date(now - 1000).toISOString() },
        { id: '2', type: 'info', title: 'T', description: 'D', timestamp: new Date(now - DAY).toISOString() },
        { id: '3', type: 'info', title: 'T', description: 'D', timestamp: new Date(now - 3 * DAY).toISOString() },
      ];

      const result = groupByDate(notifications);
      expect(result.today.length).toBeGreaterThanOrEqual(1);
      expect(result.older.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty arrays when no notifications', () => {
      const result = groupByDate([]);
      expect(result.today).toEqual([]);
      expect(result.yesterday).toEqual([]);
      expect(result.older).toEqual([]);
    });
  });
});
