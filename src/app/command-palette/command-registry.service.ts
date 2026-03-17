import { Injectable } from '@angular/core';
import { Command } from './command.model';

@Injectable({ providedIn: 'root' })
export class CommandRegistryService {
  private commands = new Map<string, Command>();

  register(cmd: Command): void {
    this.commands.set(cmd.id, cmd);
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getById(id: string): Command | undefined {
    return this.commands.get(id);
  }
}
