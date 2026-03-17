import { TestBed } from '@angular/core/testing';
import { CommandRegistryService } from './command-registry.service';
import { Command } from './command.model';

describe('CommandRegistryService', () => {
  let service: CommandRegistryService;

  const makeCommand = (id: string, label = 'Test'): Command => ({
    id,
    label,
    category: 'navigation',
    keywords: [],
    execute: () => {},
  });

  beforeEach(() => {
    service = TestBed.inject(CommandRegistryService);
  });

  it('should register and retrieve a command', () => {
    const cmd = makeCommand('test');
    service.register(cmd);
    expect(service.getById('test')).toBe(cmd);
  });

  it('should return all registered commands', () => {
    service.register(makeCommand('a'));
    service.register(makeCommand('b'));
    expect(service.getAll().length).toBe(2);
  });

  it('should return undefined for unknown id', () => {
    expect(service.getById('nonexistent')).toBeUndefined();
  });

  it('should unregister a command', () => {
    service.register(makeCommand('a'));
    service.unregister('a');
    expect(service.getById('a')).toBeUndefined();
    expect(service.getAll().length).toBe(0);
  });

  it('should overwrite command with same id', () => {
    service.register(makeCommand('a', 'First'));
    service.register(makeCommand('a', 'Second'));
    expect(service.getById('a')!.label).toBe('Second');
    expect(service.getAll().length).toBe(1);
  });

  it('should return empty array when no commands registered', () => {
    expect(service.getAll()).toEqual([]);
  });
});
