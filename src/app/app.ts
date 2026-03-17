import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationBellComponent } from './notifications/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationBellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-test-app');
}
