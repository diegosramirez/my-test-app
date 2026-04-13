import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormWizardService } from '../../services/form-wizard.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WizardStep, WizardFormData } from '../../models/wizard-form-data.interface';
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component';

@Component({
  selector: 'app-wizard-container',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ProgressIndicatorComponent],
  template: `
    <div class="wizard-container">
      <div class="wizard-header">
        <h1>Application Form</h1>
        <app-progress-indicator
          [currentStep]="currentStep"
          [completedSteps]="completedSteps"
        ></app-progress-indicator>
      </div>

      <main class="wizard-main" role="main">
        <router-outlet></router-outlet>
      </main>

      <nav class="wizard-navigation" role="navigation" aria-label="Form navigation">
        <button
          type="button"
          class="nav-button secondary"
          [disabled]="!canGoBack"
          (click)="goBack()"
          *ngIf="currentStep !== 'personal'"
        >
          ← Back
        </button>

        <div class="nav-spacer" *ngIf="currentStep === 'personal'"></div>

        <button
          type="button"
          class="nav-button primary"
          [disabled]="!canGoForward"
          (click)="goForward()"
          *ngIf="currentStep !== 'review'"
        >
          Next →
        </button>
      </nav>

      <!-- Session restore notification -->
      <div
        *ngIf="showSessionRestoreNotification"
        class="session-restore-notification"
        role="alert"
        aria-live="polite"
      >
        <div class="notification-content">
          <span class="notification-icon">🔄</span>
          <div class="notification-text">
            <strong>Welcome back!</strong> We've restored your previous session from {{ sessionAge }}.
            <button
              type="button"
              class="link-button"
              (click)="startFresh()"
            >
              Start fresh instead
            </button>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="dismissNotification()"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      display: flex;
      flex-direction: column;
    }

    .wizard-header {
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 2rem 0;
    }

    .wizard-header h1 {
      text-align: center;
      color: #212529;
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 2rem 0;
    }

    .wizard-main {
      flex: 1;
      background: white;
      margin: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .wizard-navigation {
      background: white;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #dee2e6;
      box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
    }

    .nav-button {
      padding: 0.75rem 2rem;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      border: none;
      min-width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .nav-button.primary {
      background-color: #007bff;
      color: white;
    }

    .nav-button.primary:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .nav-button.primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
      opacity: 0.65;
    }

    .nav-button.secondary {
      background-color: transparent;
      color: #6c757d;
      border: 1px solid #ced4da;
    }

    .nav-button.secondary:hover:not(:disabled) {
      background-color: #e9ecef;
      color: #495057;
    }

    .nav-button.secondary:disabled {
      color: #adb5bd;
      border-color: #dee2e6;
      cursor: not-allowed;
      opacity: 0.65;
    }

    .nav-button:focus {
      outline: 0;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .nav-spacer {
      min-width: 120px;
    }

    .session-restore-notification {
      position: fixed;
      top: 1rem;
      right: 1rem;
      background: #d1ecf1;
      border: 1px solid #bee5eb;
      border-left: 4px solid #17a2b8;
      border-radius: 0.375rem;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification-content {
      padding: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #0c5460;
    }

    .notification-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .notification-text {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .link-button {
      background: none;
      border: none;
      color: #17a2b8;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      margin-left: 0.5rem;
    }

    .link-button:hover {
      color: #138496;
    }

    .close-button {
      background: none;
      border: none;
      color: #0c5460;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.8;
    }

    .close-button:hover {
      opacity: 1;
    }

    @media (max-width: 768px) {
      .wizard-container {
        background: white;
      }

      .wizard-header h1 {
        font-size: 2rem;
      }

      .wizard-main {
        margin: 1rem;
        box-shadow: none;
        border-radius: 0;
      }

      .wizard-navigation {
        padding: 1rem;
        position: sticky;
        bottom: 0;
      }

      .nav-button {
        min-width: 100px;
        padding: 0.875rem 1.5rem;
      }

      .nav-spacer {
        min-width: 100px;
      }

      .session-restore-notification {
        top: auto;
        bottom: 6rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .nav-button {
        border-width: 2px;
      }

      .wizard-header,
      .wizard-main,
      .wizard-navigation {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .nav-button {
        transition: none;
      }

      .session-restore-notification {
        animation: none;
      }
    }
  `]
})
export class WizardContainerComponent implements OnInit, OnDestroy {
  currentStep: WizardStep = WizardStep.PERSONAL;
  completedSteps: WizardStep[] = [];
  canGoForward = false;
  canGoBack = false;

