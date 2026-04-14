import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimerState, Lap } from '../models/timer.model';

@Component({
  selector: 'app-stopwatch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stopwatch.component.html',
  styleUrl: './stopwatch.component.css'
})
export class StopwatchComponent implements OnInit, OnDestroy {
  // Timer state signals
  private readonly timerState = signal<TimerState>(TimerState.STOPPED);
  private readonly elapsedTime = signal<number>(0);
  private readonly laps = signal<Lap[]>([]);

  // Computed properties
  readonly formattedTime = computed(() => this.formatTime(this.elapsedTime()));
  readonly buttonText = computed(() => {
    switch (this.timerState()) {
      case TimerState.STOPPED:
        return 'Start';
      case TimerState.RUNNING:
        return 'Pause';
      case TimerState.PAUSED:
        return 'Resume';
      default:
        return 'Start';
    }
  });
  readonly isRunning = computed(() => this.timerState() === TimerState.RUNNING);
  readonly canLap = computed(() => this.timerState() === TimerState.RUNNING && this.elapsedTime() > 0);
  readonly canReset = computed(() => this.timerState() !== TimerState.STOPPED || this.elapsedTime() > 0);

  // Timer control properties
  private timerSubscription?: Subscription;
  private startTimestamp = 0;
  private pausedElapsed = 0;
  private lastLapTime = 0;
  private lapDebounceTime = 0;

  // Background tab handling
  private wasRunningBeforeBlur = false;
  private blurTimestamp = 0;

  constructor() {
    // Handle visibility change for background tab accuracy
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.handleVisibilityChange());
  }

  ngOnInit(): void {
    // Initialize component
    this.resetTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }


  /**
   * Start or pause/resume the timer based on current state
   */
  toggleTimer(): void {
    switch (this.timerState()) {
      case TimerState.STOPPED:
        this.startTimer();
        break;
      case TimerState.RUNNING:
        this.pauseTimer();
        break;
      case TimerState.PAUSED:
        this.resumeTimer();
        break;
    }
  }

  /**
   * Record a lap time with debouncing to prevent duplicates
   */
  recordLap(): void {
    const now = performance.now();

    // Debounce lap button to prevent duplicate entries
    if (now - this.lapDebounceTime < 300) {
      return;
    }
    this.lapDebounceTime = now;

    if (!this.canLap()) {
      return;
    }

    const currentElapsed = this.elapsedTime();
    const splitTime = currentElapsed - this.lastLapTime;

    const newLap: Lap = {
      lapNumber: this.laps().length + 1,
      absoluteTime: currentElapsed,
      splitTime: splitTime,
      timestamp: now
    };

    // Add to beginning of array for reverse chronological order
    this.laps.update(laps => [newLap, ...laps]);
    this.lastLapTime = currentElapsed;

    // Implement memory management - limit to 200 laps
    if (this.laps().length > 200) {
      this.laps.update(laps => laps.slice(0, 200));
    }
  }

  /**
   * Reset timer to initial state
   */
  resetTimer(): void {
    this.stopTimer();
    this.timerState.set(TimerState.STOPPED);
    this.elapsedTime.set(0);
    this.laps.set([]);
    this.pausedElapsed = 0;
    this.lastLapTime = 0;
    this.startTimestamp = 0;
  }

  /**
   * Format milliseconds to mm:ss:ms display
   */
  formatTime(milliseconds: number): string {
    // Ensure non-negative values to prevent negative time display
    const totalMs = Math.floor(Math.max(0, milliseconds));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10); // Display centiseconds for readability

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  }

  /**
   * Start the timer from stopped state
   */
  private startTimer(): void {
    this.startTimestamp = performance.now();
    this.pausedElapsed = 0;
    this.timerState.set(TimerState.RUNNING);
    this.startTimerInterval();
  }

  /**
   * Pause the running timer
   */
  private pauseTimer(): void {
    this.pausedElapsed = this.elapsedTime();
    this.stopTimer();
    this.timerState.set(TimerState.PAUSED);
  }

  /**
   * Resume the paused timer
   */
  private resumeTimer(): void {
    this.startTimestamp = performance.now();
    this.timerState.set(TimerState.RUNNING);
    this.startTimerInterval();
  }

  /**
   * Start the timer interval for high-precision updates
   */
  private startTimerInterval(): void {
    this.timerSubscription = interval(10) // 10ms intervals for smooth display
      .subscribe(() => {
        if (this.timerState() === TimerState.RUNNING) {
          const now = performance.now();
          const elapsed = this.pausedElapsed + (now - this.startTimestamp);
          this.elapsedTime.set(elapsed);
        }
      });
  }

  /**
   * Stop the timer interval
   */
  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  /**
   * Handle visibility change for background tab accuracy
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Tab lost focus
      this.wasRunningBeforeBlur = this.timerState() === TimerState.RUNNING;
      this.blurTimestamp = performance.now();
      if (this.wasRunningBeforeBlur) {
        this.pausedElapsed = this.elapsedTime();
      }
    } else {
      // Tab regained focus
      if (this.wasRunningBeforeBlur && this.timerState() === TimerState.RUNNING) {
        // Adjust for time passed while in background
        const now = performance.now();
        const backgroundTime = now - this.blurTimestamp;
        this.pausedElapsed += backgroundTime;
        this.startTimestamp = now;
      }
    }
  }

  /**
   * Get laps for template iteration
   */
  getLaps(): Lap[] {
    return this.laps();
  }

  /**
   * Track by function for lap list performance
   */
  trackByLapNumber(index: number, lap: Lap): number {
    return lap.lapNumber;
  }
}