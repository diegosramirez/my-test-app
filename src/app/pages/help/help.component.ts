import { Component } from '@angular/core';

@Component({
  selector: 'app-help',
  standalone: true,
  template: `<div class="page"><h1>Help</h1><p>Help and documentation.</p></div>`,
  styles: [`.page { padding: 24px; }`],
})
export class HelpComponent {}
