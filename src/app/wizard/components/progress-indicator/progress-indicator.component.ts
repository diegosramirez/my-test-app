import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStep } from '../../models/wizard-form-data.interface';

export interface ProgressStep {
  step: WizardStep;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="progress-indicator" role="navigation" aria-label="Form progress">
      <ol class="progress-steps" [attr.aria-current]="currentStepLabel">
        <li
          *ngFor="let progressStep of steps; let i = index"
          class="progress-step"
          [class.completed]="progressStep.isCompleted"
          [class.current]="progressStep.isCurrent"
          [class.upcoming]="!progressStep.isCompleted && !progressStep.isCurrent"
          [attr.aria-current]="progressStep.isCurrent ? 'step' : null"
        >
          <div class="step-content">
            <div class="step-indicator">
              <span *ngIf="progressStep.isCompleted" class="check-icon" aria-hidden="true">✓</span>
              <span *ngIf="!progressStep.isCompleted" class="step-number">{{ i + 1 }}</span>
            </div>
            <span class="step-label">{{ progressStep.label }}</span>
          </div>
          <div
            *ngIf="i < steps.length - 1"
            class="step-connector"
            [class.completed]="progressStep.isCompleted"
          ></div>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .progress-indicator {
      margin: 2rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 1;
    }

    .step-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 2;
    }

    .step-indicator {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-bottom: 8px;
      transition: all 0.3s ease;
    }

    .progress-step.completed .step-indicator {
      background-color: #28a745;
      color: white;
      border: 2px solid #28a745;
    }

    .progress-step.current .step-indicator {
      background-color: #007bff;
      color: white;
      border: 2px solid #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }

    .progress-step.upcoming .step-indicator {
      background-color: #e9ecef;
      color: #6c757d;
      border: 2px solid #dee2e6;
    }

    .step-label {
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      color: #495057;
    }

    .progress-step.current .step-label {
      color: #007bff;
      font-weight: 600;
    }

    .progress-step.completed .step-label {
      color: #28a745;
    }

    .step-connector {
      position: absolute;
      top: 20px;
      left: 60%;
      right: -40%;
      height: 2px;
      background-color: #dee2e6;
      z-index: 1;
      transition: background-color 0.3s ease;
    }

    .step-connector.completed {
      background-color: #28a745;
    }

    .check-icon {
      font-size: 1.2rem;
      font-weight: bold;
    }

    .step-number {
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .progress-steps {
        flex-direction: column;
        gap: 1rem;
      }

      .step-connector {
        display: none;
      }

      .progress-step {
        flex-direction: row;
        text-align: left;
      }

      .step-content {
        flex-direction: row;
        align-items: center;
        gap: 1rem;
      }

      .step-indicator {
        margin-bottom: 0;
        margin-right: 1rem;
        width: 32px;
        height: 32px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .step-indicator {
        border-width: 3px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .step-indicator,
      .step-connector {
        transition: none;
      }
    }
  `]
})
export class ProgressIndicatorComponent {
  @Input() currentStep: WizardStep = WizardStep.PERSONAL;
  @Input() completedSteps: WizardStep[] = [];

  get currentStepLabel(): string {
    const stepLabels = {
      [WizardStep.PERSONAL]: 'Personal Information',
      [WizardStep.ADDRESS]: 'Address Information',
      [WizardStep.REVIEW]: 'Review and Submit'
    };
    return stepLabels[this.currentStep];
  }

  get steps(): ProgressStep[] {
    const allSteps = [
      { step: WizardStep.PERSONAL, label: 'Personal' },
      { step: WizardStep.ADDRESS, label: 'Address' },
      { step: WizardStep.REVIEW, label: 'Review' }
    ];

    return allSteps.map(({ step, label }) => ({
      step,
      label,
      isCompleted: this.completedSteps.includes(step),
      isCurrent: this.currentStep === step
    }));
  }
}