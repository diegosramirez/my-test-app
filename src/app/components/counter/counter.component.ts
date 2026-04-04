import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CounterState {
  count: number;
}

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  public readonly count = signal<number>(0);

  constructor() {
    // Emit tracking event for component load
    this.emitEvent('counter_component_loaded', { initial_value: this.count() });
  }

  increment(): void {
    const oldValue = this.count();
    const newValue = oldValue + 1;
    this.count.set(newValue);

    this.emitEvent('counter_button_clicked', {
      action_type: 'increment',
      current_value: newValue
    });
    this.emitEvent('counter_value_changed', {
      old_value: oldValue,
      new_value: newValue
    });
  }

  decrement(): void {
    const oldValue = this.count();
    const newValue = oldValue - 1;
    this.count.set(newValue);

    this.emitEvent('counter_button_clicked', {
      action_type: 'decrement',
      current_value: newValue
    });
    this.emitEvent('counter_value_changed', {
      old_value: oldValue,
      new_value: newValue
    });
  }

  reset(): void {
    const oldValue = this.count();
    const newValue = 0;
    this.count.set(newValue);

    this.emitEvent('counter_button_clicked', {
      action_type: 'reset',
      current_value: newValue
    });
    this.emitEvent('counter_value_changed', {
      old_value: oldValue,
      new_value: newValue
    });
  }

  private emitEvent(eventName: string, properties: any): void {
    // In a real application, this would integrate with analytics
    console.log(`Event: ${eventName}`, properties);
  }
}