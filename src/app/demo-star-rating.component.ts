import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { StarRatingComponent, RatingChangeEvent } from './shared/components/star-rating';

@Component({
  selector: 'app-demo-star-rating',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StarRatingComponent],
  template: `
    <div class="demo-container">
      <h1>Star Rating Component Demo</h1>

      <!-- Interactive Rating Example -->
      <section class="demo-section">
        <h2>Interactive Rating</h2>
        <p>Click stars to rate, use keyboard navigation (Tab, Enter, Arrow keys)</p>

        <div class="rating-example">
          <label for="interactive-rating">Rate this content:</label>
          <app-star-rating
            id="interactive-rating"
            [currentRating]="interactiveRating"
            [contentId]="'demo-content-1'"
            (ratingChange)="onRatingChange($event)">
          </app-star-rating>
        </div>

        <div class="rating-info">
          Current Rating: {{ interactiveRating }}/5.0
        </div>
      </section>

      <!-- Readonly Rating Example -->
      <section class="demo-section">
        <h2>Readonly Rating (Average Display)</h2>
        <p>Shows average ratings with half-star precision</p>

        <div class="rating-examples">
          <div class="rating-example" *ngFor="let rating of readonlyExamples">
            <span class="rating-label">{{ rating.label }}:</span>
            <app-star-rating
              [currentRating]="rating.value"
              [readonly]="true">
            </app-star-rating>
          </div>
        </div>
      </section>

      <!-- Forms Integration Example -->
      <section class="demo-section">
        <h2>Forms Integration</h2>
        <p>Component works with Angular Reactive Forms</p>

        <form [formGroup]="ratingForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="product-rating">Product Rating:</label>
            <app-star-rating
              id="product-rating"
              formControlName="rating"
              [contentId]="'product-123'">
            </app-star-rating>

            <div class="form-validation" *ngIf="ratingForm.get('rating')?.invalid && ratingForm.get('rating')?.touched">
              Please provide a rating
            </div>
          </div>

          <button type="submit" [disabled]="ratingForm.invalid">
            Submit Rating
          </button>
        </form>

        <div class="form-output" *ngIf="submittedRating !== null">
          Submitted Rating: {{ submittedRating }}/5.0
        </div>
      </section>

      <!-- Accessibility Features -->
      <section class="demo-section">
        <h2>Accessibility Features</h2>
        <ul>
          <li>Full keyboard navigation (Tab, Enter, Space, Arrow keys)</li>
          <li>Screen reader support with ARIA labels</li>
          <li>WCAG 2.1 AA compliant focus indicators</li>
          <li>Touch-friendly 44px minimum touch targets</li>
          <li>High contrast mode support</li>
          <li>Reduced motion support</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .demo-section {
      margin: 2rem 0;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    .demo-section h2 {
      margin-top: 0;
      color: #1f2937;
    }

    .rating-example {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1rem 0;
    }

    .rating-examples {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .rating-label {
      min-width: 120px;
      font-weight: 500;
    }

    .rating-info {
      margin-top: 0.5rem;
      font-weight: 500;
      color: #374151;
    }

    .form-group {
      margin: 1rem 0;
    }

    .form-validation {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-output {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: #f3f4f6;
      border-radius: 4px;
      font-weight: 500;
    }

    button[type="submit"] {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    button[type="submit"]:disabled {
      background-color: #d1d5db;
      cursor: not-allowed;
    }

    button[type="submit"]:hover:not(:disabled) {
      background-color: #2563eb;
    }

    ul {
      padding-left: 1.5rem;
    }

    li {
      margin: 0.5rem 0;
    }
  `]
})
export class DemoStarRatingComponent {
  interactiveRating = 0;
  submittedRating: number | null = null;

  readonlyExamples = [
    { label: 'No ratings yet', value: 0 },
    { label: 'Poor (1.5/5)', value: 1.5 },
    { label: 'Average (2.7/5)', value: 2.7 },
    { label: 'Good (3.8/5)', value: 3.8 },
    { label: 'Excellent (4.9/5)', value: 4.9 },
    { label: 'Perfect (5.0/5)', value: 5.0 }
  ];

  ratingForm = new FormGroup({
    rating: new FormControl(0, { nonNullable: true })
  });

  onRatingChange(event: RatingChangeEvent): void {
    console.log('Rating changed:', event);
    this.interactiveRating = event.rating;
  }

  onSubmit(): void {
    if (this.ratingForm.valid) {
      this.submittedRating = this.ratingForm.value.rating!;
      console.log('Form submitted with rating:', this.submittedRating);
    }
  }
}