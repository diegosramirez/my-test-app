import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, takeUntil, EMPTY } from 'rxjs';
import { StopwatchState, LapTime } from './stopwatch.interfaces';
import { formatTime, isOverflow, getMaxDuration } from './stopwatch.utils';

@Component({
  selector: 'app-stopwatch',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stopwatch-container">
      <header class="stopwatch-header">
        <h1>Stopwatch</h1>
      </header>

      <main class="stopwatch-main">
        <div class="timer-display" aria-live="polite" [attr.aria-label]="'Timer display: ' + displayTime()">
          {{ displayTime() }}
        </div>

        <div class="controls" role="group" aria-label="Stopwatch controls">
          <button
            class="control-btn start-pause-btn"
            [class.running]="state().isRunning"
            (click)="toggleTimer()"
            [attr.aria-label]="state().isRunning ? 'Pause timer' : 'Start timer'"
          >
            {{ state().isRunning ? 'Pause' : 'Start' }}
          </button>

          <button
            class="control-btn lap-btn"
            (click)="addLap()"
            [disabled]="!state().isRunning"
            aria-label="Record lap time"
          >
            Lap
          </button>

          <button
            class="control-btn reset-btn"
            (click)="reset()"
            aria-label="Reset timer and clear laps"
          >
            Reset
          </button>
        </div>

        <div class="overflow-message" *ngIf="overflowDetected()" role="alert">
          Maximum time reached (99:59.99). Timer stopped.
        </div>

        <section class="laps-section" *ngIf="state().laps.length > 0">
          <h2>Lap Times</h2>
          <div class="laps-list" role="log" aria-label="Lap times list">
            <div
              *ngFor="let lap of state().laps; index as i"
              class="lap-item"
              [attr.aria-label]="'Lap ' + lap.id + ': ' + lap.displayTime"
            >
              <span class="lap-number">{{ lap.id }}</span>
              <span class="lap-time">{{ lap.displayTime }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .stopwatch-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .stopwatch-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .stopwatch-header h1 {
      margin: 0;
      font-size: 1.8rem;
      color: #333;
      font-weight: 600;
    }

    .stopwatch-main {
      display: grid;
      gap: 2rem;
    }

    .timer-display {
      font-size: 3.5rem;
      font-weight: 700;
      text-align: center;
      color: #2563eb;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.05em;
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
      min-height: 5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .controls {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 1rem;
    }

    .control-btn {
      min-height: 44px;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }

    .start-pause-btn {
      background: #10b981;
      color: white;
    }

    .start-pause-btn:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .start-pause-btn.running {
      background: #f59e0b;
    }

    .start-pause-btn.running:hover:not(:disabled) {
      background: #d97706;
    }

    .lap-btn {
      background: #6366f1;
      color: white;
    }

    .lap-btn:hover:not(:disabled) {
      background: #4f46e5;
      transform: translateY(-1px);
    }

    .lap-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }

    .reset-btn {
      background: #ef4444;
      color: white;
    }

    .reset-btn:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-1px);
    }

    .overflow-message {
      background: #fef3c7;
      color: #92400e;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
      border: 1px solid #f59e0b;
    }

    .laps-section {
      margin-top: 1rem;
    }

    .laps-section h2 {
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
      color: #374151;
    }

    .laps-list {
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }

    .lap-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f3f4f6;
      align-items: center;
    }

    .lap-item:last-child {
      border-bottom: none;
    }

    .lap-number {
      font-weight: 600;
      color: #6b7280;
      min-width: 40px;
    }

    .lap-time {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: #374151;
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .stopwatch-container {
        padding: 1rem;
        margin: 1rem;
      }

      .timer-display {
        font-size: 2.5rem;
        padding: 1rem;
      }

      .controls {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .control-btn {
        min-height: 48px;
        font-size: 1.1rem;
      }
    }

    /* Focus styles for accessibility */
    .control-btn:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .timer-display {
        border-width: 3px;
      }

      .control-btn {
        border: 2px solid transparent;
      }
    }
  `]
})
export class StopwatchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private updateInterval$ = interval(10);

  // Signal-based state for reactive updates
  state = signal<StopwatchState>({
    elapsedMs: 0,
    isRunning: false,
    startTime: null,
    laps: []
  });

  private lapCounter = 1;

  ngOnInit() {
    // Handle visibility change to recalculate time when tab regains focus
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Start the update loop
    this.updateInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTimer();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Get formatted display time
   */
  displayTime(): string {
    return formatTime(this.state().elapsedMs);
  }

  /**
   * Check if overflow is detected
   */
  overflowDetected(): boolean {
    return isOverflow(this.state().elapsedMs);
  }

  /**
   * Toggle timer between start and pause
   */
  toggleTimer() {
    const currentState = this.state();

    if (currentState.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Start the timer
   */
  private start() {
    const now = performance.now();
    const currentState = this.state();

    this.state.set({
      ...currentState,
      isRunning: true,
      startTime: now - currentState.elapsedMs
    });
  }

  /**
   * Pause the timer
   */
  private pause() {
    const currentState = this.state();

    this.state.set({
      ...currentState,
      isRunning: false,
      startTime: null
    });
  }

  /**
   * Reset the timer and clear laps
   */
  reset() {
    this.lapCounter = 1;
    this.state.set({
      elapsedMs: 0,
      isRunning: false,
      startTime: null,
      laps: []
    });
  }

  /**
   * Add a lap time
   */
  addLap() {
    const currentState = this.state();

    if (!currentState.isRunning) {
      return;
    }

    const lapTime: LapTime = {
      id: this.lapCounter++,
      timeMs: currentState.elapsedMs,
      displayTime: formatTime(currentState.elapsedMs)
    };

    // Add lap to beginning of array (newest first)
    this.state.set({
      ...currentState,
      laps: [lapTime, ...currentState.laps]
    });

    // Prevent excessive DOM growth
    if (this.state().laps.length > 100) {
      this.state.update(state => ({
        ...state,
        laps: state.laps.slice(0, 100)
      }));
    }
  }

  /**
   * Update timer display
   */
  private updateTimer() {
    const currentState = this.state();

    if (!currentState.isRunning || !currentState.startTime) {
      return;
    }

    const now = performance.now();
    const elapsed = now - currentState.startTime;

    // Check for overflow
    if (isOverflow(elapsed)) {
      this.state.set({
        ...currentState,
        elapsedMs: getMaxDuration(),
        isRunning: false,
        startTime: null
      });
      return;
    }

    this.state.set({
      ...currentState,
      elapsedMs: elapsed
    });
  }

  /**
   * Handle browser tab visibility changes
   */
  private handleVisibilityChange() {
    const currentState = this.state();

    if (document.visibilityState === 'visible' && currentState.isRunning && currentState.startTime) {
      // Recalculate elapsed time when tab becomes visible
      const now = performance.now();
      const elapsed = now - currentState.startTime;

      if (isOverflow(elapsed)) {
        this.state.set({
          ...currentState,
          elapsedMs: getMaxDuration(),
          isRunning: false,
          startTime: null
        });
      } else {
        this.state.set({
          ...currentState,
          elapsedMs: elapsed
        });
      }
    }
  }
}