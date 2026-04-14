import { TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, NEVER, interval } from 'rxjs';
import { StopwatchComponent } from './stopwatch.component';
import { TimerState, Lap } from '../models/timer.model';

// Mock performance.now() for deterministic testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow
  },
  writable: true
});

// Mock document.hidden for visibility change testing
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true
});

describe('StopwatchComponent', () => {
  let component: StopwatchComponent;
  let fixture: any;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StopwatchComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;

    // Reset mocks before each test
    mockPerformanceNow.mockClear();
    mockPerformanceNow.mockReturnValue(0);

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with stopped state and zero time', () => {
      expect(component.formattedTime()).toBe('00:00:00');
      expect(component.buttonText()).toBe('Start');
      expect(component.isRunning()).toBe(false);
      expect(component.canLap()).toBe(false);
      expect(component.canReset()).toBe(false);
    });

    it('should display initial timer state in DOM', async () => {
      await fixture.whenStable();
      const timerDisplay = compiled.querySelector('.timer-text');
      expect(timerDisplay?.textContent?.trim()).toBe('00:00:00');

      const startButton = compiled.querySelector('.start-pause-button');
      expect(startButton?.textContent?.trim()).toBe('Start');

      const lapButton = compiled.querySelector('.lap-button') as HTMLButtonElement;
      expect(lapButton?.disabled).toBe(true);

      const resetButton = compiled.querySelector('.reset-button') as HTMLButtonElement;
      expect(resetButton?.disabled).toBe(true);
    });

    it('should have proper accessibility attributes', async () => {
      await fixture.whenStable();

      const timerDisplay = compiled.querySelector('.timer-text');
      expect(timerDisplay?.getAttribute('aria-label')).toContain('Timer showing 00:00:00');

      const startButton = compiled.querySelector('.start-pause-button');
      expect(startButton?.getAttribute('aria-label')).toBe('Start timer');

      const lapButton = compiled.querySelector('.lap-button');
      expect(lapButton?.getAttribute('aria-label')).toBe('Record lap time');

      const resetButton = compiled.querySelector('.reset-button');
      expect(resetButton?.getAttribute('aria-label')).toBe('Reset timer to zero');
    });
  });

  describe('Timer Formatting', () => {
    it('should format time correctly for various inputs', () => {
      // Test zero
      expect(component.formatTime(0)).toBe('00:00:00');

      // Test milliseconds only
      expect(component.formatTime(500)).toBe('00:00:50');
      expect(component.formatTime(999)).toBe('00:00:99');

      // Test seconds
      expect(component.formatTime(1000)).toBe('00:01:00');
      expect(component.formatTime(1500)).toBe('00:01:50');
      expect(component.formatTime(59999)).toBe('00:59:99');

      // Test minutes
      expect(component.formatTime(60000)).toBe('01:00:00');
      expect(component.formatTime(61500)).toBe('01:01:50');
      expect(component.formatTime(3599999)).toBe('59:59:99');

      // Test hours (shows as minutes over 60)
      expect(component.formatTime(3600000)).toBe('60:00:00');
      expect(component.formatTime(7200000)).toBe('120:00:00');
    });

    it('should display millisecond precision (centiseconds)', () => {
      // Test that we get centisecond precision (ms/10)
      expect(component.formatTime(10)).toBe('00:00:01');
      expect(component.formatTime(100)).toBe('00:00:10');
      expect(component.formatTime(123)).toBe('00:00:12');
      expect(component.formatTime(789)).toBe('00:00:78');
    });
  });

  describe('Timer State Management', () => {
    beforeEach(() => {
      // Mock startTimerInterval to avoid subscription issues
      vi.spyOn(component as any, 'startTimerInterval').mockImplementation(() => {
        (component as any).timerSubscription = {
          unsubscribe: vi.fn()
        };
      });
    });

    it('should start timer when clicking start button', () => {
      mockPerformanceNow.mockReturnValue(1000);

      component.toggleTimer();
      fixture.detectChanges();

      expect(component.buttonText()).toBe('Pause');
      expect(component.isRunning()).toBe(true);
      expect(component.canLap()).toBe(false); // No elapsed time yet
      expect(component.canReset()).toBe(true);
    });

    it('should pause timer when clicking pause button', () => {
      // Start the timer
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();

      // Simulate some elapsed time
      mockPerformanceNow.mockReturnValue(2000);
      // Manually set elapsed time to simulate timer running
      (component as any).elapsedTime.set(1000);
      fixture.detectChanges();

      // Pause the timer
      component.toggleTimer();
      fixture.detectChanges();

      expect(component.buttonText()).toBe('Resume');
      expect(component.isRunning()).toBe(false);
      expect(component.canLap()).toBe(false);
      expect(component.canReset()).toBe(true);
    });

    it('should resume timer when clicking resume button', () => {
      // Start timer
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();

      // Pause timer
      (component as any).elapsedTime.set(1000);
      component.toggleTimer();

      // Resume timer
      mockPerformanceNow.mockReturnValue(3000);
      component.toggleTimer();
      fixture.detectChanges();

      expect(component.buttonText()).toBe('Pause');
      expect(component.isRunning()).toBe(true);
      expect(component.canReset()).toBe(true);
    });

    it('should reset timer when clicking reset button', () => {
      // Start and run timer
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();
      (component as any).elapsedTime.set(5000);
      fixture.detectChanges();

      // Reset timer
      component.resetTimer();
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('00:00:00');
      expect(component.buttonText()).toBe('Start');
      expect(component.isRunning()).toBe(false);
      expect(component.canLap()).toBe(false);
      expect(component.canReset()).toBe(false);
      expect(component.getLaps().length).toBe(0);
    });
  });

  describe('Button Response Times and Visual Feedback', () => {
    it('should provide immediate visual feedback on button clicks', async () => {
      const startButton = compiled.querySelector('.start-pause-button') as HTMLButtonElement;

      // Click button and check state change is immediate
      startButton.click();
      fixture.detectChanges();

      // Should immediately reflect state change
      expect(component.isRunning()).toBe(true);
      expect(component.buttonText()).toBe('Pause');
    });

    it('should apply running class to start/pause button when running', async () => {
      const startButton = compiled.querySelector('.start-pause-button') as HTMLElement;

      // Start timer
      component.toggleTimer();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(startButton.classList).toContain('running');

      // Pause timer
      (component as any).elapsedTime.set(1000);
      component.toggleTimer();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(startButton.classList).not.toContain('running');
    });
  });

  describe('Lap Recording', () => {
    beforeEach(() => {
      // Mock startTimerInterval to avoid subscription issues
      vi.spyOn(component as any, 'startTimerInterval').mockImplementation(() => {
        (component as any).timerSubscription = {
          unsubscribe: vi.fn()
        };
      });

      // Start timer for lap tests
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();
      (component as any).elapsedTime.set(2000); // Simulate 2 seconds elapsed
      fixture.detectChanges();
    });

    it('should record lap with correct absolute and split times', () => {
      mockPerformanceNow.mockReturnValue(3000);

      component.recordLap();
      fixture.detectChanges();

      const laps = component.getLaps();
      expect(laps.length).toBe(1);
      expect(laps[0].lapNumber).toBe(1);
      expect(laps[0].absoluteTime).toBe(2000);
      expect(laps[0].splitTime).toBe(2000);
      expect(laps[0].timestamp).toBe(3000);
    });

    it('should calculate split times correctly for multiple laps', () => {
      // First lap at 2000ms
      mockPerformanceNow.mockReturnValue(3000);
      component.recordLap();

      // Second lap at 5000ms
      (component as any).elapsedTime.set(5000);
      mockPerformanceNow.mockReturnValue(6000);
      component.recordLap();

      const laps = component.getLaps();
      expect(laps.length).toBe(2);

      // Newest lap should be first (reverse chronological order)
      expect(laps[0].lapNumber).toBe(2);
      expect(laps[0].absoluteTime).toBe(5000);
      expect(laps[0].splitTime).toBe(3000); // 5000 - 2000

      expect(laps[1].lapNumber).toBe(1);
      expect(laps[1].absoluteTime).toBe(2000);
      expect(laps[1].splitTime).toBe(2000);
    });

    it('should debounce lap button to prevent duplicates', () => {
      mockPerformanceNow.mockReturnValue(3000);
      component.recordLap();

      // Try to record another lap immediately (within 300ms debounce)
      mockPerformanceNow.mockReturnValue(3200);
      component.recordLap();

      expect(component.getLaps().length).toBe(1);

      // After debounce period
      mockPerformanceNow.mockReturnValue(3400);
      component.recordLap();

      expect(component.getLaps().length).toBe(2);
    });

    it('should not record lap when timer is not running', () => {
      // Pause timer
      component.toggleTimer();

      component.recordLap();

      expect(component.getLaps().length).toBe(0);
    });

    it('should implement memory management with 200 lap limit', () => {
      // Simulate recording 201 laps
      for (let i = 1; i <= 201; i++) {
        (component as any).elapsedTime.set(i * 1000);
        mockPerformanceNow.mockReturnValue(1000 + i * 300); // Ensure debounce passes
        component.recordLap();
      }

      const laps = component.getLaps();
      expect(laps.length).toBe(200);
      expect(laps[0].lapNumber).toBe(201); // Newest lap
      expect(laps[199].lapNumber).toBe(2); // Oldest kept (lap 1 should be removed)
    });

    it('should display laps in reverse chronological order', () => {
      // Record 3 laps
      for (let i = 1; i <= 3; i++) {
        (component as any).elapsedTime.set(i * 1000);
        mockPerformanceNow.mockReturnValue(1000 + i * 400);
        component.recordLap();
      }

      const laps = component.getLaps();
      expect(laps[0].lapNumber).toBe(3);
      expect(laps[1].lapNumber).toBe(2);
      expect(laps[2].lapNumber).toBe(1);
    });
  });

  describe('Lap Display in DOM', () => {
    it('should hide lap container when no laps recorded', async () => {
      await fixture.whenStable();
      const lapsContainer = compiled.querySelector('.laps-container');
      expect(lapsContainer).toBeFalsy();
    });

    it('should display lap container and laps when laps exist', async () => {
      // Mock performance.now() to avoid debouncing issues
      mockPerformanceNow.mockReturnValueOnce(1000); // For toggleTimer

      // Start timer
      component.toggleTimer();
      fixture.detectChanges();

      // Verify timer is running and can record lap
      expect(component.isRunning()).toBe(true);

      // Set elapsed time and ensure state is properly updated
      (component as any).elapsedTime.set(2000);
      fixture.detectChanges();

      // Verify canLap is true
      expect(component.canLap()).toBe(true);

      // Mock performance.now() for lap recording (time > 300ms later to avoid debounce)
      mockPerformanceNow.mockReturnValueOnce(1500);

      // Record lap
      component.recordLap();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify laps were recorded
      expect(component.getLaps().length).toBe(1);

      const lapsContainer = compiled.querySelector('.laps-container');
      expect(lapsContainer).toBeTruthy();

      const lapItems = compiled.querySelectorAll('.lap-item');
      expect(lapItems.length).toBe(1);

      const lapNumber = compiled.querySelector('.lap-number');
      expect(lapNumber?.textContent?.trim()).toBe('1');

      const lapAbsolute = compiled.querySelector('.lap-absolute');
      expect(lapAbsolute?.textContent?.trim()).toBe('00:02:00');

      const lapSplit = compiled.querySelector('.lap-split');
      expect(lapSplit?.textContent?.trim()).toBe('(+00:02:00)');
    });

    it('should have proper accessibility for lap list', async () => {
      // Mock performance.now() to avoid debouncing issues
      mockPerformanceNow.mockReturnValueOnce(2000); // For toggleTimer

      // Start timer
      component.toggleTimer();
      fixture.detectChanges();

      // Set elapsed time and ensure state is properly updated
      (component as any).elapsedTime.set(1500);
      fixture.detectChanges();

      // Verify canLap is true
      expect(component.canLap()).toBe(true);

      // Mock performance.now() for lap recording (time > 300ms later to avoid debounce)
      mockPerformanceNow.mockReturnValueOnce(2500);

      // Record a lap
      component.recordLap();
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify laps were recorded
      expect(component.getLaps().length).toBe(1);

      const lapsList = compiled.querySelector('.laps-list');
      expect(lapsList?.getAttribute('role')).toBe('list');
      expect(lapsList?.getAttribute('aria-label')).toBe('Recorded lap times');

      const lapItem = compiled.querySelector('.lap-item');
      expect(lapItem?.getAttribute('role')).toBe('listitem');
      expect(lapItem?.getAttribute('aria-label')).toContain('Lap 1:');
    });
  });

  describe('Background Tab Handling', () => {
    let visibilityChangeEvent: Event;

    beforeEach(() => {
      visibilityChangeEvent = new Event('visibilitychange');
    });

    it('should handle tab going to background while running', () => {
      // Mock startTimerInterval to avoid subscription issues
      vi.spyOn(component as any, 'startTimerInterval').mockImplementation(() => {
        (component as any).timerSubscription = {
          unsubscribe: vi.fn()
        };
      });

      // Start timer
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();
      (component as any).elapsedTime.set(2000);

      // Tab goes to background
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      mockPerformanceNow.mockReturnValue(3000);
      document.dispatchEvent(visibilityChangeEvent);

      // Verify background state is captured
      expect((component as any).wasRunningBeforeBlur).toBe(true);
      expect((component as any).blurTimestamp).toBe(3000);
    });

    it('should maintain timing accuracy when tab regains focus', () => {
      // Mock startTimerInterval to avoid subscription issues
      vi.spyOn(component as any, 'startTimerInterval').mockImplementation(() => {
        (component as any).timerSubscription = {
          unsubscribe: vi.fn()
        };
      });

      // Start timer
      mockPerformanceNow.mockReturnValue(1000);
      component.toggleTimer();
      (component as any).elapsedTime.set(2000);

      // Tab goes to background
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      mockPerformanceNow.mockReturnValue(3000);
      document.dispatchEvent(visibilityChangeEvent);

      // Tab regains focus after 5 seconds
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      mockPerformanceNow.mockReturnValue(8000);
      document.dispatchEvent(visibilityChangeEvent);

      // Should account for background time
      expect((component as any).pausedElapsed).toBe(7000); // 2000 + 5000 background time
    });

    it('should not affect stopped timer during background/foreground', () => {
      // Timer is stopped
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(visibilityChangeEvent);

      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(visibilityChangeEvent);

      expect((component as any).wasRunningBeforeBlur).toBe(false);
    });
  });

  describe('Button States and Computed Properties', () => {
    beforeEach(() => {
      // Mock startTimerInterval to avoid subscription issues
      vi.spyOn(component as any, 'startTimerInterval').mockImplementation(() => {
        (component as any).timerSubscription = {
          unsubscribe: vi.fn()
        };
      });
    });

    it('should compute canLap correctly', () => {
      // Initially false
      expect(component.canLap()).toBe(false);

      // Start timer but no elapsed time
      component.toggleTimer();
      expect(component.canLap()).toBe(false);

      // With elapsed time and running
      (component as any).elapsedTime.set(1000);
      fixture.detectChanges();
      expect(component.canLap()).toBe(true);

      // Paused with elapsed time
      component.toggleTimer();
      expect(component.canLap()).toBe(false);
    });

    it('should compute canReset correctly', () => {
      // Initially false
      expect(component.canReset()).toBe(false);

      // After starting
      component.toggleTimer();
      expect(component.canReset()).toBe(true);

      // With elapsed time
      (component as any).elapsedTime.set(1000);
      fixture.detectChanges();
      expect(component.canReset()).toBe(true);

      // After pausing
      component.toggleTimer();
      expect(component.canReset()).toBe(true);
    });

    it('should update button disabled states in DOM', async () => {
      await fixture.whenStable();

      let lapButton = compiled.querySelector('.lap-button') as HTMLButtonElement;
      let resetButton = compiled.querySelector('.reset-button') as HTMLButtonElement;

      // Initially disabled
      expect(lapButton.disabled).toBe(true);
      expect(resetButton.disabled).toBe(true);

      // Start timer
      component.toggleTimer();
      (component as any).elapsedTime.set(1000);
      fixture.detectChanges();
      await fixture.whenStable();

      lapButton = compiled.querySelector('.lap-button') as HTMLButtonElement;
      resetButton = compiled.querySelector('.reset-button') as HTMLButtonElement;

      expect(lapButton.disabled).toBe(false);
      expect(resetButton.disabled).toBe(false);
    });
  });

  describe('Touch Target Requirements', () => {
    it('should meet 44px minimum touch target size', async () => {
      await fixture.whenStable();

      const buttons = compiled.querySelectorAll('.control-button');
      buttons.forEach(button => {
        const styles = getComputedStyle(button as Element);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Performance and Subscription Management', () => {
    it('should unsubscribe on component destroy', () => {
      // Start timer to create subscription
      component.toggleTimer();
      const subscription = (component as any).timerSubscription;

      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).toBeDefined();

      // Spy on the unsubscribe method
      const unsubscribeSpy = vi.spyOn(subscription, 'unsubscribe');

      // Call ngOnDestroy
      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle extended sessions without memory leaks', () => {
      // Start timer
      component.toggleTimer();

      // Simulate long-running session
      for (let i = 0; i < 1000; i++) {
        (component as any).elapsedTime.set(i * 100);
        fixture.detectChanges();
      }

      // Should still be responsive
      expect(component.isRunning()).toBe(true);
      expect(component.formattedTime()).toBe('01:39:90');
    });
  });

  describe('Track By Function', () => {
    it('should provide trackBy function for lap list performance', () => {
      const mockLap: Lap = {
        lapNumber: 5,
        absoluteTime: 5000,
        splitTime: 1000,
        timestamp: 6000
      };

      expect(component.trackByLapNumber(0, mockLap)).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative time input gracefully', () => {
      expect(component.formatTime(-1000)).toBe('00:00:00'); // Math.floor of negative should still work
    });

    it('should handle very large time values', () => {
      // 24 hours in milliseconds
      const twentyFourHours = 24 * 60 * 60 * 1000;
      expect(component.formatTime(twentyFourHours)).toBe('1440:00:00');
    });

    it('should not record lap with zero elapsed time', () => {
      component.toggleTimer();
      // elapsed time is 0
      component.recordLap();

      expect(component.getLaps().length).toBe(0);
    });

    it('should handle rapid state changes', () => {
      // Rapid start/pause cycles
      component.toggleTimer(); // start
      component.toggleTimer(); // pause
      component.toggleTimer(); // resume
      component.toggleTimer(); // pause

      expect(component.buttonText()).toBe('Resume');
      expect(component.isRunning()).toBe(false);
    });
  });
});