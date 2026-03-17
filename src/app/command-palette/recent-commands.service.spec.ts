import { TestBed } from '@angular/core/testing';
import { RecentCommandsService } from './recent-commands.service';
import { CommandRegistryService } from './command-registry.service';
import { Command } from './command.model';

describe('RecentCommandsService', () => {
  let service: RecentCommandsService;
  let registry: CommandRegistryService;

  const makeCommand = (id: string): Command => ({
    id,
    label: `Command ${id}`,
    category: 'navigation',
    keywords: [],
    execute: () => {},
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    registry = TestBed.inject(CommandRegistryService);
    service = TestBed.inject(RecentCommandsService);
  });

  it('should return empty recent list initially', () => {
    expect(service.getRecent()).toEqual([]);
  });

  it('should push and retrieve recent command', () => {
    registry.register(makeCommand('a'));
    service.pushRecent('a');
    const recent = service.getRecent();
    expect(recent.length).toBe(1);
    expect(recent[0].id).toBe('a');
  });

  it('should deduplicate: most recent first', () => {
    registry.register(makeCommand('a'));
    registry.register(makeCommand('b'));
    service.pushRecent('a');
    service.pushRecent('b');
    service.pushRecent('a');
    const recent = service.getRecent();
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('a');
    expect(recent[1].id).toBe('b');
  });

  it('should cap at 5 items', () => {
    for (let i = 0; i < 7; i++) {
      registry.register(makeCommand(`cmd-${i}`));
      service.pushRecent(`cmd-${i}`);
    }
    expect(service.getRecent().length).toBe(5);
  });

  it('should silently drop stale IDs not in registry', () => {
    registry.register(makeCommand('a'));
    service.pushRecent('a');
    service.pushRecent('stale-id');
    registry.unregister('a');
    expect(service.getRecent()).toEqual([]);
  });

  it('should report storage available', () => {
    expect(service.isStorageAvailable()).toBe(true);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('command_palette_recent', '{invalid json[');
    registry.register(makeCommand('a'));
    expect(service.getRecent()).toEqual([]);
  });

  it('should handle non-array localStorage data', () => {
    localStorage.setItem('command_palette_recent', '"just a string"');
    expect(service.getRecent()).toEqual([]);
  });

  it('should filter non-string items from localStorage', () => {
    localStorage.setItem('command_palette_recent', JSON.stringify(['a', 123, null, 'b']));
    registry.register(makeCommand('a'));
    registry.register(makeCommand('b'));
    const recent = service.getRecent();
    expect(recent.length).toBe(2);
  });
});

describe('RecentCommandsService (storage unavailable)', () => {
  let service: RecentCommandsService;

  beforeEach(() => {
    // Make localStorage throw
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === '__storage_test__') {
        throw new Error('storage disabled');
      }
      return originalSetItem.call(localStorage, key, value);
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(RecentCommandsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should report storage unavailable', () => {
    expect(service.isStorageAvailable()).toBe(false);
  });

  it('should return empty recent list when storage unavailable', () => {
    expect(service.getRecent()).toEqual([]);
  });
});
