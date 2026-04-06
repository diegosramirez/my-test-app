import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutStep } from '../../models/checkout.models';

interface StepInfo {
  number: CheckoutStep;
  label: string;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
}

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="progress-bar"
      aria-label="Checkout progress"
      role="navigation"
    >
      <ol class="steps">
        @for (step of steps(); track step.number) {
          <li class="step-item" [class]="getStepClasses(step)">
            <button
              type="button"
              class="step-button"
              [disabled]="!step.isAccessible"
              [attr.aria-current]="step.isActive ? 'step' : null"
              [attr.aria-label]="getAriaLabel(step)"
              (click)="onStepClick(step.number)"
            >
              <span class="step-number" [attr.aria-hidden]="true">
                @if (step.isCompleted) {
                  <svg
                    class="checkmark"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                } @else {
                  {{ step.number }}
                }
              </span>
              <span class="step-label">{{ step.label }}</span>
            </button>
            @if (step.number < 3) {
              <div class="step-connector" [attr.aria-hidden]="true"></div>
            }
          </li>
        }
      </ol>
      <div class="progress-text" aria-live="polite" id="progress-status">
        Step {{ currentStep }} of 3: {{ getCurrentStepLabel() }}
      </div>
    </nav>
  `,
  styleUrl: './progress-bar.component.css'
})
export class ProgressBarComponent {
  @Input({ required: true }) currentStep!: CheckoutStep;
  @Input() isStepValid: { [key in CheckoutStep]: boolean } = { 1: false, 2: false, 3: false };

  @Output() stepChange = new EventEmitter<CheckoutStep>();

  private stepLabels = {
    1: 'Shipping',
    2: 'Payment',
    3: 'Review'
  };

  currentStepSignal = signal<CheckoutStep>(1);
  isStepValidSignal = signal<{ [key in CheckoutStep]: boolean }>({ 1: false, 2: false, 3: false });

  steps = computed<StepInfo[]>(() => {
    const current = this.currentStep || this.currentStepSignal();
    const validSteps = this.isStepValid || this.isStepValidSignal();

    return [1, 2, 3].map(stepNumber => {
      const step = stepNumber as CheckoutStep;
      return {
        number: step,
        label: this.stepLabels[step],
        isCompleted: validSteps[step] && step < current,
        isActive: step === current,
        isAccessible: step === 1 || validSteps[step - 1 as CheckoutStep] || step <= current
      };
    });
  });

  ngOnInit() {
    this.currentStepSignal.set(this.currentStep);
    this.isStepValidSignal.set(this.isStepValid);
  }

  ngOnChanges() {
    this.currentStepSignal.set(this.currentStep);
    this.isStepValidSignal.set(this.isStepValid);
  }

  onStepClick(step: CheckoutStep): void {
    const stepInfo = this.steps().find(s => s.number === step);
    if (stepInfo?.isAccessible) {
      this.stepChange.emit(step);
    }
  }

  getStepClasses(step: StepInfo): string {
    const classes = ['step'];
    if (step.isCompleted) classes.push('step--completed');
    if (step.isActive) classes.push('step--active');
    if (!step.isAccessible) classes.push('step--disabled');
    return classes.join(' ');
  }

  getAriaLabel(step: StepInfo): string {
    let label = `Step ${step.number}: ${step.label}`;
    if (step.isCompleted) label += ' (completed)';
    if (step.isActive) label += ' (current)';
    if (!step.isAccessible) label += ' (not available)';
    return label;
  }

  getCurrentStepLabel(): string {
    return this.stepLabels[this.currentStep] || 'Unknown';
  }
}