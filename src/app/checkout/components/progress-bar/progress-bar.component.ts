import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutStep } from '../../models/checkout.models';

export interface ProgressStep {
  step: CheckoutStep;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
}

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="progress-bar" role="tablist" aria-label="Checkout Progress">
      <div class="progress-container">
        <div class="progress-track">
          <div
            class="progress-fill"
            [style.width.%]="progressPercentage"
            aria-hidden="true">
          </div>
        </div>

        <div class="steps-container">
          <div
            *ngFor="let progressStep of progressSteps; trackBy: trackByStep"
            class="step-wrapper"
            [class.active]="progressStep.isActive"
            [class.completed]="progressStep.isCompleted"
            [class.clickable]="progressStep.isClickable">

            <button
              class="step-button"
              type="button"
              [disabled]="!progressStep.isClickable"
              [attr.aria-current]="progressStep.isActive ? 'step' : null"
              [attr.aria-describedby]="'step-' + progressStep.step + '-desc'"
              (click)="onStepClick(progressStep.step)"
              (keydown.enter)="onStepClick(progressStep.step)"
              (keydown.space)="onStepClick(progressStep.step)">

              <div class="step-indicator" [attr.aria-hidden]="true">
                <span
                  class="step-icon"
                  [class.check-icon]="progressStep.isCompleted"
                  [class.number-icon]="!progressStep.isCompleted">
                  <svg
                    *ngIf="progressStep.isCompleted"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                  <span
                    *ngIf="!progressStep.isCompleted"
                    class="step-number"
                    aria-hidden="true">
                    {{ getStepNumber(progressStep.step) }}
                  </span>
                </span>
              </div>

              <span class="step-label">{{ progressStep.label }}</span>
            </button>

            <div
              [id]="'step-' + progressStep.step + '-desc'"
              class="sr-only">
              Step {{ getStepNumber(progressStep.step) }}: {{ progressStep.label }}
              <span *ngIf="progressStep.isCompleted">(Completed)</span>
              <span *ngIf="progressStep.isActive">(Current Step)</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,
  styleUrls: ['./progress-bar.component.css']
})
export class ProgressBarComponent implements OnInit, OnChanges {
  @Input() currentStep: CheckoutStep = CheckoutStep.SHIPPING;
  @Input() completedSteps: CheckoutStep[] = [];
  @Input() canNavigateToStep: (step: CheckoutStep) => boolean = () => false;
  @Output() stepClicked = new EventEmitter<CheckoutStep>();

  progressSteps: ProgressStep[] = [
    {
      step: CheckoutStep.SHIPPING,
      label: 'Shipping',
      isActive: false,
      isCompleted: false,
      isClickable: false
    },
    {
      step: CheckoutStep.PAYMENT,
      label: 'Payment',
      isActive: false,
      isCompleted: false,
      isClickable: false
    },
    {
      step: CheckoutStep.SUMMARY,
      label: 'Review',
      isActive: false,
      isCompleted: false,
      isClickable: false
    }
  ];

  get progressPercentage(): number {
    const stepIndex = this.getStepNumber(this.currentStep) - 1;
    return ((stepIndex + 1) / this.progressSteps.length) * 100;
  }

  ngOnInit(): void {
    this.updateProgressSteps();
  }

  ngOnChanges(): void {
    this.updateProgressSteps();
  }

  private updateProgressSteps(): void {
    this.progressSteps = this.progressSteps.map(step => ({
      ...step,
      isActive: step.step === this.currentStep,
      isCompleted: this.completedSteps.includes(step.step),
      isClickable: step.step === CheckoutStep.SHIPPING ||
                   this.completedSteps.includes(step.step) ||
                   this.canNavigateToStep(step.step)
    }));
  }

  getStepNumber(step: CheckoutStep): number {
    const stepOrder = [CheckoutStep.SHIPPING, CheckoutStep.PAYMENT, CheckoutStep.SUMMARY];
    return stepOrder.indexOf(step) + 1;
  }

  trackByStep(index: number, item: ProgressStep): string {
    return item.step;
  }

  onStepClick(step: CheckoutStep): void {
    if (this.canNavigateToStep(step) || step === CheckoutStep.SHIPPING) {
      this.stepClicked.emit(step);
    }
  }
}