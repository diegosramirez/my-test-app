import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ToggleSwitchComponent } from '../../components/toggle-switch/toggle-switch.component';
import { ToggleChangeEvent, ToggleSize } from '../../shared/toggle.types';
import { EventTrackingService } from '../../shared/event-tracking.service';

@Component({
  selector: 'app-toggle-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToggleSwitchComponent],
  templateUrl: './toggle-demo.component.html',
  styleUrls: ['./toggle-demo.component.scss']
})
export class ToggleDemoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Basic demo properties
  basicToggle = false;
  lastEvent = '';

  // Size variants
  smallToggle = false;
  mediumToggle = true;
  largeToggle = false;

  // With labels
  labeledToggle = false;

  // Accessibility demo
  accessibilityTest1 = false;
  accessibilityTest2 = true;
  keyboardEvents: string[] = [];

  // Forms demo
  settingsForm = new FormGroup({
    notifications: new FormControl(true),
    darkMode: new FormControl(false),
    autoSave: new FormControl(true),
    analytics: new FormControl(false)
  });

  // Performance tracking
  renderTimes: number[] = [];
  lastRenderTime = 0;

  // Event logs for debugging
  eventLogs: string[] = [];
  maxLogs = 10;

  constructor(private eventTracking: EventTrackingService) {}

  ngOnInit(): void {
    // Track component initialization performance
    const startTime = performance.now();

    // Subscribe to form changes for demonstration
    this.settingsForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(values => {
      this.logEvent(`Form values changed: ${JSON.stringify(values)}`);
    });

    // Simulate component render time tracking
    setTimeout(() => {
      const endTime = performance.now();
      this.lastRenderTime = endTime - startTime;
      this.renderTimes.push(this.lastRenderTime);
      this.logEvent(`Component initialized in ${this.lastRenderTime.toFixed(2)}ms`);
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBasicToggleChange(event: ToggleChangeEvent): void {
    this.basicToggle = event.checked;
    this.lastEvent = `Changed to ${event.checked ? 'ON' : 'OFF'} via ${event.trigger}`;
    this.logEvent(`Basic toggle: ${this.lastEvent}`);
  }

  onSizeToggleChange(size: string, event: ToggleChangeEvent): void {
    this.logEvent(`${size} toggle changed to ${event.checked ? 'ON' : 'OFF'} via ${event.trigger}`);
  }

  onAccessibilityTestChange(testNumber: number, event: ToggleChangeEvent): void {
    if (testNumber === 1) {
      this.accessibilityTest1 = event.checked;
    } else {
      this.accessibilityTest2 = event.checked;
    }

    if (event.trigger === 'user') {
      this.keyboardEvents.push(`Test ${testNumber}: ${event.checked ? 'ON' : 'OFF'} at ${new Date().toLocaleTimeString()}`);
      if (this.keyboardEvents.length > 5) {
        this.keyboardEvents.shift();
      }
    }

    this.logEvent(`Accessibility test ${testNumber}: ${event.checked ? 'ON' : 'OFF'} via ${event.trigger}`);
  }

  resetForm(): void {
    this.settingsForm.reset({
      notifications: true,
      darkMode: false,
      autoSave: true,
      analytics: false
    });
    this.logEvent('Form reset to default values');
  }

  disableForm(): void {
    this.settingsForm.disable();
    this.logEvent('Form disabled');
  }

  enableForm(): void {
    this.settingsForm.enable();
    this.logEvent('Form enabled');
  }

  toggleAllSettings(): void {
    const allChecked = Object.values(this.settingsForm.value).every(value => value);
    const newState = !allChecked;

    this.settingsForm.patchValue({
      notifications: newState,
      darkMode: newState,
      autoSave: newState,
      analytics: newState
    });

    this.logEvent(`All settings toggled to ${newState ? 'ON' : 'OFF'}`);
  }

  clearEventLogs(): void {
    this.eventLogs = [];
    this.keyboardEvents = [];
  }

  getPerformanceStats(): { avg: number; min: number; max: number } {
    if (this.renderTimes.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }

    const avg = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
    const min = Math.min(...this.renderTimes);
    const max = Math.max(...this.renderTimes);

    return { avg, min, max };
  }

  private logEvent(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    this.eventLogs.unshift(logEntry);
    if (this.eventLogs.length > this.maxLogs) {
      this.eventLogs.pop();
    }
  }

  // Method to test programmatic toggle
  programmaticallyToggle(property: keyof this): void {
    const value = this[property];
    if (typeof value === 'boolean') {
      const propertyName = String(property);
      // Check if the property is writable (not readonly)
      const descriptor = Object.getOwnPropertyDescriptor(this, property) ||
                        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), property);

      if (!descriptor || descriptor.writable !== false) {
        (this as any)[property] = !value;
        this.logEvent(`Programmatically toggled ${propertyName} to ${this[property] ? 'ON' : 'OFF'}`);
      } else {
        this.logEvent(`Cannot toggle ${propertyName}: property is readonly`);
      }
    }
  }
}