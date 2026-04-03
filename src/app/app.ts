import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NewsletterSubscriptionComponent } from './newsletter/newsletter-subscription.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NewsletterSubscriptionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-test-app');
}
