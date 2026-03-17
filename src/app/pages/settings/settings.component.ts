import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `<div class="page"><h1>Settings</h1><p>Application settings.</p></div>`,
  styles: [`.page { padding: 24px; }`],
})
export class SettingsComponent {}
