import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `<div class="page"><h1>Dashboard</h1><p>Welcome to the dashboard.</p></div>`,
  styles: [`.page { padding: 24px; }`],
})
export class DashboardComponent {}
