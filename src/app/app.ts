import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NewsletterSubscriptionComponent } from './components/newsletter-subscription.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NewsletterSubscriptionComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Subscription Service Demo');
}
