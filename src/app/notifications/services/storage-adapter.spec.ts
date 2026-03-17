import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageAdapter } from './storage-adapter';

describe('StorageAdapter', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new StorageAdapter();
    localStorage.clear();
  });

  it('should get item from localStorage', () => {
    localStorage.setItem('key', 'value');
    expect(adapter.getItem('key')).toBe('value');
  });

  it('should return null for missing key', () => {
    expect(adapter.getItem('missing')).toBeNull();
  });

  it('should set item in localStorage', () => {
    adapter.setItem('key', 'value');
    expect(localStorage.getItem('key')).toBe('value');
  });

  it('should remove item from localStorage', () => {
    localStorage.setItem('key', 'value');
    adapter.removeItem('key');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('should return null when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(adapter.getItem('key')).toBeNull();
    vi.restoreAllMocks();
  });

  it('should not throw when setItem fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => adapter.setItem('key', 'val')).not.toThrow();
    expect(spy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('should not throw when removeItem fails', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error(); });
    expect(() => adapter.removeItem('key')).not.toThrow();
    vi.restoreAllMocks();
  });
});