  showSessionRestoreNotification = false;
  sessionAge = '';

  private destroy$ = new Subject<void>();
  private formData: WizardFormData | null = null;

  constructor(
    private formWizardService: FormWizardService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.subscribeToFormData();
    this.subscribeToRouteChanges();
    this.checkForSessionRestore();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToFormData(): void {
    this.formWizardService.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.formData = data;
      this.completedSteps = data.completedSteps;
      this.updateNavigationState();
    });

    this.formWizardService.currentStep$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(step => {
      this.currentStep = step;
      this.updateNavigationState();
    });
  }

  private subscribeToRouteChanges(): void {
    this.route.firstChild?.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const step = params['step'] as WizardStep;
      if (step && Object.values(WizardStep).includes(step)) {
        this.formWizardService.setCurrentStep(step);
      }
    });
  }

  private checkForSessionRestore(): void {
    if (this.formData) {
      const lastUpdated = this.formData.timestamps.lastUpdated;
      const now = new Date();
      const ageInMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));

      if (ageInMinutes > 1) { // Show notification if data is older than 1 minute
        this.showSessionRestoreNotification = true;
        this.sessionAge = this.formatSessionAge(ageInMinutes);

        // Track session restore
        this.analyticsService.trackSessionRestored(
          this.getStepNumber(this.currentStep),
          ageInMinutes,
          this.formData.sessionId
        );

        // Auto-dismiss notification after 10 seconds
        setTimeout(() => {
          this.showSessionRestoreNotification = false;
        }, 10000);
      }
    }
  }

  private formatSessionAge(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  }

  private updateNavigationState(): void {
    if (!this.formData) return;

    this.canGoBack = this.currentStep !== WizardStep.PERSONAL;

    switch (this.currentStep) {
      case WizardStep.PERSONAL:
        this.canGoForward = this.formWizardService.isStepValid(WizardStep.PERSONAL);
        break;
      case WizardStep.ADDRESS:
        this.canGoForward = this.formWizardService.isStepValid(WizardStep.ADDRESS);
        break;
      case WizardStep.REVIEW:
        this.canGoForward = false; // No forward navigation from review
        break;
    }
  }

  goBack(): void {
    if (!this.canGoBack) return;

    switch (this.currentStep) {
      case WizardStep.ADDRESS:
        this.router.navigate(['/form-wizard/personal']);
        break;
      case WizardStep.REVIEW:
        this.router.navigate(['/form-wizard/address']);
        break;
    }
  }

  goForward(): void {
    if (!this.canGoForward) return;

    switch (this.currentStep) {
      case WizardStep.PERSONAL:
        if (this.formWizardService.canAccessStep(WizardStep.ADDRESS)) {
          this.router.navigate(['/form-wizard/address']);
        }
        break;
      case WizardStep.ADDRESS:
        if (this.formWizardService.canAccessStep(WizardStep.REVIEW)) {
          this.router.navigate(['/form-wizard/review']);
        }
        break;
    }
  }

  startFresh(): void {
    this.formWizardService.clearFormData();
    this.router.navigate(['/form-wizard/personal']);
    this.dismissNotification();
  }

  dismissNotification(): void {
    this.showSessionRestoreNotification = false;
  }

  private getStepNumber(step: WizardStep): number {
    switch (step) {
      case WizardStep.PERSONAL:
        return 1;
      case WizardStep.ADDRESS:
        return 2;
      case WizardStep.REVIEW:
        return 3;
      default:
        return 1;
    }
  }
}