import { Component, signal, computed, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  // Private count signal for reactive state management
  private readonly count = signal<number>(0);

  // Public readonly computed signal for template access
  readonly countValue = computed(() => this.count());

  // Output for parent components to track count changes
  @Output() countChanged = new EventEmitter<number>();

  // Increment the count by 1
  increment(): void {
    const newValue = this.count() + 1;
    this.count.set(newValue);
    this.countChanged.emit(newValue);
  }

  // Decrement the count by 1 (allows negative values)
  decrement(): void {
    const newValue = this.count() - 1;
    this.count.set(newValue);
    this.countChanged.emit(newValue);
  }

  // Reset the count to 0
  reset(): void {
    this.count.set(0);
    this.countChanged.emit(0);
  }

}