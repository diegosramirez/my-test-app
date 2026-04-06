import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToggleSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.css']
})
export class ToggleSwitchComponent implements OnDestroy {
  @Input() checked: boolean = false;
  @Input() disabled: boolean = false;
  @Input() ariaLabel: string = 'Toggle switch';
  @Input() size: ToggleSize = 'medium';

  @Output() checkedChange = new EventEmitter<boolean>();

  @ViewChild('toggleButton', { static: true }) toggleButton!: ElementRef<HTMLButtonElement>;

  isAnimating: boolean = false;
  private animationTimeout: number | null = null;

  constructor() {
    // Check for reduced motion preference
    this.respectsReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private respectsReducedMotion: boolean;

  get animationDuration(): number {
    return this.respectsReducedMotion ? 50 : 300;
  }

  get sizeClass(): string {
    return `toggle-${this.size}`;
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (this.disabled || this.isAnimating) {
      event.preventDefault();
      return;
    }
    this.toggle();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.isAnimating) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }

  toggle(): void {
    if (this.disabled || this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.checked = !this.checked;

    // Clear any existing timeout
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }

    // Set animation timeout based on motion preference
    this.animationTimeout = setTimeout(() => {
      this.isAnimating = false;
      this.animationTimeout = null;
      // Emit the change event after animation completes
      this.checkedChange.emit(this.checked);
    }, this.animationDuration);
  }

  focus(): void {
    if (this.toggleButton?.nativeElement) {
      this.toggleButton.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }
}