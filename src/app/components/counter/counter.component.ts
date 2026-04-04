import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy, HostListener, LOCALE_ID, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { CounterConfig, CounterEventData, CounterAction, InteractionMethod } from './counter.types';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CounterComponent implements OnInit, OnDestroy {
  private readonly locale = inject(LOCALE_ID);
  private readonly destroy$ = new Subject<void>();
  private readonly actionSubject = new Subject<{ action: CounterAction; method: InteractionMethod }>();

  /**
   * Component configuration
   */
  @Input() config: CounterConfig = {};

  /**
   * Event emitter for count changes
   */
  @Output() countChanged = new EventEmitter<CounterEventData>();

  /**
   * Event emitter for component loaded
   */
  @Output() componentLoaded = new EventEmitter<{ initialValue: number; timestamp: number }>();

  /**
   * Event emitter for button clicks
   */
  @Output() buttonClicked = new EventEmitter<{
    actionType: CounterAction;
    currentValue: number;
    interactionMethod: InteractionMethod;
  }>();

  /**
   * Event emitter for keyboard interactions
   */
  @Output() keyboardUsed = new EventEmitter<{
    keyPressed: string;
    currentValue: number;
  }>();

  /**
   * Reactive count signal
   */
  readonly count = signal<number>(0);

  /**
   * Computed formatted count for display
   */
  readonly formattedCount = computed(() => {
    const value = this.count();
    return new Intl.NumberFormat(this.locale).format(value);
  });

  /**
   * Computed accessibility label
   */
  readonly countAriaLabel = computed(() => {
    const value = this.count();
    return `Current count is ${value}`;
  });

  /**
   * Configuration with defaults and validation
   */
  private get safeConfig(): Required<CounterConfig> {
    const config = { ...this.config };

    // Validate and sanitize numeric values
    const safeValue = (value: any, fallback: number): number => {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };

    return {
      initialValue: safeValue(config.initialValue, 0),
      step: safeValue(config.step, 1),
      minValue: safeValue(config.minValue, Number.MIN_SAFE_INTEGER),
      maxValue: safeValue(config.maxValue, Number.MAX_SAFE_INTEGER)
    };
  }

  ngOnInit(): void {
    // Initialize count with configured initial value
    this.count.set(this.safeConfig.initialValue);

    // Set up debounced action handling
    this.actionSubject
      .pipe(
        debounceTime(50), // Prevent rapid clicking issues
        takeUntil(this.destroy$)
      )
      .subscribe(({ action, method }) => {
        this.handleAction(action, method);
      });

    // Emit component loaded event
    this.componentLoaded.emit({
      initialValue: this.safeConfig.initialValue,
      timestamp: Date.now()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle increment button click
   */
  onIncrement(method: InteractionMethod = 'click'): void {
    this.actionSubject.next({ action: 'increment', method });
  }

  /**
   * Handle decrement button click
   */
  onDecrement(method: InteractionMethod = 'click'): void {
    this.actionSubject.next({ action: 'decrement', method });
  }

  /**
   * Handle reset button click
   */
  onReset(method: InteractionMethod = 'click'): void {
    this.actionSubject.next({ action: 'reset', method });
  }

  /**
   * Handle keyboard events for accessibility
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    // Only handle keyboard events on buttons
    if (!target.matches('button')) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      const action = target.getAttribute('data-action') as CounterAction;
      if (action) {
        this.keyboardUsed.emit({
          keyPressed: event.key,
          currentValue: this.count()
        });

        switch (action) {
          case 'increment':
            this.onIncrement('keyboard');
            break;
          case 'decrement':
            this.onDecrement('keyboard');
            break;
          case 'reset':
            this.onReset('keyboard');
            break;
        }
      }
    }
  }

  /**
   * Handle counter actions with validation
   */
  private handleAction(action: CounterAction, method: InteractionMethod): void {
    const oldValue = this.count();
    let newValue = oldValue;
    const { step, minValue, maxValue } = this.safeConfig;

    switch (action) {
      case 'increment':
        newValue = Math.min(oldValue + step, maxValue);
        break;
      case 'decrement':
        newValue = Math.max(oldValue - step, minValue);
        break;
      case 'reset':
        newValue = 0;
        break;
    }

    // Only update if value actually changed
    if (newValue !== oldValue) {
      this.count.set(newValue);

      const eventData: CounterEventData = {
        action,
        oldValue,
        newValue,
        interactionMethod: method,
        timestamp: Date.now()
      };

      this.countChanged.emit(eventData);
    }

    // Always emit button click for analytics
    this.buttonClicked.emit({
      actionType: action,
      currentValue: this.count(),
      interactionMethod: method
    });
  }

  /**
   * Public API methods for programmatic access
   */
  increment(): void {
    this.onIncrement('click');
  }

  decrement(): void {
    this.onDecrement('click');
  }

  reset(): void {
    this.onReset('click');
  }

  /**
   * Get current count value
   */
  getCurrentValue(): number {
    return this.count();
  }
}