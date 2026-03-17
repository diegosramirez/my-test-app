import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `<div class="page"><h1>Profile</h1><p>Your profile page.</p></div>`,
  styles: [`.page { padding: 24px; }`],
})
export class ProfileComponent {}
