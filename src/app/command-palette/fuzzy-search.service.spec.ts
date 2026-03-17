import { TestBed } from '@angular/core/testing';
import { FuzzySearchService } from './fuzzy-search.service';
import { Command } from './command.model';

describe('FuzzySearchService', () => {
  let service: FuzzySearchService;

  const makeCommand = (id: string, label: string, keywords: string[] = []): Command => ({
    id,
    label,
    category: 'navigation',
    keywords,
    execute: () => {},
  });

  const commands: Command[] = [
    makeCommand('nav:dashboard', 'Go to Dashboard', ['home', 'main']),
    makeCommand('nav:profile', 'Go to Profile', ['account', 'user']),
    makeCommand('nav:settings', 'Go to Settings', ['preferences', 'config', 'configuration']),
    makeCommand('nav:help', 'Go to Help', ['support', 'docs', 'documentation', 'faq']),
    makeCommand('action:dark-mode', 'Toggle Dark Mode', ['theme', 'light', 'dark', 'appearance']),
  ];

  beforeEach(() => {
    service = TestBed.inject(FuzzySearchService);
  });

  it('should return empty array for empty query', () => {
    expect(service.search('', commands)).toEqual([]);
  });

  it('should return empty array for whitespace-only query', () => {
    expect(service.search('   ', commands)).toEqual([]);
  });

  it('should find exact label match', () => {
    const results = service.search('Go to Dashboard', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.id).toBe('nav:dashboard');
  });

  it('should find partial label match', () => {
    const results = service.search('Dashboard', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.id).toBe('nav:dashboard');
  });

  it('should match against keywords', () => {
    const results = service.search('preferences', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.id).toBe('nav:settings');
  });

  it('should match misspelled/partial queries (fuzzy)', () => {
    const results = service.search('drk mod', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.command.id === 'action:dark-mode')).toBe(true);
  });

  it('should be case insensitive', () => {
    const results = service.search('DASHBOARD', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.id).toBe('nav:dashboard');
  });

  it('should return zero results for non-matching query', () => {
    const results = service.search('xyznonexistent', commands);
    expect(results.length).toBe(0);
  });

  it('should sort results by score descending', () => {
    const results = service.search('Go to', commands);
    expect(results.length).toBe(4); // all nav commands
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('should cap results at 20', () => {
    const manyCommands: Command[] = [];
    for (let i = 0; i < 30; i++) {
      manyCommands.push(makeCommand(`cmd-${i}`, `Command ${i}`, ['test']));
    }
    const results = service.search('Command', manyCommands);
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('should only return results with score > 0', () => {
    const results = service.search('dash', commands);
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it('should give prefix matches higher scores', () => {
    const cmds = [
      makeCommand('a', 'settings page', []),
      makeCommand('b', 'Go to Settings', ['settings']),
    ];
    const results = service.search('settings', cmds);
    expect(results.length).toBe(2);
    // The one where 'settings' is a prefix of label should score higher
    expect(results[0].command.id).toBe('a');
  });

  it('should search empty command list', () => {
    expect(service.search('test', [])).toEqual([]);
  });
});
