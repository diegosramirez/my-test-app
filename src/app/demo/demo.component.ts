import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarRatingComponent, StarSize } from '../shared/components/star-rating';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  template: `
    <div class="demo-container">
      <h1>Star Rating Component Demo</h1>

      <section class="demo-section">
        <h2>Interactive Ratings</h2>
        <div class="rating-example">
          <h3>Medium Size (Default)</h3>
          <app-star-rating
            [rating]="interactiveRating()"
            [showNumeric]="true"
            (ratingChange)="onRatingChange($event)"
            contentId="demo-medium">
          </app-star-rating>
          <p>Current rating: {{ interactiveRating() }}</p>
        </div>

        <div class="rating-example">
          <h3>Small Size</h3>
          <app-star-rating
            [rating]="smallRating()"
            size="small"
            [showNumeric]="true"
            (ratingChange)="onSmallRatingChange($event)"
            contentId="demo-small">
          </app-star-rating>
          <p>Current rating: {{ smallRating() }}</p>
        </div>

        <div class="rating-example">
          <h3>Large Size</h3>
          <app-star-rating
            [rating]="largeRating()"
            size="large"
            [showNumeric]="true"
            (ratingChange)="onLargeRatingChange($event)"
            contentId="demo-large">
          </app-star-rating>
          <p>Current rating: {{ largeRating() }}</p>
        </div>
      </section>

      <section class="demo-section">
        <h2>Readonly Display (Average Ratings)</h2>

        <div class="rating-example">
          <h3>Whole Number Rating</h3>
          <app-star-rating
            [rating]="4"
            [readonly]="true"
            [showNumeric]="true"
            contentId="readonly-whole">
          </app-star-rating>
        </div>

        <div class="rating-example">
          <h3>Half Star Rating (4.5)</h3>
          <app-star-rating
            [rating]="4.5"
            [readonly]="true"
            [showNumeric]="true"
            contentId="readonly-half">
          </app-star-rating>
        </div>

        <div class="rating-example">
          <h3>Decimal Rating (3.2)</h3>
          <app-star-rating
            [rating]="3.2"
            [readonly]="true"
            [showNumeric]="true"
            contentId="readonly-decimal">
          </app-star-rating>
        </div>

        <div class="rating-example">
          <h3>Low Rating (1.8)</h3>
          <app-star-rating
            [rating]="1.8"
            [readonly]="true"
            [showNumeric]="true"
            contentId="readonly-low">
          </app-star-rating>
        </div>
      </section>

      <section class="demo-section">
        <h2>Without Numeric Display</h2>

        <div class="rating-example">
          <h3>Interactive (No Numbers)</h3>
          <app-star-rating
            [rating]="noNumericRating()"
            [showNumeric]="false"
            (ratingChange)="onNoNumericRatingChange($event)"
            contentId="no-numeric">
          </app-star-rating>
          <p>Current rating: {{ noNumericRating() }}</p>
        </div>

        <div class="rating-example">
          <h3>Readonly (No Numbers)</h3>
          <app-star-rating
            [rating]="3.5"
            [readonly]="true"
            [showNumeric]="false"
            contentId="readonly-no-numeric">
          </app-star-rating>
        </div>
      </section>

      <section class="demo-section">
        <h2>Accessibility & Keyboard Navigation</h2>
        <div class="rating-example">
          <h3>Keyboard Accessible Rating</h3>
          <p>Focus the component below and use:</p>
          <ul>
            <li>Arrow keys to navigate</li>
            <li>Number keys (1-5) to set rating</li>
            <li>Home/End for min/max values</li>
            <li>Enter/Space to confirm</li>
          </ul>
          <app-star-rating
            [rating]="keyboardRating()"
            [showNumeric]="true"
            (ratingChange)="onKeyboardRatingChange($event)"
            contentId="keyboard-demo">
          </app-star-rating>
          <p>Current rating: {{ keyboardRating() }}</p>
        </div>
      </section>

      <section class="demo-section">
        <h2>Event Tracking</h2>
        <div class="rating-example">
          <h3>Rating with Event Logging</h3>
          <app-star-rating
            [rating]="trackingRating()"
            [showNumeric]="true"
            (ratingChange)="onTrackingRatingChange($event)"
            (hover)="onHover($event)"
            contentId="tracking-demo">
          </app-star-rating>
          <div class="event-log">
            <h4>Event Log:</h4>
            <ul>
              <li *ngFor="let event of eventLog()">{{ event }}</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .demo-section {
      margin-bottom: 3rem;
      padding: 2rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    }

    .demo-section h2 {
      margin-top: 0;
      color: #1f2937;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5rem;
    }

    .rating-example {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .rating-example h3 {
      margin-top: 0;
      color: #374151;
      font-size: 1.1rem;
    }

    .rating-example p {
      margin: 1rem 0 0 0;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .event-log {
      margin-top: 1rem;
      padding: 1rem;
      background: #f3f4f6;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }

    .event-log h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #374151;
    }

    .event-log ul {
      margin: 0;
      padding-left: 1rem;
      list-style-type: disc;
    }

    .event-log li {
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }

    ul {
      margin: 1rem 0;
    }

    li {
      margin-bottom: 0.5rem;
    }

    @media (max-width: 768px) {
      .demo-container {
        padding: 1rem;
      }

      .demo-section {
        padding: 1rem;
      }

      .rating-example {
        padding: 1rem;
      }
    }
  `]
})
export class DemoComponent {
  interactiveRating = signal(0);
  smallRating = signal(2);
  largeRating = signal(3);
  noNumericRating = signal(1);
  keyboardRating = signal(0);
  trackingRating = signal(0);
  eventLog = signal<string[]>([]);

  onRatingChange(rating: number): void {
    this.interactiveRating.set(rating);
  }

  onSmallRatingChange(rating: number): void {
    this.smallRating.set(rating);
  }

  onLargeRatingChange(rating: number): void {
    this.largeRating.set(rating);
  }

  onNoNumericRatingChange(rating: number): void {
    this.noNumericRating.set(rating);
  }

  onKeyboardRatingChange(rating: number): void {
    this.keyboardRating.set(rating);
  }

  onTrackingRatingChange(rating: number): void {
    this.trackingRating.set(rating);
    this.addEvent(`Rating changed to: ${rating}`);
  }

  onHover(rating: number): void {
    this.addEvent(`Hovered over: ${rating} stars`);
  }

  private addEvent(event: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const eventWithTime = `${timestamp}: ${event}`;

    this.eventLog.update(events => {
      const newEvents = [eventWithTime, ...events];
      return newEvents.slice(0, 10); // Keep only last 10 events
    });
  }
}