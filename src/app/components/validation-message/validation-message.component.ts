import { Component, Input, OnInit, OnDestroy, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-validation-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validation-message.component.html',
  styleUrl: './validation-message.component.css'
})
export class ValidationMessageComponent implements OnInit, OnDestroy, OnChanges {
  @Input() errors: string[] = [];
  @Input() fieldName: string = '';
  @Input() show: boolean = false;

  protected readonly announceErrors = signal(false);
  private announceTimeout?: number;

  ngOnInit(): void {
    // Announce errors to screen readers with a slight delay to avoid interrupting user input
    if (this.show && this.errors.length > 0) {
      this.scheduleAnnouncement();
    }
  }

  ngOnDestroy(): void {
    if (this.announceTimeout) {
      window.clearTimeout(this.announceTimeout);
    }
  }

  ngOnChanges(): void {
    if (this.show && this.errors.length > 0) {
      this.scheduleAnnouncement();
    } else {
      this.announceErrors.set(false);
    }
  }

  private scheduleAnnouncement(): void {
    // Clear any existing timeout
    if (this.announceTimeout) {
      window.clearTimeout(this.announceTimeout);
    }

    // Schedule announcement after a brief delay to avoid interrupting typing
    this.announceTimeout = window.setTimeout(() => {
      this.announceErrors.set(true);
    }, 100);
  }

  getErrorId(index: number): string {
    return `${this.fieldName}-error-${index}`;
  }

  getAriaLiveRegionId(): string {
    return `${this.fieldName}-error-live`;
  }
}