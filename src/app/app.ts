import { Component, signal, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteComponent } from './command-palette/command-palette.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-test-app');
  @ViewChild(CommandPaletteComponent) commandPalette!: CommandPaletteComponent;

  get isMac(): boolean {
    // TODO: SSR guard
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  openPalette(): void {
    this.commandPalette.open('ui');
  }
}
