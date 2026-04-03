import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StopwatchComponent } from './stopwatch.component';
import { formatTime, isOverflow, getMaxDuration } from './stopwatch.utils';

describe('StopwatchComponent', () => {
  let component: StopwatchComponent;
  let fixture: ComponentFixture<StopwatchComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopwatchComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StopwatchComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      fixture.detectChanges();
      const state = component.state();
      expect(state.elapsedMs).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.laps).toEqual([]);
    });

    it('should display initial timer as 00:00.00', () => {
      fixture.detectChanges();
      const timerDisplay = compiled.querySelector('.timer-display');
      expect(timerDisplay?.textContent?.trim()).toBe('00:00.00');
    });

    it('should show Start button initially', () => {
      fixture.detectChanges();
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      expect(startBtn.textContent?.trim()).toBe('Start');
      expect(startBtn.classList.contains('running')).toBe(false);
    });

    it('should have lap button disabled initially', () => {
      fixture.detectChanges();
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;
      expect(lapBtn.disabled).toBe(true);
    });

    it('should not show overflow message initially', () => {
      fixture.detectChanges();
      const overflowMessage = compiled.querySelector('.overflow-message');
      expect(overflowMessage).toBeNull();
    });

    it('should not show laps section initially', () => {
      fixture.detectChanges();
      const lapsSection = compiled.querySelector('.laps-section');
      expect(lapsSection).toBeNull();
    });
  });

  describe('Timer Display Format', () => {
    it('should display mm:ss.ss format correctly for various times', () => {
      fixture.detectChanges();

      // Test different time values
      const testCases = [
        { ms: 0, expected: '00:00.00' },
        { ms: 1000, expected: '00:01.00' },
        { ms: 1500, expected: '00:01.50' },
        { ms: 60000, expected: '01:00.00' },
        { ms: 61500, expected: '01:01.50' },
        { ms: 3600000, expected: '60:00.00' },
        { ms: 5999990, expected: '99:59.99' }
      ];

      testCases.forEach(({ ms, expected }) => {
        component.state.set({
          elapsedMs: ms,
          isRunning: false,
          startTime: null,
          laps: []
        });
        fixture.detectChanges();

        const timerDisplay = compiled.querySelector('.timer-display');
        expect(timerDisplay?.textContent?.trim()).toBe(expected);
      });
    });

    it('should display time with tabular-nums for consistent spacing', () => {
      fixture.detectChanges();
      const timerDisplay = compiled.querySelector('.timer-display') as HTMLElement;
      const computedStyle = getComputedStyle(timerDisplay);
      expect(computedStyle.fontVariantNumeric).toBe('tabular-nums');
    });
  });

  describe('Start/Pause Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should start timer when Start button is clicked', fakeAsync(() => {
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const performanceNowSpy = spyOn(performance, 'now').and.returnValue(1000);

      startBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.isRunning).toBe(true);
      expect(state.startTime).toBe(1000);
      expect(startBtn.textContent?.trim()).toBe('Pause');
      expect(startBtn.classList.contains('running')).toBe(true);
    }));

    it('should enable lap button when timer is running', fakeAsync(() => {
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      fixture.detectChanges();

      expect(lapBtn.disabled).toBe(false);
    }));

    it('should pause timer when Pause button is clicked', fakeAsync(() => {
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;

      // Start timer
      startBtn.click();
      fixture.detectChanges();

      // Pause timer
      startBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.isRunning).toBe(false);
      expect(state.startTime).toBeNull();
      expect(startBtn.textContent?.trim()).toBe('Start');
      expect(startBtn.classList.contains('running')).toBe(false);
    }));

    it('should disable lap button when timer is paused', fakeAsync(() => {
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      // Start and then pause
      startBtn.click();
      fixture.detectChanges();
      startBtn.click();
      fixture.detectChanges();

      expect(lapBtn.disabled).toBe(true);
    }));

    it('should maintain elapsed time when paused and resumed', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 2000, 3000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;

      // Start timer
      startBtn.click();
      tick(100);
      fixture.detectChanges();

      // Pause timer
      startBtn.click();
      fixture.detectChanges();

      const pausedElapsed = component.state().elapsedMs;
      expect(pausedElapsed).toBe(1000); // 2000 - 1000

      // Resume timer
      startBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.isRunning).toBe(true);
      expect(state.startTime).toBe(2000); // 3000 - 1000 (elapsed)
    }));
  });

  describe('Timer Updates and Precision', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update timer every 10ms when running', fakeAsync(() => {
      let performanceTime = 1000;
      spyOn(performance, 'now').and.callFake(() => performanceTime);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();
      fixture.detectChanges();

      // Advance time and check updates
      performanceTime = 1100; // 100ms elapsed
      tick(10);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(100);
      expect(component.displayTime()).toBe('00:00.10');

      performanceTime = 1500; // 500ms elapsed
      tick(10);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(500);
      expect(component.displayTime()).toBe('00:00.50');

      flush();
    }));

    it('should use performance.now() for accurate timestamps', fakeAsync(() => {
      const performanceNowSpy = spyOn(performance, 'now').and.returnValue(12345.67);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();

      expect(performanceNowSpy).toHaveBeenCalled();
      expect(component.state().startTime).toBe(12345.67);
    }));

    it('should not update when timer is paused', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 2000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;

      // Start and immediately pause
      startBtn.click();
      startBtn.click();
      fixture.detectChanges();

      const initialElapsed = component.state().elapsedMs;

      tick(100);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(initialElapsed);
      flush();
    }));
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reset timer to initial state', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const resetBtn = compiled.querySelector('.reset-btn') as HTMLButtonElement;

      // Start timer and let it run
      startBtn.click();
      tick(100);
      fixture.detectChanges();

      // Reset timer
      resetBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.elapsedMs).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.laps).toEqual([]);

      expect(component.displayTime()).toBe('00:00.00');
      expect(startBtn.textContent?.trim()).toBe('Start');
      expect(startBtn.classList.contains('running')).toBe(false);

      flush();
    }));

    it('should reset lap counter when reset', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1500, 2000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;
      const resetBtn = compiled.querySelector('.reset-btn') as HTMLButtonElement;

      // Start timer and add laps
      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      tick(10);
      fixture.detectChanges();

      expect(component.state().laps.length).toBe(1);
      expect(component.state().laps[0].id).toBe(1);

      // Reset
      resetBtn.click();
      fixture.detectChanges();

      // Start again and add lap
      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      expect(component.state().laps.length).toBe(1);
      expect(component.state().laps[0].id).toBe(1); // Counter should reset

      flush();
    }));

    it('should work when timer is running', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const resetBtn = compiled.querySelector('.reset-btn') as HTMLButtonElement;

      // Start timer
      startBtn.click();
      fixture.detectChanges();

      expect(component.state().isRunning).toBe(true);

      // Reset while running
      resetBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.elapsedMs).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.startTime).toBeNull();
    }));

    it('should work when timer is paused', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 2000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const resetBtn = compiled.querySelector('.reset-btn') as HTMLButtonElement;

      // Start, pause, then reset
      startBtn.click();
      tick(10);
      startBtn.click();
      fixture.detectChanges();

      expect(component.state().isRunning).toBe(false);
      expect(component.state().elapsedMs).toBeGreaterThan(0);

      resetBtn.click();
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(0);
      flush();
    }));
  });

  describe('Lap Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add lap when timer is running', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1500);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      const state = component.state();
      expect(state.laps.length).toBe(1);
      expect(state.laps[0].id).toBe(1);
      expect(state.laps[0].timeMs).toBe(500);
      expect(state.laps[0].displayTime).toBe('00:00.50');

      flush();
    }));

    it('should not add lap when timer is stopped', () => {
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      lapBtn.click();
      fixture.detectChanges();

      expect(component.state().laps.length).toBe(0);
    });

    it('should display laps in reverse chronological order (newest first)', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1500, 2000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      tick(10);
      fixture.detectChanges();

      // Add first lap at 500ms
      lapBtn.click();
      tick(10);
      fixture.detectChanges();

      // Add second lap at 1000ms
      lapBtn.click();
      fixture.detectChanges();

      const laps = component.state().laps;
      expect(laps.length).toBe(2);
      expect(laps[0].id).toBe(2); // Newest first
      expect(laps[1].id).toBe(1);
      expect(laps[0].timeMs).toBeGreaterThan(laps[1].timeMs);

      flush();
    }));

    it('should show laps section when laps exist', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1500);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      const lapsSection = compiled.querySelector('.laps-section');
      expect(lapsSection).toBeTruthy();

      const lapItems = compiled.querySelectorAll('.lap-item');
      expect(lapItems.length).toBe(1);

      flush();
    }));

    it('should limit laps to 100 to prevent excessive DOM growth', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      fixture.detectChanges();

      // Add 105 laps
      for (let i = 0; i < 105; i++) {
        lapBtn.click();
        tick(1);
        fixture.detectChanges();
      }

      expect(component.state().laps.length).toBe(100);

      flush();
    }));

    it('should display lap numbers and times correctly', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1750);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      const lapNumber = compiled.querySelector('.lap-number');
      const lapTime = compiled.querySelector('.lap-time');

      expect(lapNumber?.textContent?.trim()).toBe('1');
      expect(lapTime?.textContent?.trim()).toBe('00:00.75');

      flush();
    }));
  });

  describe('Overflow Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should stop timer at maximum duration (99:59.99)', fakeAsync(() => {
      const maxDuration = getMaxDuration(); // 5999990ms
      spyOn(performance, 'now').and.returnValues(1000, 1000 + maxDuration + 100);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();

      // Trigger timer update that exceeds max duration
      tick(10);
      fixture.detectChanges();

      const state = component.state();
      expect(state.isRunning).toBe(false);
      expect(state.elapsedMs).toBe(maxDuration);
      expect(state.startTime).toBeNull();
      expect(component.displayTime()).toBe('99:59.99');

      flush();
    }));

    it('should display overflow message when maximum duration reached', fakeAsync(() => {
      const maxDuration = getMaxDuration();
      spyOn(performance, 'now').and.returnValues(1000, 1000 + maxDuration + 100);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();

      tick(10);
      fixture.detectChanges();

      const overflowMessage = compiled.querySelector('.overflow-message');
      expect(overflowMessage).toBeTruthy();
      expect(overflowMessage?.textContent?.trim()).toBe('Maximum time reached (99:59.99). Timer stopped.');

      flush();
    }));

    it('should allow reset after overflow', fakeAsync(() => {
      const maxDuration = getMaxDuration();
      spyOn(performance, 'now').and.returnValues(1000, 1000 + maxDuration + 100);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const resetBtn = compiled.querySelector('.reset-btn') as HTMLButtonElement;

      // Trigger overflow
      startBtn.click();
      tick(10);
      fixture.detectChanges();

      expect(component.state().isRunning).toBe(false);
      expect(component.overflowDetected()).toBe(true);

      // Reset should work
      resetBtn.click();
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(0);
      expect(component.overflowDetected()).toBe(false);
      expect(compiled.querySelector('.overflow-message')).toBeNull();

      flush();
    }));

    it('should handle overflow during tab visibility change', fakeAsync(() => {
      const maxDuration = getMaxDuration();
      spyOn(performance, 'now').and.returnValues(1000, 1000 + maxDuration + 100);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();
      fixture.detectChanges();

      // Simulate tab becoming visible with overflow time
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      fixture.detectChanges();

      const state = component.state();
      expect(state.isRunning).toBe(false);
      expect(state.elapsedMs).toBe(maxDuration);
      expect(component.overflowDetected()).toBe(true);

      flush();
    }));
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA labels on timer display', () => {
      const timerDisplay = compiled.querySelector('.timer-display');
      expect(timerDisplay?.getAttribute('aria-live')).toBe('polite');
      expect(timerDisplay?.getAttribute('aria-label')).toContain('Timer display: 00:00.00');
    });

    it('should have proper ARIA labels on control buttons', () => {
      const startBtn = compiled.querySelector('.start-pause-btn');
      const lapBtn = compiled.querySelector('.lap-btn');
      const resetBtn = compiled.querySelector('.reset-btn');

      expect(startBtn?.getAttribute('aria-label')).toBe('Start timer');
      expect(lapBtn?.getAttribute('aria-label')).toBe('Record lap time');
      expect(resetBtn?.getAttribute('aria-label')).toBe('Reset timer and clear laps');
    });

    it('should update start/pause button aria-label when state changes', fakeAsync(() => {
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;

      expect(startBtn.getAttribute('aria-label')).toBe('Start timer');

      startBtn.click();
      fixture.detectChanges();

      expect(startBtn.getAttribute('aria-label')).toBe('Pause timer');

      startBtn.click();
      fixture.detectChanges();

      expect(startBtn.getAttribute('aria-label')).toBe('Start timer');
    }));

    it('should have role attributes for screen readers', fakeAsync () => {
      spyOn(performance, 'now').and.returnValues(1000, 1500);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      const controls = compiled.querySelector('.controls');
      expect(controls?.getAttribute('role')).toBe('group');
      expect(controls?.getAttribute('aria-label')).toBe('Stopwatch controls');

      // Add lap to show laps section
      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      const lapsList = compiled.querySelector('.laps-list');
      expect(lapsList?.getAttribute('role')).toBe('log');
      expect(lapsList?.getAttribute('aria-label')).toBe('Lap times list');

      flush();
    }));

    it('should have proper aria-labels on lap items', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 1750);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      tick(10);
      fixture.detectChanges();

      lapBtn.click();
      fixture.detectChanges();

      const lapItem = compiled.querySelector('.lap-item');
      expect(lapItem?.getAttribute('aria-label')).toBe('Lap 1: 00:00.75');

      flush();
    }));

    it('should show overflow message with role="alert"', fakeAsync(() => {
      const maxDuration = getMaxDuration();
      spyOn(performance, 'now').and.returnValues(1000, 1000 + maxDuration + 100);

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();

      tick(10);
      fixture.detectChanges();

      const overflowMessage = compiled.querySelector('.overflow-message');
      expect(overflowMessage?.getAttribute('role')).toBe('alert');

      flush();
    }));
  });

  describe('Memory Management and Cleanup', () => {
    it('should unsubscribe from intervals on destroy', () => {
      const destroySpy = spyOn((component as any).destroy$, 'next');
      const completeSpy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should remove visibility change event listener on destroy', () => {
      const removeEventListenerSpy = spyOn(document, 'removeEventListener');

      component.ngOnDestroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        jasmine.any(Function)
      );
    });

    it('should add visibility change event listener on init', () => {
      const addEventListenerSpy = spyOn(document, 'addEventListener');

      component.ngOnInit();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        jasmine.any(Function)
      );
    });
  });

  describe('Tab Visibility Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should recalculate elapsed time when tab becomes visible', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 3000); // 2 seconds elapsed
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();
      fixture.detectChanges();

      // Simulate tab becoming visible after some time
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(2000);

      flush();
    }));

    it('should not recalculate when timer is not running', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      const initialElapsed = component.state().elapsedMs;

      // Simulate tab becoming visible when timer is stopped
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(initialElapsed);
    }));

    it('should not recalculate when tab is not visible', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValues(1000, 3000);
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      startBtn.click();
      fixture.detectChanges();

      const initialElapsed = component.state().elapsedMs;

      // Simulate visibility change when tab is hidden
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      fixture.detectChanges();

      expect(component.state().elapsedMs).toBe(initialElapsed);
    }));
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle negative time values gracefully', () => {
      component.state.set({
        elapsedMs: -1000,
        isRunning: false,
        startTime: null,
        laps: []
      });
      fixture.detectChanges();

      expect(component.displayTime()).toBe('00:00.00');
    });

    it('should handle very large time values', () => {
      component.state.set({
        elapsedMs: 999999999,
        isRunning: false,
        startTime: null,
        laps: []
      });
      fixture.detectChanges();

      expect(component.displayTime()).toBe('99:59.99');
    });

    it('should handle rapid start/stop clicks without errors', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        startBtn.click();
        tick(1);
        fixture.detectChanges();
      }

      // Should not throw errors and state should be consistent
      expect(component.state().isRunning).toBe(false); // Should be false after even number of clicks

      flush();
    }));

    it('should handle rapid lap clicks without errors', fakeAsync(() => {
      spyOn(performance, 'now').and.returnValue(1000);
      const startBtn = compiled.querySelector('.start-pause-btn') as HTMLButtonElement;
      const lapBtn = compiled.querySelector('.lap-btn') as HTMLButtonElement;

      startBtn.click();
      fixture.detectChanges();

      // Rapid lap clicks
      for (let i = 0; i < 20; i++) {
        lapBtn.click();
        tick(1);
        fixture.detectChanges();
      }

      expect(component.state().laps.length).toBe(20);
      expect(component.state().laps[0].id).toBe(20); // Newest first

      flush();
    }));
  });
});