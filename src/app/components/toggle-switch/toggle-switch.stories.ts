import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';

import { ToggleSwitchComponent } from './toggle-switch.component';
import { ToggleChangeEvent } from '../../shared/toggle.types';

/**
 * Toggle Switch Component Documentation
 *
 * A reusable Angular standalone toggle switch component with smooth animations,
 * accessibility support, and Angular Forms integration.
 *
 * Features:
 * - Smooth sliding animations using CSS transforms
 * - Full keyboard navigation (Space/Enter)
 * - ARIA attributes for screen readers
 * - Support for prefers-reduced-motion
 * - Size variants (small, medium, large)
 * - Angular Forms ControlValueAccessor integration
 * - Event tracking and analytics
 * - High contrast mode support
 * - Minimum 44px touch target for mobile accessibility
 */

@Component({
  selector: 'app-basic-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <h3>Basic Toggle Switch</h3>
    <p>Default toggle switch with medium size</p>
    <app-toggle-switch
      [isChecked]="isChecked"
      (change)="onToggleChange($event)">
    </app-toggle-switch>
    <p>Current state: {{ isChecked ? 'ON' : 'OFF' }}</p>
  `
})
export class BasicToggleStory {
  isChecked = false;

  onToggleChange(event: ToggleChangeEvent): void {
    this.isChecked = event.checked;
    console.log('Toggle changed:', event);
  }
}

@Component({
  selector: 'app-sizes-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <h3>Size Variants</h3>
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <div>
        <label>Small: </label>
        <app-toggle-switch
          size="small"
          [isChecked]="smallChecked"
          (change)="smallChecked = $event.checked">
        </app-toggle-switch>
      </div>

      <div>
        <label>Medium (default): </label>
        <app-toggle-switch
          size="medium"
          [isChecked]="mediumChecked"
          (change)="mediumChecked = $event.checked">
        </app-toggle-switch>
      </div>

      <div>
        <label>Large: </label>
        <app-toggle-switch
          size="large"
          [isChecked]="largeChecked"
          (change)="largeChecked = $event.checked">
        </app-toggle-switch>
      </div>
    </div>
  `
})
export class SizesToggleStory {
  smallChecked = false;
  mediumChecked = true;
  largeChecked = false;
}

@Component({
  selector: 'app-labels-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <h3>With Labels</h3>
    <p>Toggle switch with ON/OFF labels</p>
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <div>
        <label>Small with labels: </label>
        <app-toggle-switch
          size="small"
          [showLabels]="true"
          [isChecked]="smallLabeled"
          (change)="smallLabeled = $event.checked">
        </app-toggle-switch>
      </div>

      <div>
        <label>Medium with labels: </label>
        <app-toggle-switch
          size="medium"
          [showLabels]="true"
          [isChecked]="mediumLabeled"
          (change)="mediumLabeled = $event.checked">
        </app-toggle-switch>
      </div>

      <div>
        <label>Large with labels: </label>
        <app-toggle-switch
          size="large"
          [showLabels]="true"
          [isChecked]="largeLabeled"
          (change)="largeLabeled = $event.checked">
        </app-toggle-switch>
      </div>
    </div>
  `
})
export class LabelsToggleStory {
  smallLabeled = false;
  mediumLabeled = true;
  largeLabeled = false;
}

@Component({
  selector: 'app-disabled-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <h3>Disabled States</h3>
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <div>
        <label>Disabled OFF: </label>
        <app-toggle-switch
          [isChecked]="false"
          [disabled]="true">
        </app-toggle-switch>
      </div>

      <div>
        <label>Disabled ON: </label>
        <app-toggle-switch
          [isChecked]="true"
          [disabled]="true">
        </app-toggle-switch>
      </div>
    </div>
  `
})
export class DisabledToggleStory {}

