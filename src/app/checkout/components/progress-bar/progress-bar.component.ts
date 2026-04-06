import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutStep } from '../../models/checkout.models';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="progress-bar" role="tablist" aria-label="Checkout Progress">
      <ol class="progress-steps">
        <li
          *ngFor="let step of steps; trackBy: trackByStepId"
          class="progress-step"
          [class.completed]="step.completed"
          [class.current]="step.id === currentStep"
          [class.available]="isStepAvailable(step)"
          role="tab"
          [attr.aria-selected]="step.id === currentStep"
          [attr.aria-label]="getStepAriaLabel(step)"
        >
          <button
            class="step-button"
            [disabled]="!isStepClickable(step)"
            (click)="onStepClick(step.id)"
            [attr.aria-label]="getStepButtonAriaLabel(step)"
          >
            <span class="step-number" [attr.aria-hidden]="true">
              <span *ngIf="step.completed" class="step-check">✓</span>
              <span *ngIf="!step.completed">{{ step.id }}</span>
            </span>
            <span class="step-label">{{ step.label }}</span>
          </button>
          <div
            *ngIf="step.id < steps.length"
            class="step-connector"
            [class.completed]="step.completed"
            [attr.aria-hidden]="true"
          ></div>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .progress-bar {
      padding: 2rem 0;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .progress-steps {
      display: flex;
      justify-content: center;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      max-width: 600px;
      margin: 0 auto;
    }

    .progress-step {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
    }

    .step-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .step-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .step-button:not(:disabled):hover {
      background-color: rgba(0, 123, 255, 0.1);
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      font-weight: bold;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      background-color: #dee2e6;
      color: #6c757d;
      transition: all 0.2s ease;
    }

    .progress-step.completed .step-number {
      background-color: #28a745;
      color: white;
    }

    .progress-step.current .step-number {
      background-color: #007bff;
      color: white;
    }

    .step-check {
      font-size: 1rem;
      font-weight: bold;
    }

    .step-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #495057;
      text-align: center;
    }

    .progress-step.current .step-label {
      color: #007bff;
      font-weight: 600;
    }

    .progress-step.completed .step-label {
      color: #28a745;
    }

    .step-connector {
      flex: 1;
      height: 2px;
      background-color: #dee2e6;
      margin: 0 0.5rem;
      transition: background-color 0.2s ease;
    }

    .step-connector.completed {
      background-color: #28a745;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .progress-steps {
        padding: 0 1rem;
      }

      .step-button {
        min-width: 80px;
      }

      .step-label {
        font-size: 0.75rem;
      }

      .step-number {
        width: 1.5rem;
        height: 1.5rem;
        font-size: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .step-label {
        display: none;
      }

      .step-button {
        min-width: 60px;
      }
    }

    /* Focus styles for accessibility */
    .step-button:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    /* Screen reader only text */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class ProgressBarComponent {
  @Input() steps: CheckoutStep[] = [];
  @Input() currentStep = 1;
  @Output() stepClick = new EventEmitter<number>();

  onStepClick(stepId: number): void {
    if (this.isStepClickable(this.steps.find(s => s.id === stepId)!)) {
      this.stepClick.emit(stepId);
    }
  }

  isStepAvailable(step: CheckoutStep): boolean {
    // First step is always available
    if (step.id === 1) return true;

    // Other steps are available if previous steps are completed
    const previousStep = this.steps.find(s => s.id === step.id - 1);
    return previousStep ? previousStep.completed : false;
  }

  isStepClickable(step: CheckoutStep): boolean {
    return step.completed || step.id === this.currentStep || this.isStepAvailable(step);
  }

  getStepAriaLabel(step: CheckoutStep): string {
    let status = '';
    if (step.completed) status = 'completed';
    else if (step.id === this.currentStep) status = 'current';
    else status = 'upcoming';

    return `Step ${step.id}: ${step.label} (${status})`;
  }

  getStepButtonAriaLabel(step: CheckoutStep): string {
    const clickable = this.isStepClickable(step) ? 'Go to' : 'Step';
    return `${clickable} ${step.label}`;
  }

  trackByStepId(index: number, step: CheckoutStep): number {
    return step.id;
  }
}