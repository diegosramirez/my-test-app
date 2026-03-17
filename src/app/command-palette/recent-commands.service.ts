import { Injectable, inject } from '@angular/core';
import { Command } from './command.model';
import { CommandRegistryService } from './command-registry.service';

const STORAGE_KEY = 'command_palette_recent';
const MAX_RECENT = 5;

@Injectable({ providedIn: 'root' })
export class RecentCommandsService {
  private registry = inject(CommandRegistryService);
  private storageAvailable = true;

  constructor() {
    // TODO: SSR guard
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch {
      this.storageAvailable = false;
    }
  }

  isStorageAvailable(): boolean {
    return this.storageAvailable;
  }

  getRecent(): Command[] {
    const ids = this.loadIds();
    const commands: Command[] = [];
    const validIds: string[] = [];

    for (const id of ids) {
      const cmd = this.registry.getById(id);
      if (cmd) {
        commands.push(cmd);
        validIds.push(id);
      }
      // Silently drop stale IDs
    }

    // Clean up stale IDs in storage
    if (validIds.length !== ids.length) {
      this.saveIds(validIds);
    }

    return commands;
  }

  pushRecent(id: string): void {
    const ids = this.loadIds().filter(existingId => existingId !== id);
    ids.unshift(id);
    this.saveIds(ids.slice(0, MAX_RECENT));
  }

  private loadIds(): string[] {
    if (!this.storageAvailable) {
      return [];
    }
    // TODO: SSR guard
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      }
    } catch {
      // Corrupted data or private browsing — ignore
    }
    return [];
  }

  private saveIds(ids: string[]): void {
    if (!this.storageAvailable) {
      return;
    }
    // TODO: SSR guard
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Quota exceeded — ignore
    }
  }
}