@Component({
  selector: 'app-forms-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, FormsModule, ReactiveFormsModule],
  template: `
    <h3>Angular Forms Integration</h3>

    <h4>Template-driven Form</h4>
    <form #templateForm="ngForm">
      <div style="margin-bottom: 1rem;">
        <label>Email notifications: </label>
        <app-toggle-switch
          name="emailNotifications"
          [(ngModel)]="templateFormData.emailNotifications">
        </app-toggle-switch>
      </div>

      <div style="margin-bottom: 1rem;">
        <label>SMS notifications: </label>
        <app-toggle-switch
          name="smsNotifications"
          [(ngModel)]="templateFormData.smsNotifications">
        </app-toggle-switch>
      </div>

      <div>
        <strong>Form Data:</strong>
        <pre>{{ templateFormData | json }}</pre>
      </div>
    </form>

    <h4>Reactive Form</h4>
    <form [formGroup]="reactiveForm">
      <div style="margin-bottom: 1rem;">
        <label>Dark mode: </label>
        <app-toggle-switch
          formControlName="darkMode">
        </app-toggle-switch>
      </div>

      <div style="margin-bottom: 1rem;">
        <label>Auto-save: </label>
        <app-toggle-switch
          formControlName="autoSave">
        </app-toggle-switch>
      </div>

      <div style="margin-bottom: 1rem;">
        <button type="button" (click)="disableForm()">Disable Form</button>
        <button type="button" (click)="enableForm()">Enable Form</button>
        <button type="button" (click)="resetForm()">Reset Form</button>
      </div>

      <div>
        <strong>Form Value:</strong>
        <pre>{{ reactiveForm.value | json }}</pre>
        <strong>Form Valid:</strong> {{ reactiveForm.valid }}
      </div>
    </form>
  `
})
export class FormsToggleStory {
  templateFormData = {
    emailNotifications: true,
    smsNotifications: false
  };

  reactiveForm = new FormGroup({
    darkMode: new FormControl(false),
    autoSave: new FormControl(true)
  });

  disableForm(): void {
    this.reactiveForm.disable();
  }

  enableForm(): void {
    this.reactiveForm.enable();
  }

  resetForm(): void {
    this.reactiveForm.reset({
      darkMode: false,
      autoSave: true
    });
  }
}

@Component({
  selector: 'app-accessibility-toggle-story',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <h3>Accessibility Features</h3>
    <p>Test keyboard navigation with Tab, Space, and Enter keys</p>

    <div style="display: flex; flex-direction: column; gap: 2rem; align-items: flex-start;">
      <div>
        <h4>Keyboard Navigation Test</h4>
        <p>Use Tab to focus, Space or Enter to toggle:</p>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <app-toggle-switch
            componentId="accessibility-test-1"
            [isChecked]="accessibilityTest1"
            (change)="accessibilityTest1 = $event.checked">
          </app-toggle-switch>
          <span>Setting 1</span>
        </div>

        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
          <app-toggle-switch
            componentId="accessibility-test-2"
            [isChecked]="accessibilityTest2"
            (change)="accessibilityTest2 = $event.checked">
          </app-toggle-switch>
          <span>Setting 2</span>
        </div>
      </div>

      <div>
        <h4>Screen Reader Announcements</h4>
        <p>Toggle switches announce their state changes to screen readers</p>
        <app-toggle-switch
          componentId="screen-reader-test"
          [isChecked]="screenReaderTest"
          [showLabels]="true"
          (change)="onScreenReaderTestChange($event)">
        </app-toggle-switch>
        <p>Last state change: {{ lastStateChange || 'None' }}</p>
      </div>
    </div>
  `
})
export class AccessibilityToggleStory {
  accessibilityTest1 = false;
  accessibilityTest2 = true;
  screenReaderTest = false;
  lastStateChange = '';

  onScreenReaderTestChange(event: ToggleChangeEvent): void {
    this.screenReaderTest = event.checked;
    this.lastStateChange = `Changed to ${event.checked ? 'ON' : 'OFF'} via ${event.trigger}`;
  }
}

/**
 * Usage Examples:
 *
 * 1. Basic Usage:
 *    <app-toggle-switch
 *      [isChecked]="myValue"
 *      (change)="onToggleChange($event)">
 *    </app-toggle-switch>
 *
 * 2. With Custom Size and Labels:
 *    <app-toggle-switch
 *      size="large"
 *      [showLabels]="true"
 *      [isChecked]="myValue"
 *      (change)="onToggleChange($event)">
 *    </app-toggle-switch>
 *
 * 3. In Angular Forms:
 *    <app-toggle-switch
 *      formControlName="myControl">
 *    </app-toggle-switch>
 *
 * 4. With Event Tracking:
 *    <app-toggle-switch
 *      componentId="user-preferences-notifications"
 *      [isChecked]="myValue"
 *      (change)="onToggleChange($event)">
 *    </app-toggle-switch>
 *
 * Performance Notes:
 * - Component uses OnPush change detection for optimal performance
 * - Animations use CSS transforms for hardware acceleration
 * - Debouncing prevents rapid state changes
 * - Memory cleanup handled automatically
 *
 * Accessibility Notes:
 * - Minimum 44px touch target size enforced
 * - Full keyboard navigation support
 * - Screen reader compatible with ARIA attributes
 * - Respects prefers-reduced-motion preference
 * - High contrast mode support
 */